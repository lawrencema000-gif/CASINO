import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function requireStaffRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['support', 'admin', 'super_admin'].includes(profile.role)) return null
  return user
}

// GET — fraud flags queue
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireStaffRole(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'pending'
    const severity = url.searchParams.get('severity')
    const flagType = url.searchParams.get('flag_type')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
    const offset = Number(url.searchParams.get('offset')) || 0

    let query = supabaseAdmin
      .from('fraud_flags')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (flagType) {
      query = query.eq('flag_type', flagType)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get summary counts
    const [
      { count: pendingCount },
      { count: criticalCount },
      { count: investigatingCount },
    ] = await Promise.all([
      supabaseAdmin
        .from('fraud_flags')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseAdmin
        .from('fraud_flags')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .in('status', ['pending', 'investigating']),
      supabaseAdmin
        .from('fraud_flags')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'investigating'),
    ])

    // Get multi-account device view data
    const { data: multiAccountDevices } = await supabaseAdmin
      .from('multi_account_devices')
      .select('*')
      .order('account_count', { ascending: false })
      .limit(10)

    return NextResponse.json({
      flags: data || [],
      total: count || 0,
      has_more: (offset + limit) < (count || 0),
      stats: {
        pending: pendingCount || 0,
        critical: criticalCount || 0,
        investigating: investigatingCount || 0,
      },
      multi_account_devices: multiAccountDevices || [],
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — review/action on fraud flags
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireStaffRole(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { flagId, action, notes } = body

    if (!flagId) {
      return NextResponse.json({ error: 'flagId required' }, { status: 400 })
    }

    const { data: flag } = await supabaseAdmin
      .from('fraud_flags')
      .select('id, user_id, status, severity')
      .eq('id', flagId)
      .single()

    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
    }

    switch (action) {
      case 'investigate': {
        await supabaseAdmin
          .from('fraud_flags')
          .update({ status: 'investigating', reviewed_by: user.id, review_notes: notes || null })
          .eq('id', flagId)

        return NextResponse.json({ success: true, action: 'investigating' })
      }

      case 'confirm': {
        await supabaseAdmin
          .from('fraud_flags')
          .update({
            status: 'confirmed',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_notes: notes || null,
          })
          .eq('id', flagId)

        // Suspend the user if severity is high/critical
        if (['high', 'critical'].includes(flag.severity)) {
          await supabaseAdmin
            .from('profiles')
            .update({ status: 'suspended' })
            .eq('id', flag.user_id)
        }

        return NextResponse.json({ success: true, action: 'confirmed' })
      }

      case 'false_positive': {
        await supabaseAdmin
          .from('fraud_flags')
          .update({
            status: 'false_positive',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_notes: notes || null,
          })
          .eq('id', flagId)

        // Reset risk score for false positive
        await supabaseAdmin
          .from('profiles')
          .update({
            risk_score: 0,
            risk_level: 'normal',
          })
          .eq('id', flag.user_id)

        return NextResponse.json({ success: true, action: 'false_positive' })
      }

      case 'resolve': {
        await supabaseAdmin
          .from('fraud_flags')
          .update({
            status: 'resolved',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_notes: notes || null,
          })
          .eq('id', flagId)

        return NextResponse.json({ success: true, action: 'resolved' })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
