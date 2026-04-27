-- Customer support tickets for SaaS users.
-- Safe to run more than once in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'howto',
  priority    TEXT NOT NULL DEFAULT 'normal',
  status      TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_category_check CHECK (category IN ('bug', 'feature', 'billing', 'howto', 'other')),
  CONSTRAINT support_tickets_priority_check CHECK (priority IN ('normal', 'urgent')),
  CONSTRAINT support_tickets_status_check CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

CREATE TABLE IF NOT EXISTS support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL DEFAULT 'customer',
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_sender_type_check CHECK (sender_type IN ('customer', 'support', 'system'))
);

CREATE INDEX IF NOT EXISTS support_tickets_org_status_idx ON support_tickets(org_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_created_by_idx ON support_tickets(created_by, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages(ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS support_messages_org_idx ON support_messages(org_id, created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- The app uses the Supabase service role for API routes. These permissive
-- policies keep future anon/auth clients from being hard-blocked during rollout.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'support_tickets_service_access'
  ) THEN
    CREATE POLICY support_tickets_service_access ON support_tickets
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_messages'
      AND policyname = 'support_messages_service_access'
  ) THEN
    CREATE POLICY support_messages_service_access ON support_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
