import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { extractMetaLeadIdentity, isUnknownLeadValue } from '@/lib/sales/meta'

const fmtKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

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

async function appendLog(db: ReturnType<typeof getServiceClient>, log: Record<string, unknown>) {
  try {
    const existing = (await readJson(db, LOGS_FILE)) ?? []
    const updated = [
      { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...log },
      ...existing,
    ].slice(0, 100)
    const blob = new Blob([JSON.stringify(updated)], { type: 'application/json' })
    await db.storage
      .from(BUCKET)
      .upload(LOGS_FILE, blob, { upsert: true, contentType: 'application/json' })
  } catch {
    // non-critical
  }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role, id: userId } = session.user as { role: string; id: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()

  // Get stored integration + page tokens from Storage
  const integration = await readJson(db, CONFIG_FILE)
  if (!integration?.is_active) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  const pages = (integration.config?.pages as { id: string; name: string; access_token: string }[]) ?? []
  if (pages.length === 0) return NextResponse.json({ error: 'No connected pages found' }, { status: 400 })

  // Capture the exact moment this import was triggered (unix seconds)
  const importedAt = Math.floor(Date.now() / 1000)
  const since      = importedAt - 30 * 24 * 60 * 60  // exactly 30 days back to the minute

  let total    = 0
  let imported = 0
  let skipped  = 0

  for (const page of pages) {
    const token = page.access_token
    if (!token) continue

    const formsRes  = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}/leadgen_forms?fields=id,name&access_token=${token}`
    )
    const formsData = await formsRes.json()
    const forms     = formsData.data ?? []

    for (const form of forms) {
      // Fetch leads from (now − 30 days) up to (now), to the exact minute
      const filtering = JSON.stringify([
        { field: 'time_created', operator: 'GREATER_THAN',          value: since      },
        { field: 'time_created', operator: 'LESS_THAN_OR_EQUAL',    value: importedAt },
      ])
      const leadsRes  = await fetch(
        `https://graph.facebook.com/v19.0/${form.id}/leads?fields=id,field_data,created_time,ad_name` +
        `&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${token}`
      )
      const leadsData = await leadsRes.json()
      const leads     = leadsData.data ?? []
      total += leads.length

      for (const lead of leads) {
        const fields: Record<string, string> = {}
        for (const f of lead.field_data ?? []) {
          fields[f.name] = f.values?.[0] ?? ''
        }

        const identity    = extractMetaLeadIdentity({ fields })
        const name        = identity.contactPerson ?? identity.companyName ?? 'Meta Lead'
        const companyName = identity.companyName ?? name
        const email       = identity.email ?? ''
        const phone       = identity.phone ?? ''

        if (!email && !phone) { skipped++; continue }

        const qaLines = Object.entries(fields).filter(([, v]) => v.trim()).map(([k, v]) => `${fmtKey(k)}: ${v}`)
        const notes   = [
          ...qaLines,
          '',
          `Form: ${form.name}`,
          `Ad: ${lead.ad_name ?? '—'}`,
        ].join('\n').trim()

        const metaPayload = {
          fields,
          ad_name:   lead.ad_name ?? null,
          form_id:   null,
          form_name: form.name ?? null,
        }

        // Dedup by email or phone — update stale fields on match, never duplicate
        const { data: existing } = await db
          .from('sales_leads')
          .select('id, notes, company_name, contact_person')
          .or(
            [email ? `email.eq.${email}` : null, phone ? `phone.eq.${phone}` : null]
              .filter(Boolean).join(',')
          )
          .maybeSingle()

        if (existing) {
          const updates: Record<string, unknown> = { notes }
          if (isUnknownLeadValue(existing.contact_person) && name !== 'Meta Lead')
            updates.contact_person = name
          if (isUnknownLeadValue(existing.company_name) && companyName !== 'Meta Lead')
            updates.company_name = companyName
          await db.from('sales_leads').update(updates).eq('id', existing.id)
          // Best-effort payload update (column may not exist yet)
          await db.from('sales_leads').update({ meta_raw_payload: metaPayload }).eq('id', existing.id)
          skipped++
          continue
        }

        // Insert core fields first — guaranteed columns
        const { data: newLead, error: insertErr } = await db.from('sales_leads').insert({
          contact_person:  name,
          email,
          phone,
          company_name:    companyName,
          lead_source:     'meta',
          pipeline_stage:  'new_lead',
          service_type:    'marketing',
          priority:        'medium',
          notes,
        }).select('id').single()

        if (insertErr) { skipped++; continue }

        // Best-effort: attach raw payload separately
        await db.from('sales_leads').update({ meta_raw_payload: metaPayload }).eq('id', newLead.id)
        imported++
      }
    }
  }

  await appendLog(db, {
    integration_type: 'meta',
    event_type:       'manual_import',
    status:           'success',
    error_message:    null,
    payload:          { total, imported, skipped, period_days: 30, imported_at: new Date(importedAt * 1000).toISOString() },
  })

  return NextResponse.json({ total, imported, skipped })
}
