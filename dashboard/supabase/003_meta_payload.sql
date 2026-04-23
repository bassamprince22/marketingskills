-- Add JSONB column to store raw Meta lead form answers
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS meta_raw_payload JSONB;
