import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getNextAssignee } from '@/lib/sales/autoAssign'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'fadaa_meta_verify'
const BUCKET       = 'sales-config'
const CONFIG_FILE  = 'meta-integration.json'
const LOGS_FILE    = 'meta-logs.json'

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

// Bump the integration config's last_sync_at timestamp
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
        last_sync_at: new Date().toISOString(),
        last_sync_source: extra.source ?? 'webhook',
        sync_stats: { ...prevStats, total_imported: totalImported },
      },
      updated_at: new Date().toISOString(),
    })
  } catch {
    // non-critical
  }
}

function formatFieldsAsNotes(fields: Record<string, string>, meta: { ad_name?: string | null; form_id?: string | null; form_name?: string | null }): string {
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

// ── GET: Facebook webhook verification ───────────
export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams
  const mode      = sp.get('hub.mode')
  const token     = sp.get('hub.verify_token')
  const challenge = sp.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    console.log('Meta webhook verified')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
  console.log('Meta webhook verification failed', { mode, token, expected: VERIFY_TOKEN })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// ── POST: Receive lead events ─────────────────────
export async function POST(req: NextRequest) {
  const db   = getServiceClient()
  const body = await req.json()

  // Always log that we received a webhook event
  await appendLog(db, {
    integration_type: 'meta',
    event_type:       'webhook_received',
    status:           'info',
    error_message:    null,
    payload:          { object: body.object, entries: body.entry?.length ?? 0 },
  })

  if (body.object !== 'page') return NextResponse.json({ ok: true })

  // Load integration config from Storage
  const integration = await readJson(db, CONFIG_FILE)
  const defaultPageId = (integration?.config?.default_page_id as string | undefined) ?? null

  let importedCount = 0

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const { leadgen_id, page_id } = change.value

      // If a default page is configured, only process events from that page
      if (defaultPageId && page_id !== defaultPageId) {
        await appendLog(db, {
          integration_type: 'meta', event_type: 'webhook_skipped_wrong_page',
          status: 'info', error_message: null,
          payload: { leadgen_id, page_id, default_page_id: defaultPageId },
        })
        continue
      }

      const pages = integration?.config?.pages as { id: string; access_token: string }[] | undefined
      const pageToken =
        pages?.find((p) => p.id === page_id)?.access_token ??
        integration?.config?.page_access_token

      if (!pageToken) {
        await appendLog(db, {
          integration_type: 'meta', event_type: 'lead_fetch_failed',
          status: 'error', error_message: 'No page access token found',
          payload: { leadgen_id, page_id },
        })
        continue
      }

      // Fetch full lead data from Meta Graph API
      const leadRes = await fetch(
        `https://graph.facebook.com/v19.0/${leadgen_id}?fields=field_data,created_time,ad_name,form_id&access_token=${pageToken}`
      )
      const leadData = await leadRes.json()

      if (leadData.error) {
        await appendLog(db, {
          integration_type: 'meta', event_type: 'lead_fetch_failed',
          status: 'error', error_message: leadData.error.message, payload: leadData,
        })
        continue
      }

      // Parse field_data into named fields
      const fields: Record<string, string> = {}
      for (const f of leadData.field_data ?? []) {
        fields[f.name] = f.values?.[0] ?? ''
      }

      const firstName   = fields.first_name || ''
      const lastName    = fields.last_name  || ''
      const contactName = fields.full_name || fields.name
        || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName)
        || (fields.email ? fields.email.split('@')[0] : '')
        || 'Meta Lead'
      const company = fields.company_name || fields.company || fields.organization || contactName
      const email = fields.email || ''
      const phone = fields.phone_number || fields.phone || ''

      // Dedupe by email or phone
      if (email || phone) {
        const filter = [email ? `email.eq.${email}` : null, phone ? `phone.eq.${phone}` : null]
          .filter(Boolean).join(',')
        const { data: existing } = await db.from('sales_leads').select('id').or(filter).maybeSingle()
        if (existing) {
          await appendLog(db, {
            integration_type: 'meta', event_type: 'lead_duplicate_skipped',
            status: 'info', error_message: null,
            payload: { lead_id: existing.id, email, phone },
          })
          continue
        }
      }

      // Auto-assign to next rep if enabled (don't let this block the insert)
      let assignedRepId: string | null = null
      try {
        assignedRepId = await getNextAssignee()
      } catch {
        assignedRepId = null
      }

      const notes = formatFieldsAsNotes(fields, {
        ad_name:   leadData.ad_name   ?? null,
        form_id:   leadData.form_id   ?? null,
        form_name: null,
      })

      // Insert into sales_leads (without meta_raw_payload — store Q&A in notes so we never fail on schema)
      const { data: lead, error: leadErr } = await db
        .from('sales_leads')
        .insert({
          contact_person: contactName,
          email,
          phone,
          company_name: company,
          lead_source: 'meta',
          pipeline_stage: 'new_lead',
          service_type: 'marketing',
          priority: 'medium',
          notes,
          ...(assignedRepId ? { assigned_rep_id: assignedRepId } : {}),
        })
        .select('id')
        .single()

      if (leadErr) {
        await appendLog(db, {
          integration_type: 'meta', event_type: 'lead_insert_failed',
          status: 'error', error_message: leadErr.message, payload: { fields },
        })
        continue
      }

      // Best-effort: try to also store the raw payload in the JSONB column if it exists
      try {
        await db.from('sales_leads').update({
          meta_raw_payload: {
            fields,
            ad_name:   leadData.ad_name   ?? null,
            form_id:   leadData.form_id   ?? null,
            form_name: null,
          },
        }).eq('id', lead.id)
      } catch {
        // column may not exist — fine, notes already has the data
      }

      importedCount++
      await appendLog(db, {
        integration_type: 'meta', event_type: 'lead_created',
        status: 'success', error_message: null,
        payload: { lead_id: lead.id, name, email, phone, ad_name: leadData.ad_name },
      })
    }
  }

  if (importedCount > 0) {
    await touchLastSync(db, { source: 'webhook', imported: importedCount })
  } else {
    // Still update "last received" so UI shows webhooks are flowing
    await touchLastSync(db, { source: 'webhook', imported: 0 })
  }

  return NextResponse.json({ ok: true, imported: importedCount })
}
