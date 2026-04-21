ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS meta_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_page_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_form_id TEXT;

UPDATE sales_leads
SET meta_form_id = COALESCE(meta_form_id, meta_raw_payload->>'form_id')
WHERE lead_source = 'meta'
  AND meta_raw_payload IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_meta_lead_id_unique
  ON sales_leads(meta_lead_id)
  WHERE meta_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_meta_page_id
  ON sales_leads(meta_page_id)
  WHERE meta_page_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_meta_form_id
  ON sales_leads(meta_form_id)
  WHERE meta_form_id IS NOT NULL;
