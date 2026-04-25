-- Migration 008: Add org_id to all sales tables
-- Run this in the Supabase SQL Editor to restore full multi-tenant support
-- and make all existing data visible again.

-- ── Step 1: Create the orgs table (if not already created) ────────────────
CREATE TABLE IF NOT EXISTS orgs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  plan           TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at  TIMESTAMPTZ,
  seats_limit    INT NOT NULL DEFAULT 5,
  ai_calls_used  INT NOT NULL DEFAULT 0,
  ai_calls_limit INT NOT NULL DEFAULT 100,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_onboarding (
  org_id           UUID PRIMARY KEY REFERENCES orgs(id),
  brand_set        BOOLEAN DEFAULT false,
  template_created BOOLEAN DEFAULT false,
  first_lead       BOOLEAN DEFAULT false,
  team_invited     BOOLEAN DEFAULT false,
  meta_connected   BOOLEAN DEFAULT false,
  survey_completed BOOLEAN DEFAULT false
);

-- ── Step 2: Insert the Fadaa org with the hardcoded fallback UUID ──────────
-- This UUID matches the fallback in lib/auth.ts
INSERT INTO orgs (id, name, slug, plan, status, seats_limit, ai_calls_limit)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Fadaa',
  'fadaa',
  'pro',
  'active',
  50,
  9999
)
ON CONFLICT (id) DO UPDATE SET
  name   = EXCLUDED.name,
  plan   = EXCLUDED.plan,
  status = EXCLUDED.status;

INSERT INTO org_onboarding (org_id, brand_set, first_lead, team_invited, survey_completed)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', true, true, true, true)
ON CONFLICT (org_id) DO NOTHING;

-- ── Step 3: Add org_id columns to all sales tables ────────────────────────
ALTER TABLE sales_users       ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_leads       ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_meetings    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_activities  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_qualifications ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_documents   ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_permissions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_password_resets ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);
ALTER TABLE sales_user_profiles   ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

-- ── Step 4: Backfill all existing rows to the Fadaa org ───────────────────
UPDATE sales_users       SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_leads       SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_meetings    SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_activities  SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_qualifications SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_documents   SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_permissions SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_password_resets SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;
UPDATE sales_user_profiles SET org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE org_id IS NULL;

-- ── Step 5: Add indexes for performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_leads_org_id       ON sales_leads(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_org_id    ON sales_meetings(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_org_id  ON sales_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_users_org_id       ON sales_users(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_documents_org_id   ON sales_documents(org_id);
