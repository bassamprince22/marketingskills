-- Social dashboard tables (workspaces, trends, content_queue, config, analytics)
-- These were missing from the original migrations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- WORKSPACES (social media accounts)
CREATE TABLE IF NOT EXISTS workspaces (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  tiktok_token             TEXT,
  instagram_token          TEXT,
  instagram_user_id        TEXT,
  linkedin_token           TEXT,
  linkedin_person_id       TEXT,
  buffer_token             TEXT,
  higgsfield_api_key       TEXT,
  higgsfield_avatar_id     TEXT,
  brand_colors             TEXT NOT NULL DEFAULT '#6366f1,#8b5cf6',
  niche_hashtags_tiktok    TEXT[] NOT NULL DEFAULT '{}',
  niche_hashtags_instagram TEXT[] NOT NULL DEFAULT '{}',
  content_mix_broll        INT NOT NULL DEFAULT 40,
  content_mix_avatar       INT NOT NULL DEFAULT 30,
  content_mix_real         INT NOT NULL DEFAULT 30,
  automation_enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRENDS
CREATE TABLE IF NOT EXISTS trends (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  trend_name     TEXT NOT NULL,
  our_angle      TEXT NOT NULL DEFAULT '',
  pillar         TEXT NOT NULL DEFAULT '',
  opening_hook   TEXT NOT NULL DEFAULT '',
  why_resonating TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trends_workspace ON trends(workspace_id, created_at DESC);

-- CONTENT QUEUE
CREATE TABLE IF NOT EXISTS content_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  trend_id          UUID REFERENCES trends(id) ON DELETE SET NULL,
  content_type      TEXT NOT NULL DEFAULT 'video'
                      CHECK (content_type IN ('video','carousel','linkedin_article','linkedin_post','twitter_thread')),
  platform          TEXT,
  video_type        TEXT CHECK (video_type IN ('ai-broll','ai-avatar','real-video')),
  content           TEXT,
  title             TEXT,
  slide_data        JSONB,
  slide_urls        TEXT[],
  video_script      TEXT,
  video_url         TEXT,
  instagram_caption TEXT,
  twitter_thread    JSONB,
  facebook_post     TEXT,
  published_url     TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','ready','published','error','skip')),
  scheduled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_queue_workspace ON content_queue(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_queue_status    ON content_queue(workspace_id, status);

-- CONFIG (one row per workspace)
CREATE TABLE IF NOT EXISTS config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  pillar_weights JSONB NOT NULL DEFAULT '{}',
  posting_times  JSONB,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_config_workspace ON config(workspace_id);

-- ANALYTICS SNAPSHOTS
CREATE TABLE IF NOT EXISTS analytics (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start         DATE NOT NULL,
  platform_metrics   JSONB NOT NULL DEFAULT '{}',
  top_posts          JSONB NOT NULL DEFAULT '[]',
  pillar_performance JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_workspace ON analytics(workspace_id, week_start DESC);

NOTIFY pgrst, 'reload schema';
