-- ═══════════════════════════════════════════════════════════════
-- Fadaa Sales System — Database Migration 001
-- Run this in Supabase SQL Editor (or via supabase db push)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension (already on by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. SALES USERS ──────────────────────────────────────────────
-- Separate from Supabase auth — managed by NextAuth credentials
CREATE TABLE IF NOT EXISTS sales_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ─── 2. LEADS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_leads (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_rep    ON sales_leads(assigned_rep_id);
CREATE INDEX idx_leads_stage  ON sales_leads(pipeline_stage);
CREATE INDEX idx_leads_source ON sales_leads(lead_source);

-- ─── 3. MEETINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_meetings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX idx_meetings_lead ON sales_meetings(lead_id);
CREATE INDEX idx_meetings_rep  ON sales_meetings(rep_id);

-- ─── 4. LEAD QUALIFICATIONS (BANT) ───────────────────────────────
CREATE TABLE IF NOT EXISTS sales_qualifications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id               UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  qualified_by          UUID NOT NULL REFERENCES sales_users(id),
  need_score            SMALLINT CHECK (need_score BETWEEN 1 AND 5),
  budget_confirmed      BOOLEAN DEFAULT false,
  decision_maker        BOOLEAN DEFAULT false,
  timeline              TEXT,
  service_fit_score     SMALLINT CHECK (service_fit_score BETWEEN 1 AND 5),
  qualification_notes   TEXT,
  qualified_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id)  -- one qualification record per lead
);

-- ─── 5. DOCUMENTS (Quotations & Contracts) ───────────────────────
CREATE TABLE IF NOT EXISTS sales_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX idx_documents_lead ON sales_documents(lead_id);

-- ─── 6. ACTIVITY LOG ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX idx_activities_lead    ON sales_activities(lead_id);
CREATE INDEX idx_activities_user    ON sales_activities(user_id);
CREATE INDEX idx_activities_created ON sales_activities(created_at DESC);

-- ─── 7. CSV IMPORTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_csv_imports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON sales_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON sales_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON sales_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── AUTO-ACTIVITY ON STAGE CHANGE ───────────────────────────────
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO sales_activities (lead_id, user_id, action_type, description, metadata)
    VALUES (
      NEW.id,
      NEW.assigned_rep_id,
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

-- ─── SAMPLE DATA — insert 1 manager user (password: admin123) ────
-- bcrypt hash of "admin123" with rounds=10
-- Run: node -e "const b=require('bcryptjs'); console.log(b.hashSync('admin123',10))"
-- Replace the hash below with the output
INSERT INTO sales_users (username, email, name, role, password_hash)
VALUES (
  'manager',
  'manager@company.com',
  'Sales Manager',
  'manager',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHi' -- password: secret
)
ON CONFLICT (username) DO NOTHING;

-- ─── STORAGE BUCKET (run separately or in Supabase dashboard) ────
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('sales-documents', 'sales-documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- ─── 8. USER PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_user_profiles (
  user_id       UUID PRIMARY KEY REFERENCES sales_users(id) ON DELETE CASCADE,
  job_title     TEXT,
  phone         TEXT,
  department    TEXT,
  avatar_url    TEXT,
  manager_id    UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  join_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  bio           TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON sales_user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 9. PERMISSIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,
  can_view   BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module)
);

CREATE TRIGGER trg_permissions_updated_at
  BEFORE UPDATE ON sales_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 10. PASSWORD RESET TOKENS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_password_resets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
