-- ═══════════════════════════════════════════════════════════════
-- FIX: Add missing meta_origin column to sales_leads
-- Run this if you already have the DB built but missing this column
-- ═══════════════════════════════════════════════════════════════

-- Add meta_origin column if missing
ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS meta_origin TEXT CHECK (meta_origin IN ('paid', 'organic'));

-- Ensure org_onboarding has all columns the code expects
ALTER TABLE org_onboarding
  ADD COLUMN IF NOT EXISTS survey_completed    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS brand_set           BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS template_created    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS first_lead          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_invited        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_connected      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_shown       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS checklist_dismissed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS agency_type         TEXT,
  ADD COLUMN IF NOT EXISTS team_size           TEXT,
  ADD COLUMN IF NOT EXISTS primary_goal        TEXT,
  ADD COLUMN IF NOT EXISTS current_tool        TEXT,
  ADD COLUMN IF NOT EXISTS hear_about          TEXT;

NOTIFY pgrst, 'reload schema';
