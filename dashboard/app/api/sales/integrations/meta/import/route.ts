import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const BUCKET      = 'sales-config'
const CONFIG_FILE = 'meta-integration.json'
const LOGS_FILE   = 'meta-logs.json'

async function readJson(db: ReturnType<typeof getServiceClient>, file: string) {
  const { data, error } = await db.storage.from(BUCKET).download(file)
  if (error || !data) return null
  try {
    const text = await data.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function writeJson(db: ReturnType<typeof getServiceClient>, file: string, value: unknown) {
  try {
    const blob = new Blob([JSON.stringify(value)], { type: 'application/json' })
    await db.storage.from(BUCKET).upload(file, blob, { upsert: true, contentType: 'application/json' })
  } catch {
    // non-critical
  }
}

async function appendLog(db: ReturnType<typeof getServiceClient>, log: Record<string, unknown>) {
  try {
    const existing = (await readJson(db, LOGS_FILE)) ?? []
    const updated = [
      { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...log },
      ...existing,
    ].slice(0, 200)
    await writeJson(db, LOGS_FILE, updated)
  } catch {
    // non-critical
  }
}

async function touchLastSync(db: ReturnType<typeof getServiceClient>, extra: Record<string, unknown> = {}) {
  try {
    const current = await readJson(db, CONFIG_FILE)
    if (!current) return
    const prevStats = (current.config?.sync_stats ?? {}) as Record<string, number>
    const totalImported = (prevStats.total_imported ?? 0) + ((extra.imported as number) ?? 0)
    await writeJson(db, CONFIG_FILE, {
      ...current,
      config: {
        ...current.config,
        last_sync_at:     new Date().toISOString(),
        last_sync_source: extra.source ?? 'manual',
        sync_stats:       { ...prevStats, total_imported: totalImported },
      },
      updated_at: new Date().toISOString(),
    })
  } catch {
    // non-critical
  }
}

function formatFieldsAsNotes(
  fields: Record<string, string>,
  meta: { ad_name?: string | null; form_id?: string | null; form_name?: string | null },
): string {
  const lines: string[] = []
  if (meta.ad_name)   lines.push(`Ad: ${meta.ad_name}`)
  if (meta.form_name) lines.push(`Form: ${meta.form_name}`)
  if (meta.form_id)   lines.push(`Form ID: ${meta.form_id}`)
  if (lines.length > 0) lines.push('—')
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    lines.push(`${label}: ${value}`)
  }
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role, id: userId } = session.user as { role: string; id: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()

  const integration = await readJson(db, CONFIG_FILE)
  if (!integration?.is_active) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  const allPages = (integration.config?.pages as { id: string; name: string; access_token: string }[]) ?? []
  if (allPages.length === 0) return NextResponse.json({ error: 'No connected pages found' }, { status: 400 })

  const filterPageId = req.nextUrl.searchParams.get('page_id')
  const pages = filterPageId && filterPageId !== 'all'
    ? allPages.filter(p => p.id === filterPageId)
    : allPages

  if (pages.length === 0) return NextResponse.json({ error: 'Selected page not found' }, { status: 400 })

  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  let total = 0
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const page of pages) {
    const token = page.access_token
    if (!token) continue

    const formsRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}/leadgen_forms?fields=id,name&access_token=${token}`,
    )
    const formsData = await formsRes.json()
    if (formsData.error) {
      errors.push(`${page.name}: ${formsData.error.message}`)
      continue
    }
    const forms = formsData.data ?? []

    for (const form of forms) {
      const leadsRes = await fetch(
        `https://graph.facebook.com/v19.0/${form.id}/leads?fields=id,field_data,created_time,ad_name` +
        `&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${since}}]` +
        `&limit=100&access_token=${token}`,
      )
      const leadsData = await leadsRes.json()
      if (leadsData.error) {
        errors.push(`${form.name}: ${leadsData.error.message}`)
        continue
      }
      const leads = leadsData.data ?? []
      total += leads.length

      for (const lead of leads) {
        const fields: Record<string, string> = {}
        for (const f of lead.field_data ?? []) {
          fields[f.name] = f.values?.[0] ?? ''
        }

        const name  = fields.full_name || fields.name || fields.first_name || 'Unknown'
        const email = fields.email || ''
        const phone = fields.phone_number || fields.phone || ''

        if (!email && !phone) { skipped++; continue }

        const { data: existing } = await db
          .from('sales_leads')
          .select('id')
          .or(
            [email ? `email.eq.${email}` : null, phone ? `phone.eq.${phone}` : null]
              .filter(Boolean).join(','),
          )
          .maybeSingle()

        if (existing) { skipped++; continue }

        const notes = formatFieldsAsNotes(fields, {
          ad_name:   lead.ad_name ?? null,
          form_id:   form.id      ?? null,
          form_name: form.name    ?? null,
        })

        const { data: inserted, error: insertErr } = await db
          .from('sales_leads')
          .insert({
            contact_person: name,
            email,
            phone,
            company_name:   name,
            lead_source:    'meta',
            pipeline_stage: 'new_lead',
            service_type:   'marketing',
            priority:       'medium',
            created_by:     userId,
            notes,
          })
          .select('id')
          .single()

        if (insertErr || !inserted) {
          skipped++
          errors.push(insertErr?.message ?? 'insert failed')
          continue
        }

        // Best-effort: write the raw payload JSON if the column exists
        try {
          await db.from('sales_leads').update({
            meta_raw_payload: {
              fields,
              ad_name:   lead.ad_name ?? null,
              form_id:   form.id      ?? null,
              form_name: form.name    ?? null,
            },
          }).eq('id', inserted.id)
        } catch {
          // column may not exist — fine, notes already has the data
        }

        imported++
      }
    }
  }

  await appendLog(db, {
    integration_type: 'meta',
    event_type:       'manual_import',
    status:           errors.length > 0 && imported === 0 ? 'error' : 'success',
    error_message:    errors.length > 0 ? errors.slice(0, 3).join(' | ') : null,
    payload:          { total, imported, skipped, period_days: 30, page_filter: filterPageId ?? 'all' },
  })

  await touchLastSync(db, { source: 'manual_import', imported })

  return NextResponse.json({ total, imported, skipped, errors: errors.slice(0, 5) })
}
