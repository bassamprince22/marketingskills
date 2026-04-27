-- Safe installer for the Proposals module.
-- Run 006_multi_tenancy.sql first if the orgs table does not exist yet.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_number TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'default';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS prepared_by UUID;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS cover_color TEXT DEFAULT '#7C3AED';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS public_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex');
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE proposals SET status = 'new' WHERE status IS NULL;
UPDATE proposals SET category = 'default' WHERE category IS NULL;
UPDATE proposals SET proposal_date = CURRENT_DATE WHERE proposal_date IS NULL;
UPDATE proposals SET cover_color = '#7C3AED' WHERE cover_color IS NULL;
UPDATE proposals SET public_token = encode(gen_random_bytes(32), 'hex') WHERE public_token IS NULL;
UPDATE proposals SET is_template = false WHERE is_template IS NULL;
UPDATE proposals SET created_at = now() WHERE created_at IS NULL;
UPDATE proposals SET updated_at = now() WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_org_id_fkey'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES orgs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_lead_id_fkey'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES sales_leads(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_prepared_by_fkey'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_prepared_by_fkey
      FOREIGN KEY (prepared_by) REFERENCES sales_users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_public_token_key'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_public_token_key UNIQUE (public_token);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS proposal_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id   UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  description   TEXT NOT NULL DEFAULT '',
  qty           NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit          TEXT NOT NULL DEFAULT '',
  rate          NUMERIC(12,2) NOT NULL DEFAULT 0
);

ALTER TABLE proposal_line_items ADD COLUMN IF NOT EXISTS proposal_id UUID;
ALTER TABLE proposal_line_items ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE proposal_line_items ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE proposal_line_items ADD COLUMN IF NOT EXISTS qty NUMERIC(10,2) DEFAULT 1;
ALTER TABLE proposal_line_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';
ALTER TABLE proposal_line_items ADD COLUMN IF NOT EXISTS rate NUMERIC(12,2) DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_line_items_proposal_id_fkey'
  ) THEN
    ALTER TABLE proposal_line_items
      ADD CONSTRAINT proposal_line_items_proposal_id_fkey
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS proposal_adjustments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id   UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  adj_type      TEXT NOT NULL DEFAULT 'tax',
  label         TEXT NOT NULL,
  value_type    TEXT NOT NULL DEFAULT 'percent',
  value         NUMERIC(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE proposal_adjustments ADD COLUMN IF NOT EXISTS proposal_id UUID;
ALTER TABLE proposal_adjustments ADD COLUMN IF NOT EXISTS adj_type TEXT DEFAULT 'tax';
ALTER TABLE proposal_adjustments ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE proposal_adjustments ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'percent';
ALTER TABLE proposal_adjustments ADD COLUMN IF NOT EXISTS value NUMERIC(10,2) DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_adjustments_proposal_id_fkey'
  ) THEN
    ALTER TABLE proposal_adjustments
      ADD CONSTRAINT proposal_adjustments_proposal_id_fkey
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_org_id ON proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(public_token);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(org_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_template ON proposals(org_id, is_template);
CREATE INDEX IF NOT EXISTS idx_proposal_line_items_proposal ON proposal_line_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_adjustments_proposal ON proposal_adjustments(proposal_id);
