import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return null
  return user
}

// GET — list all promo codes
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const active = url.searchParams.get('active')

    let query = supabaseAdmin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (active === 'true') query = query.eq('is_active', true)
    if (active === 'false') query = query.eq('is_active', false)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ promos: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create or update a promo code
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { action } = body

    if (action === 'create') {
      const { code, description, reward_type, reward_value, max_uses, per_user_limit, min_level, min_vip_tier, new_users_only, starts_at, expires_at } = body

      if (!code || !reward_type || !reward_value) {
        return NextResponse.json({ error: 'code, reward_type, and reward_value are required' }, { status: 400 })
      }

      if (!['credits', 'exp', 'multiplier_boost'].includes(reward_type)) {
        return NextResponse.json({ error: 'Invalid reward_type' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin
        .from('promo_codes')
        .insert({
          code: code.trim().toUpperCase(),
          description: description || null,
          reward_type,
          reward_value: Number(reward_value),
          max_uses: max_uses ? Number(max_uses) : null,
          per_user_limit: per_user_limit ? Number(per_user_limit) : 1,
          min_level: min_level ? Number(min_level) : 0,
          min_vip_tier: min_vip_tier || null,
          new_users_only: new_users_only || false,
          starts_at: starts_at || new Date().toISOString(),
          expires_at: expires_at || null,
          created_by: admin.id,
        })
        .select()
        .single()

      if (error) {
        const msg = error.message.includes('duplicate') ? 'Promo code already exists' : error.message
        return NextResponse.json({ error: msg }, { status: 400 })
      }

      return NextResponse.json({ success: true, promo: data })
    }

    if (action === 'toggle') {
      const { promoId, is_active } = body
      if (!promoId) return NextResponse.json({ error: 'promoId required' }, { status: 400 })

      await supabaseAdmin
        .from('promo_codes')
        .update({ is_active: !!is_active })
        .eq('id', promoId)

      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const { promoId } = body
      if (!promoId) return NextResponse.json({ error: 'promoId required' }, { status: 400 })

      await supabaseAdmin
        .from('promo_codes')
        .delete()
        .eq('id', promoId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
