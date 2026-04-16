import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const BUCKET   = 'sales-config'
const TEMPLATE = 'contract-template.docx'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fields, filename } = await req.json() as {
    fields:   Record<string, string>
    filename?: string
  }

  const db = getServiceClient()
  const { data, error } = await db.storage.from(BUCKET).download(TEMPLATE)
  if (error || !data) return NextResponse.json({ error: 'No contract template uploaded yet' }, { status: 404 })

  try {
    const buf  = Buffer.from(await data.arrayBuffer())
    const zip  = new PizZip(buf)
    const doc  = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks:    true,
      // Return empty string for missing tags instead of throwing
      nullGetter: () => '',
    })

    doc.render(fields)

    const out  = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
    const name = (filename ?? 'contract').replace(/[^a-z0-9_\-\s]/gi, '_') + '.docx'

    return new NextResponse(out as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    })
  } catch (err) {
    console.error('Contract generation error:', err)
    return NextResponse.json({ error: 'Failed to generate contract — check your template placeholders' }, { status: 500 })
  }
}
