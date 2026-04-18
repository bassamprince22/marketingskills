-- ═══════════════════════════════════════════════════════════════
-- Reset user accounts and add invite flow
-- ═══════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL editor.
-- This deletes ALL existing users and creates a single admin.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Wipe all existing users ──────────────────────────────────
-- Children: sales_user_profiles, sales_permissions, sales_password_resets
-- cascade automatically via ON DELETE CASCADE.
-- sales_leads.assigned_rep_id / created_by → SET NULL (already configured).
-- activities.user_id → SET NULL.
DELETE FROM sales_users;

-- ─── 2. Seed the admin account ───────────────────────────────────
-- Username: admin
-- Email:    bassamprince22@gmail.com
-- Password: Admin@123@Fadaa
-- (bcryptjs hash, 10 rounds — verified with bcrypt.compareSync)
INSERT INTO sales_users (username, email, name, role, password_hash, is_active)
VALUES (
  'admin',
  'bassamprince22@gmail.com',
  'Admin',
  'admin',
  '$2b$10$FXgqy5LNq4WtHtJW8Pgkz.Fy60WUe2804pOtWMWM070NxhiMyg3K.',
  true
);

-- ─── 3. Invites table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_invites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token        TEXT NOT NULL UNIQUE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('manager', 'rep', 'admin')),
  invited_by   UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  accepted_by  UUID REFERENCES sales_users(id) ON DELETE SET NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token      ON sales_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_pending    ON sales_invites(accepted_at, revoked_at) WHERE accepted_at IS NULL AND revoked_at IS NULL;
