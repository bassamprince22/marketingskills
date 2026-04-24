export interface BrandSettings {
  companyName: string
  address:     string
  phone:       string
  email:       string
  website:     string
  brandColor:  string
  logoUrl:     string
}

export interface ContractTemplate {
  id:        string
  name:      string
  content:   string
  createdAt: string
  updatedAt: string
}

export const DEFAULT_BRAND: BrandSettings = {
  companyName: '',
  address:     '',
  phone:       '',
  email:       '',
  website:     '',
  brandColor:  '#4F8EF7',
  logoUrl:     '',
}

export const SERVICE_LABELS: Record<string, string> = {
  marketing: 'Marketing Services',
  software:  'Software Development',
  both:      'Marketing & Software Services',
}

export const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead', contacted: 'Contacted', discovery: 'Discovery',
  meeting_scheduled: 'Meeting Scheduled', meeting_completed: 'Meeting Completed',
  qualified: 'Qualified', proposal_sent: 'Proposal Sent', negotiation: 'Negotiation',
  contract_sent: 'Contract Sent', won: 'Won', lost: 'Lost',
}

export function autoMapFields(lead: Record<string, unknown>, brand: BrandSettings): Record<string, string> {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const val   = lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : ''
  const rep   = (lead.assigned_rep as { name?: string } | null)?.name ?? ''

  return {
    company: String(lead.company_name ?? ''),
    company_name: String(lead.company_name ?? ''),
    client: String(lead.company_name ?? ''),
    client_name: String(lead.company_name ?? ''),
    contact: String(lead.contact_person ?? ''),
    contact_person: String(lead.contact_person ?? ''),
    contact_name: String(lead.contact_person ?? ''),
    name: String(lead.contact_person ?? ''),
    email: String(lead.email ?? ''),
    contact_email: String(lead.email ?? ''),
    phone: String(lead.phone ?? ''),
    contact_phone: String(lead.phone ?? ''),
    service: SERVICE_LABELS[String(lead.service_type ?? '')] ?? String(lead.service_type ?? ''),
    service_type: SERVICE_LABELS[String(lead.service_type ?? '')] ?? String(lead.service_type ?? ''),
    services: SERVICE_LABELS[String(lead.service_type ?? '')] ?? String(lead.service_type ?? ''),
    value: val, amount: val, contract_value: val, price: val,
    date: today, contract_date: today, today, start_date: today,
    rep, sales_rep: rep, assigned_rep: rep,
    notes: String(lead.notes ?? ''),
    package: String(lead.marketing_package ?? ''),
    marketing_package: String(lead.marketing_package ?? ''),
    scope: String(lead.software_scope_notes ?? ''),
    software_scope: String(lead.software_scope_notes ?? ''),
    budget: String(lead.budget_range ?? ''),
    budget_range: String(lead.budget_range ?? ''),
    stage: STAGE_LABELS[String(lead.pipeline_stage ?? '')] ?? String(lead.pipeline_stage ?? ''),
    source: String(lead.lead_source ?? ''),
    lead_source: String(lead.lead_source ?? ''),
    priority: String(lead.priority ?? ''),
    deal_type: String(lead.deal_type ?? ''),
    type: String(lead.deal_type ?? ''),
    expected_close: String(lead.expected_close_date ?? ''),
    close_date: String(lead.expected_close_date ?? ''),
    // Brand fields
    brand_company_name: brand.companyName,
    brand_address: brand.address,
    brand_phone: brand.phone,
    brand_email: brand.email,
    brand_website: brand.website,
  }
}

function fillTemplate(html: string, fields: Record<string, string>): string {
  return html.replace(/\{([^{}]+)\}/g, (_, key) => fields[key.trim()] ?? '')
}

export function buildContractHtml(
  templateContent: string,
  fields:          Record<string, string>,
  brand:           BrandSettings,
): string {
  const filled = fillTemplate(templateContent, fields)
  const color  = brand.brandColor || '#4F8EF7'

  const header = `
    <div class="brand-header">
      <div class="brand-header-inner">
        <div class="brand-left">
          ${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="logo" class="brand-logo" />` : ''}
          <div>
            ${brand.companyName ? `<div class="brand-name">${brand.companyName}</div>` : ''}
            ${brand.address    ? `<div class="brand-detail">${brand.address}</div>`    : ''}
            ${brand.phone      ? `<div class="brand-detail">${brand.phone}</div>`      : ''}
            ${brand.email      ? `<div class="brand-detail">${brand.email}</div>`      : ''}
            ${brand.website    ? `<div class="brand-detail">${brand.website}</div>`    : ''}
          </div>
        </div>
        <div class="brand-right">
          <div class="brand-doc-label">SERVICE AGREEMENT</div>
          <div class="brand-doc-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      <div class="brand-bar" style="background:${color}"></div>
    </div>`

  const signatureBlock = `
    <div class="signature-section">
      <div class="signature-col">
        <div class="signature-title">CLIENT SIGNATURE</div>
        <div class="signature-line"></div>
        <div class="signature-label">Name: ${fields.contact_person ?? fields.contact ?? fields.name ?? ''}</div>
        <div class="signature-label">Date: ___________________</div>
      </div>
      <div class="signature-col">
        <div class="signature-title">COMPANY REPRESENTATIVE</div>
        <div class="signature-line"></div>
        <div class="signature-label">Name: ${fields.rep ?? fields.sales_rep ?? ''}</div>
        <div class="signature-label">Date: ___________________</div>
      </div>
    </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Contract${brand.companyName ? ' — ' + brand.companyName : ''}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.7; background: #fff; }
  /* Brand header */
  .brand-header { margin-bottom: 32px; }
  .brand-header-inner { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 0 16px; }
  .brand-left { display: flex; align-items: flex-start; gap: 14px; }
  .brand-logo { height: 56px; width: auto; object-fit: contain; }
  .brand-name { font-size: 16pt; font-weight: 700; color: #111; }
  .brand-detail { font-size: 9pt; color: #555; margin-top: 2px; }
  .brand-right { text-align: right; }
  .brand-doc-label { font-size: 13pt; font-weight: 700; letter-spacing: 0.05em; color: #222; }
  .brand-doc-date { font-size: 9pt; color: #666; margin-top: 4px; }
  .brand-bar { height: 4px; border-radius: 2px; margin-top: 12px; }
  /* Content */
  .contract-content { padding: 0 0 32px; }
  .contract-content h1 { font-size: 16pt; font-weight: 700; margin: 24px 0 10px; color: #111; }
  .contract-content h2 { font-size: 13pt; font-weight: 700; margin: 20px 0 8px; color: #222; }
  .contract-content h3 { font-size: 11pt; font-weight: 700; margin: 16px 0 6px; }
  .contract-content p  { margin-bottom: 10px; }
  .contract-content ul, .contract-content ol { margin: 8px 0 10px 20px; }
  .contract-content li { margin-bottom: 4px; }
  .contract-content table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .contract-content td, .contract-content th { border: 1px solid #ccc; padding: 7px 11px; font-size: 10pt; }
  .contract-content th { background: #f3f4f6; font-weight: 700; }
  .contract-content strong { font-weight: 700; }
  .contract-content em { font-style: italic; }
  /* Signature */
  .signature-section { display: flex; gap: 40px; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .signature-col { flex: 1; }
  .signature-title { font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; color: #555; margin-bottom: 32px; text-transform: uppercase; }
  .signature-line { border-bottom: 1px solid #333; margin-bottom: 10px; }
  .signature-label { font-size: 9pt; color: #444; margin-top: 6px; }
  /* Print */
  @page { size: A4; margin: 20mm 22mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
${header}
<div class="contract-content">${filled}</div>
${signatureBlock}
</body>
</html>`
}
