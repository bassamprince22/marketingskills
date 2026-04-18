import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createLead, logActivity } from '@/lib/sales/db'
import { getServiceClient } from '@/lib/supabase'
import { getNextAssignee } from '@/lib/sales/autoAssign'

interface ImportRow {
  company_name?:   string
  contact_person?: string
  phone?:          string
  email?:          string
  notes?:          string
  service_type?:   string
  lead_source?:    string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, role } = session.user as { id: string; role: string }
  if (role === 'rep') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { rows, assignedRepId }: { rows: ImportRow[]; assignedRepId?: string } = await req.json()
    if (!rows?.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    if (rows.length > 5000) return NextResponse.json({ error: 'Max 5,000 rows per import' }, { status: 400 })

    const db = getServiceClient()
    let imported = 0
    let failed   = 0
    const errors: { row: number; reason: string }[] = []

    // Check existing emails/phones for dedup
    const emails = rows.map(r => r.email).filter(Boolean)
    const phones = rows.map(r => r.phone).filter(Boolean)
    const { data: existing } = await db
      .from('sales_leads')
      .select('email, phone')
      .or(
        [
          emails.length ? `email.in.(${emails.map(e => `"${e}"`).join(',')})` : null,
          phones.length ? `phone.in.(${phones.map(p => `"${p}"`).join(',')})` : null,
        ].filter(Boolean).join(',')
      )

    const existingEmails = new Set((existing ?? []).map((e: { email: string }) => e.email?.toLowerCase()))
    const existingPhones = new Set((existing ?? []).map((e: { phone: string }) => e.phone))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      // Require at least company name or contact person, plus email or phone
      if (!row.company_name && !row.contact_person) {
        errors.push({ row: i + 1, reason: 'Missing company name or contact person' })
        failed++
        continue
      }
      if (!row.email && !row.phone) {
        errors.push({ row: i + 1, reason: 'Missing both email and phone' })
        failed++
        continue
      }
      // Dedup check
      if (row.email && existingEmails.has(row.email.toLowerCase())) {
        errors.push({ row: i + 1, reason: `Duplicate email: ${row.email}` })
        failed++
        continue
      }
      if (row.phone && existingPhones.has(row.phone)) {
        errors.push({ row: i + 1, reason: `Duplicate phone: ${row.phone}` })
        failed++
        continue
      }
      // CSV injection sanitization
      const sanitize = (v?: string) => {
        if (!v) return v
        return v.replace(/^[=+\-@\t\r]/, "'")
      }

      try {
        const lead = await createLead({
          company_name:    sanitize(row.company_name) ?? row.contact_person ?? 'Unknown',
          contact_person:  sanitize(row.contact_person) ?? row.company_name ?? 'Unknown',
          phone:           sanitize(row.phone),
          email:           sanitize(row.email),
          notes:           sanitize(row.notes),
          service_type:    (row.service_type as any) ?? 'marketing',
          lead_source:     (row.lead_source  as any) ?? 'meta',
          pipeline_stage:  'new_lead',
          assigned_rep_id: assignedRepId || null,
          created_by:      userId,
        })
        await logActivity({
          lead_id:     lead.id,
          user_id:     userId,
          action_type: 'lead_created',
          description: `Imported from CSV: ${lead.company_name}`,
        })
        imported++
      } catch (err) {
        errors.push({ row: i + 1, reason: 'DB insert failed' })
        failed++
      }
    }

    // Log import
    await db.from('sales_csv_imports').insert({
      imported_by:     userId,
      file_name:       'meta_leads_import.csv',
      total_rows:      rows.length,
      imported_rows:   imported,
      failed_rows:     failed,
      assigned_rep_id: assignedRepId || null,
      status:          'complete',
      errors:          errors,
    })

    return NextResponse.json({ imported, failed, errors })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
