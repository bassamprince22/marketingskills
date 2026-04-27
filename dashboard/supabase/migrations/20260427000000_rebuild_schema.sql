-- ═══════════════════════════════════════════════════════════════
-- Consolidated Schema Rebuild — All tables from scratch
-- Applies all 11 previous migrations in correct dependency order
-- ═══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────
-- 1. ORGANIZATIONS (must come first — other tables reference it)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orgs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               TEXT NOT NULL,
  slug               TEXT UNIQUE NOT NULL,
  plan               TEXT NOT NULL DEFAULT 'trial'
                       CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  trial_ends_at      TIMESTAMPTZ,
  seats_limit        INT NOT NULL DEFAULT 5,
  ai_calls_used      INT NOT NULL DEFAULT 0,
  ai_calls_limit     INT NOT NULL DEFAULT 100,
  logo_url           TEXT,
  brand_color        TEXT DEFAULT '#7C3AED',
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'suspended', 'cancelled')),
  stripe_customer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY,
  org_id             UUID REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  plan               TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_end TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 3. ORG ONBOARDING
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_onboarding (
  org_id              UUID PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  survey_completed    BOOLEAN NOT NULL DEFAULT false,
  agency_type         TEXT,
  team_size           TEXT,
  primary_goal        TEXT,
  current_tool        TEXT,
  hear_about          TEXT,
  brand_set           BOOLEAN NOT NULL DEFAULT false,
  template_created    BOOLEAN NOT NULL DEFAULT false,
  first_lead          BOOLEAN NOT NULL DEFAULT false,
  team_invited        BOOLEAN NOT NULL DEFAULT false,
  meta_connected      BOOLEAN NOT NULL DEFAULT false,
  welcome_shown       BOOLEAN NOT NULL DEFAULT false,
  checklist_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 4. SALES USERS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' REFERENCES orgs(id),
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('manager', 'rep', 'admin')),
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_users_org_id ON sales_users(org_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. SALES USER PROFILES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_user_profiles (
  user_id    UUID PRIMARY KEY REFERENCES sales_users(id) ON DELETE CASCADE,
  org_id     UUID REFERENCES orgs(id),
  job_title  TEXT,
  phone      TEXT,
  department TEXT,
  avatar_url TEXT,
  manager_id UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  join_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 6. SALES PERMISSIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
  org_id     UUID REFERENCES orgs(id),
  module     TEXT NOT NULL,
  can_view   BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module)
);

-- ─────────────────────────────────────────────────────────────────
-- 7. SALES ROLE PERMISSIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_role_permissions (
  role       TEXT NOT NULL,
  module     TEXT NOT NULL,
  org_id     UUID REFERENCES orgs(id),
  can_view   BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_manage BOOLEAN NOT NULL DEFAULT false
);

-- ─────────────────────────────────────────────────────────────────
-- 8. SALES PASSWORD RESETS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_password_resets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
  org_id     UUID REFERENCES orgs(id),
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 9. SALES INVITES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('manager', 'rep', 'admin')),
  invited_by  UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token   ON sales_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_pending ON sales_invites(accepted_at, revoked_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ─────────────────────────────────────────────────────────────────
-- 10. SALES SERVICES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  commission_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_enabled     BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 11. SALES LEADS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_leads (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' REFERENCES orgs(id),
  company_name         TEXT NOT NULL,
  contact_person       TEXT NOT NULL,
  phone                TEXT,
  email                TEXT,
  service_type         TEXT NOT NULL DEFAULT 'marketing'
                         CHECK (service_type IN ('marketing', 'software', 'both')),
  lead_source          TEXT NOT NULL DEFAULT 'other'
                         CHECK (lead_source IN ('meta', 'referral', 'website', 'outbound', 'other')),
  budget_range         TEXT,
  pipeline_stage       TEXT NOT NULL DEFAULT 'new_lead'
                         CHECK (pipeline_stage IN (
                           'new_lead','contacted','discovery',
                           'meeting_scheduled','meeting_completed',
                           'qualified','proposal_sent','negotiation',
                           'contract_sent','won','lost'
                         )),
  assigned_rep_id      UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  notes                TEXT,
  next_follow_up_date  DATE,
  deal_type            TEXT DEFAULT 'one_time'
                         CHECK (deal_type IN ('retainer', 'one_time')),
  estimated_value      NUMERIC(12,2),
  priority             TEXT NOT NULL DEFAULT 'medium'
                         CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  expected_close_date  DATE,
  marketing_package    TEXT,
  software_scope_notes TEXT,
  is_qualified         BOOLEAN NOT NULL DEFAULT false,
  lost_reason          TEXT,
  service_id           UUID REFERENCES sales_services(id),
  -- Meta integration fields
  meta_lead_id         TEXT,
  meta_page_id         TEXT,
  meta_form_id         TEXT,
  meta_raw_payload     JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_rep           ON sales_leads(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage         ON sales_leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_source        ON sales_leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_sales_leads_org_id  ON sales_leads(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_meta_lead_id_unique ON sales_leads(meta_lead_id)
  WHERE meta_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_meta_page_id  ON sales_leads(meta_page_id)
  WHERE meta_page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_meta_form_id  ON sales_leads(meta_form_id)
  WHERE meta_form_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 12. SALES MEETINGS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_meetings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' REFERENCES orgs(id),
  lead_id          UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  rep_id           UUID NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
  meeting_date     TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  meeting_type     TEXT NOT NULL DEFAULT 'discovery'
                     CHECK (meeting_type IN ('discovery','demo','proposal','negotiation','other')),
  notes            TEXT,
  outcome          TEXT,
  next_action      TEXT,
  next_action_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_lead        ON sales_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_rep         ON sales_meetings(rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_org_id ON sales_meetings(org_id);

-- ─────────────────────────────────────────────────────────────────
-- 13. SALES QUALIFICATIONS (BANT)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_qualifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' REFERENCES orgs(id),
  lead_id             UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  qualified_by        UUID NOT NULL REFERENCES sales_users(id),
  need_score          SMALLINT CHECK (need_score BETWEEN 1 AND 5),
  budget_confirmed    BOOLEAN DEFAULT false,
  decision_maker      BOOLEAN DEFAULT false,
  timeline            TEXT,
  service_fit_score   SMALLINT CHECK (service_fit_score BETWEEN 1 AND 5),
  qualification_notes TEXT,
  qualified_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id)
);

-- ─────────────────────────────────────────────────────────────────
-- 14. SALES DOCUMENTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' REFERENCES orgs(id),
  lead_id      UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES sales_users(id),
  doc_type     TEXT NOT NULL DEFAULT 'quotation'
                 CHECK (doc_type IN ('quotation', 'contract', 'proposal', 'other')),
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sent', 'signed', 'rejected', 'expired')),
  version      TEXT NOT NULL DEFAULT 'v1',
  file_url     TEXT,
  file_name    TEXT NOT NULL,
  file_size_kb INTEGER,
  notes        TEXT,
  upload_date  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_lead         ON sales_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_documents_org_id ON sales_documents(org_id);

-- ─────────────────────────────────────────────────────────────────
-- 15. SALES ACTIVITIES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' REFERENCES orgs(id),
  lead_id     UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'stage_change','meeting_logged','doc_uploaded',
    'lead_created','lead_assigned','note_added',
    'qualified','meeting_completed'
  )),
  description TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_lead         ON sales_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_user         ON sales_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created      ON sales_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_activities_org_id ON sales_activities(org_id);

-- ─────────────────────────────────────────────────────────────────
-- 16. SALES CSV IMPORTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_csv_imports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID REFERENCES orgs(id),
  imported_by     UUID NOT NULL REFERENCES sales_users(id),
  file_name       TEXT NOT NULL,
  total_rows      INTEGER NOT NULL DEFAULT 0,
  imported_rows   INTEGER NOT NULL DEFAULT 0,
  failed_rows     INTEGER NOT NULL DEFAULT 0,
  assigned_rep_id UUID REFERENCES sales_users(id),
  status          TEXT NOT NULL DEFAULT 'complete'
                    CHECK (status IN ('processing', 'complete', 'failed')),
  errors          JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 17. SALES COMMISSIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  rep_id            UUID NOT NULL REFERENCES sales_users(id),
  service_id        UUID REFERENCES sales_services(id),
  deal_value        DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_pct    DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  approved_by       UUID REFERENCES sales_users(id),
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_rep  ON sales_commissions(rep_id);
CREATE INDEX IF NOT EXISTS idx_commissions_lead ON sales_commissions(lead_id);

-- ─────────────────────────────────────────────────────────────────
-- 18. SALES DAILY REPORTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_daily_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
  org_id              UUID REFERENCES orgs(id),
  report_date         DATE NOT NULL,
  leads_total         INT NOT NULL DEFAULT 0,
  leads_qualified     INT NOT NULL DEFAULT 0,
  leads_waiting       INT NOT NULL DEFAULT 0,
  meetings_done       INT NOT NULL DEFAULT 0,
  proposals_sent      INT NOT NULL DEFAULT 0,
  contracts_generated INT NOT NULL DEFAULT 0,
  won_today           INT NOT NULL DEFAULT 0,
  highlights          TEXT,
  challenges          TEXT,
  next_day_plan       TEXT,
  custom_notes        TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date ON sales_daily_reports(user_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date      ON sales_daily_reports(report_date DESC);

-- ─────────────────────────────────────────────────────────────────
-- 19. SALES CAMPAIGN COSTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_campaign_costs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source     TEXT NOT NULL,
  month      DATE NOT NULL,
  spend      DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes      TEXT,
  created_by UUID REFERENCES sales_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, month)
);

CREATE INDEX IF NOT EXISTS idx_campaign_costs_source_mo ON sales_campaign_costs(source, month DESC);

-- ─────────────────────────────────────────────────────────────────
-- 20. SALES CHALLENGES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_challenges (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT,
  target_amount         DECIMAL(12,2),
  start_date            DATE NOT NULL,
  end_date              DATE,
  is_active             BOOLEAN NOT NULL DEFAULT false,
  transparent           BOOLEAN NOT NULL DEFAULT true,
  top_achievers_visible BOOLEAN NOT NULL DEFAULT true,
  created_by            UUID REFERENCES sales_users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 21. SALES CHALLENGE REWARDS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_challenge_rewards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id       UUID NOT NULL REFERENCES sales_challenges(id) ON DELETE CASCADE,
  rank               INT NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  cash_amount        DECIMAL(12,2),
  badge_emoji        TEXT,
  badge_color        TEXT,
  can_claim_multiple BOOLEAN NOT NULL DEFAULT false,
  max_claims         INT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 22. SALES CHALLENGE CLAIMS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_challenge_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES sales_challenges(id),
  reward_id       UUID NOT NULL REFERENCES sales_challenge_rewards(id),
  rep_id          UUID NOT NULL REFERENCES sales_users(id),
  amount_achieved DECIMAL(12,2),
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_claims_rep ON sales_challenge_claims(rep_id, challenge_id);

-- ─────────────────────────────────────────────────────────────────
-- 23. PROPOSALS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id),
  proposal_number TEXT NOT NULL,
  lead_id         UUID REFERENCES sales_leads(id),
  title           TEXT NOT NULL,
  subtitle        TEXT,
  status          TEXT NOT NULL DEFAULT 'new',
  category        TEXT NOT NULL DEFAULT 'default',
  proposal_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  prepared_by     UUID REFERENCES sales_users(id),
  body_html       TEXT,
  cover_color     TEXT NOT NULL DEFAULT '#7C3AED',
  public_token    TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_template     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_org_id   ON proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id  ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token    ON proposals(public_token);
CREATE INDEX IF NOT EXISTS idx_proposals_status   ON proposals(org_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_template ON proposals(org_id, is_template);

-- ─────────────────────────────────────────────────────────────────
-- 24. PROPOSAL LINE ITEMS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposal_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sort_order  INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  qty         NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT '',
  rate        NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_proposal_line_items_proposal ON proposal_line_items(proposal_id);

-- ─────────────────────────────────────────────────────────────────
-- 25. PROPOSAL ADJUSTMENTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposal_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  adj_type    TEXT NOT NULL DEFAULT 'tax',
  label       TEXT NOT NULL,
  value_type  TEXT NOT NULL DEFAULT 'percent',
  value       NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_proposal_adjustments_proposal ON proposal_adjustments(proposal_id);

-- ─────────────────────────────────────────────────────────────────
-- 26. SUPPORT TICKETS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'howto'
                    CHECK (category IN ('bug', 'feature', 'billing', 'howto', 'other')),
  priority        TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('normal', 'urgent')),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_tickets_org_status_idx ON support_tickets(org_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_created_by_idx ON support_tickets(created_by, updated_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 27. SUPPORT MESSAGES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  org_id       UUID REFERENCES orgs(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  sender_type  TEXT NOT NULL DEFAULT 'customer'
                 CHECK (sender_type IN ('customer', 'support', 'system')),
  sender_name  TEXT NOT NULL,
  sender_email TEXT,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages(ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS support_messages_org_idx    ON support_messages(org_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers to be idempotent
DROP TRIGGER IF EXISTS trg_leads_updated_at        ON sales_leads;
DROP TRIGGER IF EXISTS trg_meetings_updated_at     ON sales_meetings;
DROP TRIGGER IF EXISTS trg_users_updated_at        ON sales_users;
DROP TRIGGER IF EXISTS trg_profiles_updated_at     ON sales_user_profiles;
DROP TRIGGER IF EXISTS trg_permissions_updated_at  ON sales_permissions;
DROP TRIGGER IF EXISTS trg_lead_stage_change       ON sales_leads;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON sales_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON sales_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON sales_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON sales_user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_permissions_updated_at
  BEFORE UPDATE ON sales_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-log stage changes
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO sales_activities (lead_id, user_id, org_id, action_type, description, metadata)
    VALUES (
      NEW.id,
      NEW.assigned_rep_id,
      NEW.org_id,
      'stage_change',
      'Moved from ' || OLD.pipeline_stage || ' to ' || NEW.pipeline_stage,
      jsonb_build_object('from_stage', OLD.pipeline_stage, 'to_stage', NEW.pipeline_stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_stage_change
  AFTER UPDATE ON sales_leads
  FOR EACH ROW EXECUTE FUNCTION log_stage_change();

-- ─────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_tickets'
      AND policyname = 'support_tickets_service_access'
  ) THEN
    CREATE POLICY support_tickets_service_access ON support_tickets
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_messages'
      AND policyname = 'support_messages_service_access'
  ) THEN
    CREATE POLICY support_messages_service_access ON support_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────

-- Fadaa Agency org
INSERT INTO orgs (id, name, slug, plan, seats_limit, ai_calls_limit, status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Fadaa Agency',
  'fadaa',
  'pro',
  50,
  1000,
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  plan           = EXCLUDED.plan,
  seats_limit    = EXCLUDED.seats_limit,
  ai_calls_limit = EXCLUDED.ai_calls_limit,
  status         = EXCLUDED.status;

INSERT INTO org_onboarding (
  org_id, survey_completed, brand_set, template_created,
  first_lead, team_invited, meta_connected, welcome_shown, checklist_dismissed
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  true, true, true, true, true, false, true, true
) ON CONFLICT (org_id) DO UPDATE SET
  survey_completed    = true,
  brand_set           = true,
  template_created    = true,
  first_lead          = true,
  team_invited        = true,
  welcome_shown       = true,
  checklist_dismissed = true;

-- Admin user
-- Username: admin | Email: bassamprince22@gmail.com | Password: Admin@123@Fadaa
INSERT INTO sales_users (username, email, name, role, password_hash, is_active, org_id)
VALUES (
  'admin',
  'bassamprince22@gmail.com',
  'Admin',
  'admin',
  '$2b$10$FXgqy5LNq4WtHtJW8Pgkz.Fy60WUe2804pOtWMWM070NxhiMyg3K.',
  true,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
) ON CONFLICT (username) DO UPDATE SET
  email         = EXCLUDED.email,
  name          = EXCLUDED.name,
  role          = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  is_active     = EXCLUDED.is_active,
  org_id        = EXCLUDED.org_id;

NOTIFY pgrst, 'reload schema';
