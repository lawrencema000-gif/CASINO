import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const VALID_CATEGORIES = [
  'account', 'payment', 'missing_credits', 'game_issue',
  'bug_report', 'abuse_report', 'self_exclusion',
  'refund_request', 'ban_appeal', 'other',
] as const

// GET — list user's tickets
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
    const offset = Number(url.searchParams.get('offset')) || 0

    let query = supabaseAdmin
      .from('support_tickets')
      .select('id, ticket_number, category, priority, status, subject, created_at, updated_at, resolved_at, first_response_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      tickets: data || [],
      total: count || 0,
      has_more: (offset + limit) < (count || 0),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a new ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const limit = checkRateLimit(`support:${user.id}`, RATE_LIMITS.api)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { category, subject, message } = body

    // Validation
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 200) {
      return NextResponse.json({ error: 'Subject must be 3-200 characters' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000) {
      return NextResponse.json({ error: 'Message must be 10-5000 characters' }, { status: 400 })
    }

    // Check open ticket limit (max 5 open tickets per user)
    const { count: openCount } = await supabaseAdmin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['open', 'in_progress', 'waiting_user', 'escalated'])

    if ((openCount || 0) >= 5) {
      return NextResponse.json({ error: 'Maximum 5 open tickets allowed. Please wait for existing tickets to be resolved.' }, { status: 400 })
    }

    // Auto-set priority based on category
    const priorityMap: Record<string, string> = {
      missing_credits: 'high',
      payment: 'high',
      ban_appeal: 'high',
      self_exclusion: 'urgent',
      account: 'medium',
      game_issue: 'medium',
      refund_request: 'medium',
      bug_report: 'low',
      abuse_report: 'medium',
      other: 'low',
    }

    // Create ticket (ticket_number and sla_deadline set by DB trigger)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: user.id,
        category,
        priority: priorityMap[category] || 'medium',
        subject: subject.trim(),
      })
      .select('id, ticket_number, status, priority, sla_deadline')
      .single()

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    // Create initial message
    const { error: msgError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: message.trim(),
        is_internal: false,
      })

    if (msgError) {
      console.error('Message creation error:', msgError)
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        priority: ticket.priority,
      },
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
