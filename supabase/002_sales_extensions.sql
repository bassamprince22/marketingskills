-- =============================================================
-- 002_sales_extensions.sql
-- Run in Supabase Studio (SQL editor) after 001_sales_system.sql
-- =============================================================

-- ─── Daily Reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_daily_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES sales_users(id) ON DELETE CASCADE,
  report_date         DATE NOT NULL,
  leads_total         INT  NOT NULL DEFAULT 0,
  leads_qualified     INT  NOT NULL DEFAULT 0,
  leads_waiting       INT  NOT NULL DEFAULT 0,
  meetings_done       INT  NOT NULL DEFAULT 0,
  proposals_sent      INT  NOT NULL DEFAULT 0,
  contracts_generated INT  NOT NULL DEFAULT 0,
  won_today           INT  NOT NULL DEFAULT 0,
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

-- ─── Custom Service Catalog ────────────────────────────────────
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

-- Add service_id FK to leads (nullable — old leads keep service_type)
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES sales_services(id);

-- ─── Commissions ──────────────────────────────────────────────
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

-- ─── Challenges (Races) ───────────────────────────────────────
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

-- ─── Reward Tiers ─────────────────────────────────────────────
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

-- ─── Reward Claims ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_challenge_claims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id     UUID NOT NULL REFERENCES sales_challenges(id),
  reward_id        UUID NOT NULL REFERENCES sales_challenge_rewards(id),
  rep_id           UUID NOT NULL REFERENCES sales_users(id),
  amount_achieved  DECIMAL(12,2),
  claimed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Marketing Campaign Costs ─────────────────────────────────
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

-- ─── Useful Indices ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date   ON sales_daily_reports(user_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date        ON sales_daily_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_rep           ON sales_commissions(rep_id);
CREATE INDEX IF NOT EXISTS idx_commissions_lead          ON sales_commissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_challenge_claims_rep      ON sales_challenge_claims(rep_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_campaign_costs_source_mo  ON sales_campaign_costs(source, month DESC);
