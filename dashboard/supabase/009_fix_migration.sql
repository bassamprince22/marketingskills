-- Migration 009: Fix missing org_onboarding columns + create proposals tables
-- Run this in the Supabase SQL Editor (project: rmxpcvhedevqtflmurvp)
-- This fixes the 42703 error for welcome_shown and creates the proposals tables.

-- ── Step 1: Add missing columns to org_onboarding ────────────────────────────
-- (These exist in migration 006 but not in 008's CREATE TABLE definition)
ALTER TABLE org_onboarding
  ADD COLUMN IF NOT EXISTS welcome_shown       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding
  ADD COLUMN IF NOT EXISTS checklist_dismissed BOOLEAN NOT NULL DEFAULT false;

-- Mark the Fadaa org as having completed onboarding already
UPDATE org_onboarding
  SET welcome_shown = true, checklist_dismissed = true
  WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- ── Step 2: Create proposals tables ──────────────────────────────────────────
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
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id   UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  description   TEXT NOT NULL DEFAULT '',
  qty           NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit          TEXT NOT NULL DEFAULT '',
  rate          NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS proposal_adjustments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id   UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  adj_type      TEXT NOT NULL DEFAULT 'tax',
  label         TEXT NOT NULL,
  value_type    TEXT NOT NULL DEFAULT 'percent',
  value         NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_proposals_org_id  ON proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token   ON proposals(public_token);

-- ── Step 3: Reload PostgREST schema cache ────────────────────────────────────
SELECT pg_notify('pgrst', 'reload schema');
