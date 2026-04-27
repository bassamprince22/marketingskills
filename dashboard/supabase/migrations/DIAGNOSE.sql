-- ═══════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Run this in Supabase SQL Editor to see what's wrong
-- ═══════════════════════════════════════════════════════════════

-- 1. Check if orgs table exists and Fadaa org is there
SELECT 'orgs table' AS check_name, id, name, plan, status
FROM orgs
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 2. Check if admin user exists and is active
SELECT 'admin user' AS check_name, id, username, email, role, is_active, org_id
FROM sales_users
WHERE username = 'admin';

-- 3. Check if sales_leads table exists
SELECT 'leads count' AS check_name, COUNT(*) AS total FROM sales_leads;

-- 4. Check if org_onboarding row exists for Fadaa
SELECT 'onboarding' AS check_name, *
FROM org_onboarding
WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 5. Check if meta_origin column exists on sales_leads
SELECT 'meta_origin column' AS check_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales_leads' AND column_name = 'meta_origin';
