import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import {
  type BrandSettings,
  type ContractTemplate,
  DEFAULT_BRAND,
  autoMapFields,
  buildContractHtml,
} from '@/lib/sales/contractHtml'
// Legacy .docx support (kept for backward-compat while migrating)
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import mammoth from 'mammoth'

const BUCKET         = 'sales-config'
const LEGACY_TMPL    = 'contract-template.docx'
const TEMPLATES_FILE = 'contract-templates.json'
const BRAND_FILE     = 'brand-settings.json'

async function loadBrand(db: ReturnType<typeof getServiceClient>): Promise<BrandSettings> {
  try {
    const { data } = await db.storage.from(BUCKET).download(BRAND_FILE)
    if (!data) return DEFAULT_BRAND
    return { ...DEFAULT_BRAND, ...JSON.parse(await data.text()) }
  } catch { return DEFAULT_BRAND }
}

async function loadTemplates(db: ReturnType<typeof getServiceClient>): Promise<ContractTemplate[]> {
  try {
    const { data } = await db.storage.from(BUCKET).download(TEMPLATES_FILE)
    if (!data) return []
    const parsed = JSON.parse(await data.text())
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function extractPlaceholders(html: string): string[] {
  const found = new Set<string>()
  let m: RegExpExecArray | null
  const re = /\{([^{}]+)\}/g
  while ((m = re.exec(html)) !== null) found.add(m[1].trim())
  return Array.from(found).sort()
}

// Legacy .docx path
function extractDocxPlaceholders(zip: PizZip): string[] {
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: { leadId?: string; fields?: Record<string, string>; templateId?: string } = await req.json()
  const db = getServiceClient()

  // Try new HTML template system first
  const [templates, brand] = await Promise.all([loadTemplates(db), loadBrand(db)])

  const selectedTemplate = templates.length > 0
    ? (body.templateId ? templates.find(t => t.id === body.templateId) : null) ?? templates[0]
    : null

  let lead: Record<string, unknown> | null = null
  if (body.leadId) {
    const { data } = await db
      .from('sales_leads')
      .select('*, assigned_rep:sales_users!assigned_rep_id(id, name)')
      .eq('id', body.leadId)
      .single()
    lead = data
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // — New HTML template path —
  if (selectedTemplate) {
    const baseFields = lead ? autoMapFields(lead, brand) : {}
    const fields     = body.fields ? { ...baseFields, ...body.fields } : baseFields
    const placeholders = extractPlaceholders(selectedTemplate.content)
    const html = buildContractHtml(selectedTemplate.content, fields, brand)
    return NextResponse.json({ html, fields, placeholders, source: 'html' })
  }

  // — Legacy .docx fallback —
  const { data: tplData, error: tplErr } = await db.storage.from(BUCKET).download(LEGACY_TMPL)
  if (tplErr || !tplData) {
    return NextResponse.json({
      error: 'No contract template yet — go to Settings → Templates & Brand to create one.',
    }, { status: 404 })
  }

  const templateBuf = Buffer.from(await tplData.arrayBuffer())
  const zip = new PizZip(templateBuf)
  const placeholders = extractDocxPlaceholders(zip)

  let fields: Record<string, string>
  if (lead) {
    const mapped = autoMapFields(lead, brand)
    fields = Object.fromEntries(placeholders.map(p => [p, mapped[p] ?? '']))
  } else if (body.fields) {
    fields = body.fields
  } else {
    return NextResponse.json({ error: 'Provide leadId or fields' }, { status: 400 })
  }

  try {
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' })
    doc.render(fields)
    const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf })
    const builtHtml = buildContractHtml(`<div>${html}</div>`, fields, brand)
    return NextResponse.json({ html: builtHtml, fields, placeholders, source: 'docx' })
  } catch (err) {
    console.error('Contract preview error:', err)
    return NextResponse.json({ error: 'Failed to render contract — check template placeholders' }, { status: 500 })
  }
}
