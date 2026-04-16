import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { logActivity } from '@/lib/sales/db'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const CONFIG_BUCKET = 'sales-config'
const DOCS_BUCKET   = 'sales-documents'
const TEMPLATE      = 'contract-template.docx'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId } = session.user as { id: string }

  const { leadId, fields, filename } = await req.json() as {
    leadId:   string
    fields:   Record<string, string>
    filename?: string
  }
  if (!leadId || !fields) return NextResponse.json({ error: 'Missing leadId or fields' }, { status: 400 })

  const db = getServiceClient()

  // Download template
  const { data: tpl, error: tplErr } = await db.storage.from(CONFIG_BUCKET).download(TEMPLATE)
  if (tplErr || !tpl) return NextResponse.json({ error: 'No template found' }, { status: 404 })

  try {
    const buf = Buffer.from(await tpl.arrayBuffer())
    const zip = new PizZip(buf)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' })
    doc.render(fields)
    const out = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer

    // Count existing contracts for this lead to version it
    const { count } = await db.from('sales_documents')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('doc_type', 'contract')
    const version = `v${(count ?? 0) + 1}`

    const baseName  = (filename ?? 'contract').replace(/[^a-z0-9_\-\s]/gi, '_')
    const storagePath = `leads/${leadId}/contracts/${version}_${baseName}.docx`

    // Upload to Supabase Storage
    const { error: upErr } = await db.storage.from(DOCS_BUCKET).upload(storagePath, out, {
      upsert: true,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: { publicUrl } } = db.storage.from(DOCS_BUCKET).getPublicUrl(storagePath)

    // Create document record
    const { data: docRecord } = await db.from('sales_documents').insert({
      lead_id:      leadId,
      uploaded_by:  userId,
      doc_type:     'contract',
      status:       'draft',
      version,
      file_url:     publicUrl,
      file_name:    `${version}_${baseName}.docx`,
      file_size_kb: Math.round(out.length / 1024),
      notes:        'Generated from contract template',
    }).select().single()

    await logActivity({
      lead_id:     leadId,
      user_id:     userId,
      action_type: 'doc_uploaded',
      description: `Contract ${version} generated and saved`,
      metadata:    { doc_type: 'contract', version },
    })

    return NextResponse.json({ ok: true, document: docRecord })
  } catch (err) {
    console.error('Contract approve error:', err)
    return NextResponse.json({ error: 'Failed to save contract' }, { status: 500 })
  }
}
