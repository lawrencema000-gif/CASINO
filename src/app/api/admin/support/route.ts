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

// GET — admin ticket queue
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireStaffRole(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'open'
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
    const offset = Number(url.searchParams.get('offset')) || 0

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        id, ticket_number, user_id, assigned_to,
        category, priority, status, subject,
        created_at, updated_at, sla_deadline, sla_breached,
        first_response_at
      `, { count: 'exact' })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get SLA stats
    const { count: breachedCount } = await supabaseAdmin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('sla_breached', true)
      .in('status', ['open', 'in_progress', 'escalated'])

    return NextResponse.json({
      tickets: data || [],
      total: count || 0,
      has_more: (offset + limit) < (count || 0),
      sla_breached_count: breachedCount || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — admin actions on tickets
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireStaffRole(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { ticketId, action, message, priority } = body

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId required' }, { status: 400 })
    }

    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status, first_response_at')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    switch (action) {
      case 'reply': {
        if (!message || message.trim().length < 1) {
          return NextResponse.json({ error: 'Message required' }, { status: 400 })
        }

        // Add staff reply
        await supabaseAdmin
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            message: message.trim(),
            is_internal: false,
          })

        // Update ticket
        const updates: Record<string, unknown> = {
          status: 'waiting_user',
          updated_at: new Date().toISOString(),
        }
        if (!ticket.first_response_at) {
          updates.first_response_at = new Date().toISOString()
        }

        await supabaseAdmin
          .from('support_tickets')
          .update(updates)
          .eq('id', ticketId)

        return NextResponse.json({ success: true, action: 'replied' })
      }

      case 'internal_note': {
        if (!message || message.trim().length < 1) {
          return NextResponse.json({ error: 'Note required' }, { status: 400 })
        }

        await supabaseAdmin
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            message: message.trim(),
            is_internal: true,
          })

        return NextResponse.json({ success: true, action: 'note_added' })
      }

      case 'assign': {
        await supabaseAdmin
          .from('support_tickets')
          .update({ assigned_to: user.id, status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', ticketId)

        return NextResponse.json({ success: true, action: 'assigned' })
      }

      case 'escalate': {
        await supabaseAdmin
          .from('support_tickets')
          .update({ status: 'escalated', priority: 'urgent', updated_at: new Date().toISOString() })
          .eq('id', ticketId)

        return NextResponse.json({ success: true, action: 'escalated' })
      }

      case 'resolve': {
        await supabaseAdmin
          .from('support_tickets')
          .update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', ticketId)

        if (message) {
          await supabaseAdmin
            .from('ticket_messages')
            .insert({
              ticket_id: ticketId,
              sender_id: user.id,
              message: message.trim(),
              is_internal: false,
            })
        }

        return NextResponse.json({ success: true, action: 'resolved' })
      }

      case 'close': {
        await supabaseAdmin
          .from('support_tickets')
          .update({ status: 'closed', updated_at: new Date().toISOString() })
          .eq('id', ticketId)

        return NextResponse.json({ success: true, action: 'closed' })
      }

      case 'set_priority': {
        if (!priority || !['low', 'medium', 'high', 'urgent'].includes(priority)) {
          return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
        }
        await supabaseAdmin
          .from('support_tickets')
          .update({ priority, updated_at: new Date().toISOString() })
          .eq('id', ticketId)

        return NextResponse.json({ success: true, action: 'priority_updated' })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
