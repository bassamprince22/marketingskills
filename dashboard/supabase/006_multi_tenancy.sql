-- ═══════════════════════════════════════════════════════════════
-- Fadaa Sales System — Migration 006: Multi-Tenancy + SaaS
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. ORGANIZATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orgs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'trial'
                    CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  trial_ends_at   TIMESTAMPTZ,
  seats_limit     INT NOT NULL DEFAULT 5,
  ai_calls_used   INT NOT NULL DEFAULT 0,
  ai_calls_limit  INT NOT NULL DEFAULT 100,
  logo_url        TEXT,
  brand_color     TEXT DEFAULT '#7C3AED',
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'cancelled')),
  stripe_customer_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. SUBSCRIPTIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   TEXT PRIMARY KEY,
  org_id               UUID REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_customer_id   TEXT,
  plan                 TEXT NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_end   TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. ONBOARDING CHECKLIST ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_onboarding (
  org_id               UUID PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  survey_completed     BOOLEAN NOT NULL DEFAULT false,
  agency_type          TEXT,
  team_size            TEXT,
  primary_goal         TEXT,
  current_tool         TEXT,
  hear_about           TEXT,
  brand_set            BOOLEAN NOT NULL DEFAULT false,
  template_created     BOOLEAN NOT NULL DEFAULT false,
  first_lead           BOOLEAN NOT NULL DEFAULT false,
  team_invited         BOOLEAN NOT NULL DEFAULT false,
  meta_connected       BOOLEAN NOT NULL DEFAULT false,
  welcome_shown        BOOLEAN NOT NULL DEFAULT false,
  checklist_dismissed  BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. SEED FADAA AS FIRST ORG ──────────────────────────────────
-- Insert the original Fadaa agency as org id = fixed UUID for backfill
INSERT INTO orgs (id, name, slug, plan, seats_limit, ai_calls_limit, status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Fadaa Agency',
  'fadaa',
  'pro',
  50,
  1000,
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO org_onboarding (
  org_id, survey_completed, brand_set, template_created,
  first_lead, team_invited, meta_connected, welcome_shown, checklist_dismissed
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  true, true, true, true, true, false, true, true
) ON CONFLICT (org_id) DO NOTHING;

-- ─── 5. ADD org_id TO ALL SALES TABLES ───────────────────────────

-- sales_users
ALTER TABLE sales_users
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_users
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

ALTER TABLE sales_users
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

CREATE INDEX IF NOT EXISTS idx_sales_users_org_id ON sales_users(org_id);

-- sales_leads
ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_leads
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

ALTER TABLE sales_leads
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

CREATE INDEX IF NOT EXISTS idx_sales_leads_org_id ON sales_leads(org_id);

-- sales_meetings
ALTER TABLE sales_meetings
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_meetings
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

ALTER TABLE sales_meetings
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

CREATE INDEX IF NOT EXISTS idx_sales_meetings_org_id ON sales_meetings(org_id);

-- sales_qualifications
ALTER TABLE sales_qualifications
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_qualifications
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

ALTER TABLE sales_qualifications
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- sales_documents
ALTER TABLE sales_documents
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_documents
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

ALTER TABLE sales_documents
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

CREATE INDEX IF NOT EXISTS idx_sales_documents_org_id ON sales_documents(org_id);

-- sales_activities
ALTER TABLE sales_activities
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_activities
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

ALTER TABLE sales_activities
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

CREATE INDEX IF NOT EXISTS idx_sales_activities_org_id ON sales_activities(org_id);

-- sales_user_profiles
ALTER TABLE sales_user_profiles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_user_profiles
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

-- sales_permissions
ALTER TABLE sales_permissions
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_permissions
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

-- sales_role_permissions
ALTER TABLE sales_role_permissions
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

UPDATE sales_role_permissions
  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  WHERE org_id IS NULL;

-- sales_password_resets (no org_id needed — user-scoped via user_id)
