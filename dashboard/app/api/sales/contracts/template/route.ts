import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import PizZip from 'pizzip'

const BUCKET   = 'sales-config'
const TEMPLATE = 'contract-template.docx'

// Extract {placeholder} tags from raw docx XML
function extractPlaceholders(zip: PizZip): string[] {
  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/footer1.xml']
  const found = new Set<string>()
  for (const file of xmlFiles) {
    try {
      const xml = zip.file(file)?.asText() ?? ''
      // Strip XML tags between { and } so split placeholders get joined
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

// GET — return placeholder list (and whether template exists)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceClient()
  const { data, error } = await db.storage.from(BUCKET).download(TEMPLATE)
  if (error || !data) return NextResponse.json({ hasTemplate: false, placeholders: [] })

  try {
    const buf  = Buffer.from(await data.arrayBuffer())
    const zip  = new PizZip(buf)
    const tags = extractPlaceholders(zip)
    return NextResponse.json({ hasTemplate: true, placeholders: tags })
  } catch {
    return NextResponse.json({ hasTemplate: true, placeholders: [] })
  }
}

// POST — upload a new template
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!file.name.endsWith('.docx')) return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 400 })

  const bytes = await file.arrayBuffer()

  // Validate it's a real docx
  try {
    new PizZip(Buffer.from(bytes))
  } catch {
    return NextResponse.json({ error: 'Invalid .docx file' }, { status: 400 })
  }

  const db = getServiceClient()
  const { error } = await db.storage.from(BUCKET).upload(TEMPLATE, bytes, {
    upsert: true,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return placeholders from newly uploaded template
  const zip  = new PizZip(Buffer.from(bytes))
  const tags = extractPlaceholders(zip)
  return NextResponse.json({ ok: true, placeholders: tags })
}

// DELETE — remove template
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()
  await db.storage.from(BUCKET).remove([TEMPLATE])
  return NextResponse.json({ ok: true })
}
