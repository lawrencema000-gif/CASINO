import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — get ticket details + messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch ticket (user can only see own tickets)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Fetch messages (excluding internal notes for regular users)
    const { data: messages } = await supabaseAdmin
      .from('ticket_messages')
      .select('id, sender_id, message, is_internal, created_at')
      .eq('ticket_id', ticketId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })

    return NextResponse.json({ ticket, messages: messages || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — add a message to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify user owns this ticket
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (['resolved', 'closed'].includes(ticket.status)) {
      return NextResponse.json({ error: 'Cannot reply to a closed ticket' }, { status: 400 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string' || message.trim().length < 1 || message.trim().length > 5000) {
      return NextResponse.json({ error: 'Message must be 1-5000 characters' }, { status: 400 })
    }

    // Insert message
    const { data: msg, error: msgError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message: message.trim(),
        is_internal: false,
      })
      .select('id, message, created_at')
      .single()

    if (msgError) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update ticket status back to open if it was waiting on user
    if (ticket.status === 'waiting_user') {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', ticketId)
    } else {
      await supabaseAdmin
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId)
    }

    return NextResponse.json({ success: true, message: msg })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
