-- Safe multi-tenancy installer/continuation.
-- Use this if 006_multi_tenancy.sql fails because an optional table is missing.
-- It creates the SaaS foundation and only alters sales tables that exist.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orgs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  slug               TEXT UNIQUE NOT NULL,
  plan               TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at      TIMESTAMPTZ,
  seats_limit        INT NOT NULL DEFAULT 5,
  ai_calls_used      INT NOT NULL DEFAULT 0,
  ai_calls_limit     INT NOT NULL DEFAULT 100,
  logo_url           TEXT,
  brand_color        TEXT DEFAULT '#7C3AED',
  status             TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS seats_limit INT NOT NULL DEFAULT 5;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS ai_calls_used INT NOT NULL DEFAULT 0;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS ai_calls_limit INT NOT NULL DEFAULT 100;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#7C3AED';
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   TEXT PRIMARY KEY,
  org_id               UUID REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_customer_id   TEXT,
  plan                 TEXT NOT NULL,
  status               TEXT NOT NULL,
  current_period_end   TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS agency_type TEXT;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS team_size TEXT;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS primary_goal TEXT;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS current_tool TEXT;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS hear_about TEXT;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS brand_set BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS template_created BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS first_lead BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS team_invited BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS meta_connected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS welcome_shown BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS checklist_dismissed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE org_onboarding ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

INSERT INTO orgs (id, name, slug, plan, seats_limit, ai_calls_limit, status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Fadaa Agency',
  'fadaa',
  'pro',
  50,
  1000,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  seats_limit = EXCLUDED.seats_limit,
  ai_calls_limit = EXCLUDED.ai_calls_limit,
  status = EXCLUDED.status;

INSERT INTO org_onboarding (
  org_id,
  survey_completed,
  brand_set,
  template_created,
  first_lead,
  team_invited,
  meta_connected,
  welcome_shown,
  checklist_dismissed
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  true
)
ON CONFLICT (org_id) DO UPDATE SET
  survey_completed = true,
  brand_set = true,
  template_created = true,
  first_lead = true,
  team_invited = true,
  welcome_shown = true,
  checklist_dismissed = true;

-- Some older installs do not have this table yet, but current profile/team
-- pages expect it. Create the minimal compatible shape.
DO $$
BEGIN
  IF to_regclass('public.sales_users') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS sales_user_profiles (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID UNIQUE REFERENCES sales_users(id) ON DELETE CASCADE,
      job_title   TEXT,
      department  TEXT,
      phone       TEXT,
      avatar_url  TEXT,
      manager_id  UUID REFERENCES sales_users(id),
      bio         TEXT,
      join_date   DATE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    RAISE NOTICE 'Skipping sales_user_profiles creation because sales_users does not exist.';
  END IF;
END $$;

DO $$
DECLARE
  fadaa_org_id CONSTANT UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  table_name TEXT;
  sales_tables TEXT[] := ARRAY[
    'sales_users',
    'sales_leads',
    'sales_meetings',
    'sales_qualifications',
    'sales_documents',
    'sales_activities',
    'sales_permissions',
    'sales_role_permissions',
    'sales_password_resets',
    'sales_user_profiles',
    'sales_services',
    'sales_commissions',
    'sales_challenges',
    'sales_challenge_claims',
    'sales_challenge_rewards',
    'sales_daily_reports',
    'sales_invites',
    'sales_campaign_costs',
    'sales_csv_imports'
  ];
BEGIN
  FOREACH table_name IN ARRAY sales_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE NOTICE 'Skipping missing table: %', table_name;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id UUID', table_name);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = to_regclass(format('public.%I', table_name))
        AND conname = table_name || '_org_id_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (org_id) REFERENCES public.orgs(id)',
        table_name,
        table_name || '_org_id_fkey'
      );
    END IF;

    EXECUTE format(
      'UPDATE public.%I SET org_id = %L::uuid WHERE org_id IS NULL',
      table_name,
      fadaa_org_id
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT %L::uuid',
      table_name,
      fadaa_org_id
    );
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL', table_name);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(org_id)',
      'idx_' || table_name || '_org_id',
      table_name
    );
  END LOOP;
END $$;
