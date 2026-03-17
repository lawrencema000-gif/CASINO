import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Vercel Cron — runs every 15 minutes to flag SLA-breached support tickets
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()

    // Find tickets past SLA deadline that aren't already marked breached
    const { data: breached, error } = await supabaseAdmin
      .from('support_tickets')
      .select('id, ticket_number, priority, status, sla_deadline')
      .lt('sla_deadline', now)
      .eq('sla_breached', false)
      .in('status', ['open', 'in_progress', 'waiting_user', 'escalated'])

    if (error) {
      console.error('SLA check error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (breached && breached.length > 0) {
      // Mark as breached
      const ids = breached.map(t => t.id)
      await supabaseAdmin
        .from('support_tickets')
        .update({ sla_breached: true })
        .in('id', ids)

      // Auto-escalate non-escalated breached tickets
      const toEscalate = breached.filter(t => t.status !== 'escalated').map(t => t.id)
      if (toEscalate.length > 0) {
        await supabaseAdmin
          .from('support_tickets')
          .update({ status: 'escalated', priority: 'urgent', updated_at: now })
          .in('id', toEscalate)
      }

      console.warn(`SLA BREACH: ${breached.length} tickets breached SLA`, breached.map(t => t.ticket_number))
    }

    return NextResponse.json({
      status: 'ok',
      breached_count: breached?.length || 0,
      checked_at: now,
    })
  } catch (err) {
    console.error('SLA check error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
