import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import mammoth from 'mammoth'

const BUCKET   = 'sales-config'
const TEMPLATE = 'contract-template.docx'

const SERVICE_LABELS: Record<string, string> = {
  marketing: 'Marketing Services',
  software:  'Software Development',
  both:      'Marketing & Software Services',
}
const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead', contacted: 'Contacted', discovery: 'Discovery',
  meeting_scheduled: 'Meeting Scheduled', meeting_completed: 'Meeting Completed',
  qualified: 'Qualified', proposal_sent: 'Proposal Sent', negotiation: 'Negotiation',
  contract_sent: 'Contract Sent', won: 'Won', lost: 'Lost',
}

function extractPlaceholders(zip: PizZip): string[] {
  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/footer1.xml']
  const found = new Set<string>()
  for (const file of xmlFiles) {
    try {
      const xml = zip.file(file)?.asText() ?? ''
      const cleaned = xml.replace(/<[^>]+>/g, '')
      let m: RegExpExecArray | null
      const re = /\{([^{}]+)\}/g
      while ((m = re.exec(cleaned)) !== null) {
        const key = m[1].trim()
        if (key && !/\s{2,}/.test(key)) found.add(key)
      }
    } catch { /* file may not exist */ }
  }
  return Array.from(found).sort()
}

function autoMapFields(placeholders: string[], lead: Record<string, any>): Record<string, string> {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const value = lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : ''

  const knownMap: Record<string, string> = {
    company: lead.company_name ?? '', company_name: lead.company_name ?? '',
    client: lead.company_name ?? '', client_name: lead.company_name ?? '',
    contact: lead.contact_person ?? '', contact_person: lead.contact_person ?? '',
    contact_name: lead.contact_person ?? '', name: lead.contact_person ?? '',
    email: lead.email ?? '', contact_email: lead.email ?? '',
    phone: lead.phone ?? '', contact_phone: lead.phone ?? '',
    service: SERVICE_LABELS[lead.service_type] ?? lead.service_type ?? '',
    service_type: SERVICE_LABELS[lead.service_type] ?? lead.service_type ?? '',
    services: SERVICE_LABELS[lead.service_type] ?? lead.service_type ?? '',
    value, amount: value, contract_value: value, price: value,
    date: today, contract_date: today, today, start_date: today,
    rep: lead.assigned_rep?.name ?? '', sales_rep: lead.assigned_rep?.name ?? '',
    assigned_rep: lead.assigned_rep?.name ?? '',
    notes: lead.notes ?? '',
    package: lead.marketing_package ?? '', marketing_package: lead.marketing_package ?? '',
    scope: lead.software_scope_notes ?? '', software_scope: lead.software_scope_notes ?? '',
    budget: lead.budget_range ?? '', budget_range: lead.budget_range ?? '',
    stage: STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage ?? '',
    source: lead.lead_source ?? '', lead_source: lead.lead_source ?? '',
    priority: lead.priority ?? '',
    deal_type: lead.deal_type ?? '', type: lead.deal_type ?? '',
    expected_close: lead.expected_close_date ?? '', close_date: lead.expected_close_date ?? '',
  }

  const result: Record<string, string> = {}
  for (const p of placeholders) {
    result[p] = knownMap[p.toLowerCase()] ?? ''
  }
  return result
}

async function fillAndConvert(templateBuf: Buffer, fields: Record<string, string>): Promise<{ docxBuf: Buffer; html: string }> {
  const zip = new PizZip(templateBuf)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })
  doc.render(fields)
  const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer

  const result = await mammoth.convertToHtml({ buffer: docxBuf })
  return { docxBuf, html: result.value }
}

// POST — generate preview HTML from leadId or from explicit fields
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: { leadId?: string; fields?: Record<string, string> } = await req.json()

  const db = getServiceClient()
  const { data: tplData, error: tplErr } = await db.storage.from(BUCKET).download(TEMPLATE)
  if (tplErr || !tplData) return NextResponse.json({ error: 'No contract template uploaded yet — go to Settings to upload one.' }, { status: 404 })

  const templateBuf = Buffer.from(await tplData.arrayBuffer())
  const zip = new PizZip(templateBuf)
  const placeholders = extractPlaceholders(zip)

  let fields: Record<string, string>

  if (body.leadId) {
    const { data: lead } = await db
      .from('sales_leads')
      .select('*, assigned_rep:sales_users!assigned_rep_id(id, name)')
      .eq('id', body.leadId)
      .single()
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    fields = autoMapFields(placeholders, lead)
  } else if (body.fields) {
    fields = body.fields
  } else {
    return NextResponse.json({ error: 'Provide leadId or fields' }, { status: 400 })
  }

  try {
    const { html } = await fillAndConvert(templateBuf, fields)
    return NextResponse.json({ html, fields, placeholders })
  } catch (err) {
    console.error('Contract preview error:', err)
    return NextResponse.json({ error: 'Failed to render contract — check template placeholders' }, { status: 500 })
  }
}
