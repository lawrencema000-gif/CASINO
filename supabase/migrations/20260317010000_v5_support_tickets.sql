-- ============================================
-- FORTUNA CASINO Migration V5: Support Tickets
-- Date: 2026-03-17
-- ============================================

BEGIN;

-- ============================================
-- 1. SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id),

  category TEXT NOT NULL CHECK (category IN (
    'account', 'payment', 'missing_credits', 'game_issue',
    'bug_report', 'abuse_report', 'self_exclusion',
    'refund_request', 'ban_appeal', 'other'
  )),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_user', 'escalated', 'resolved', 'closed')),

  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,

  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access support_tickets"
  ON public.support_tickets FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);

-- ============================================
-- 2. TICKET MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  is_internal BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages on their own tickets (except internal notes)
CREATE POLICY "Users can view own ticket messages"
  ON public.ticket_messages FOR SELECT
  USING (
    NOT is_internal
    AND EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add messages to own tickets"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT is_internal
    AND EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access ticket_messages"
  ON public.ticket_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON public.ticket_messages(created_at);

-- ============================================
-- 3. TICKET NUMBER SEQUENCE
-- ============================================
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('support_ticket_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. SLA DEADLINE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := public.generate_ticket_number();
  NEW.sla_deadline := CASE NEW.priority
    WHEN 'urgent' THEN now() + INTERVAL '1 hour'
    WHEN 'high' THEN now() + INTERVAL '4 hours'
    WHEN 'medium' THEN now() + INTERVAL '12 hours'
    WHEN 'low' THEN now() + INTERVAL '24 hours'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_sla_trigger ON public.support_tickets;
CREATE TRIGGER set_ticket_sla_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla();

COMMIT;
