import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db   = getServiceClient()
  const user = session.user as { id?: string; role?: string }

  const { data: report, error } = await db.from('sales_daily_reports')
    .select('*, sales_users!user_id(id, name)')
    .eq('id', params.id)
    .single()

  if (error || !report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((user.role ?? 'rep') === 'rep' && report.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { format } = await req.json()

  if (format === 'docx') {
    // Build a simple DOCX with raw XML (no template needed)
    const PizZip         = (await import('pizzip')).default
    const Docxtemplater  = (await import('docxtemplater')).default

    // Minimal blank DOCX template embedded as base64
    // We'll generate HTML-style text content using docxtemplater expressions
    const content = buildDocxXml(report)
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    const buf: Buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
    const uint8 = new Uint8Array(buf)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="daily-report-${report.report_date}.docx"`,
      },
    })
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
}

function buildDocxXml(report: Record<string, unknown>): string {
  const repName    = (report.sales_users as { name?: string })?.name ?? 'Unknown'
  const reportDate = report.report_date as string

  // Return a minimal OOXML document
  const bodyContent = `
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>Daily Report — ${reportDate}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="6B7280"/></w:rPr><w:t>${repName}</w:t></w:r></w:p>
    <w:p><w:r><w:t> </w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Numbers</w:t></w:r></w:p>
    <w:p><w:r><w:t>Total Leads: ${report.leads_total}  |  Qualified: ${report.leads_qualified}  |  Waiting: ${report.leads_waiting}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Meetings Done: ${report.meetings_done}  |  Proposals Sent: ${report.proposals_sent}  |  Won Today: ${report.won_today}</w:t></w:r></w:p>
    <w:p><w:r><w:t> </w:t></w:r></w:p>
    ${report.highlights ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Highlights</w:t></w:r></w:p><w:p><w:r><w:t>${report.highlights}</w:t></w:r></w:p><w:p><w:r><w:t> </w:t></w:r></w:p>` : ''}
    ${report.challenges ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Challenges</w:t></w:r></w:p><w:p><w:r><w:t>${report.challenges}</w:t></w:r></w:p><w:p><w:r><w:t> </w:t></w:r></w:p>` : ''}
    ${report.next_day_plan ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Tomorrow's Plan</w:t></w:r></w:p><w:p><w:r><w:t>${report.next_day_plan}</w:t></w:r></w:p><w:p><w:r><w:t> </w:t></w:r></w:p>` : ''}
    ${report.custom_notes ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Notes</w:t></w:r></w:p><w:p><w:r><w:t>${report.custom_notes}</w:t></w:r></w:p>` : ''}
  `

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>${bodyContent}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>
</w:document>`
}
