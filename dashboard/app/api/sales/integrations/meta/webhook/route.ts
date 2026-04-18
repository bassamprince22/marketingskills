import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getNextAssignee } from '@/lib/sales/autoAssign'

const fmtKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

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

  if (body.object !== 'page') return NextResponse.json({ ok: true })

  // Load integration config from Storage
  const integration = await readJson(db, CONFIG_FILE)
  const defaultPageId = (integration?.config?.default_page_id as string | undefined) ?? null

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const { leadgen_id, page_id } = change.value

      // If a default page is configured, only process events from that page
      if (defaultPageId && page_id !== defaultPageId) continue

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

      const name  = fields.full_name || fields.name || fields.first_name || 'Unknown'
      const email = fields.email || ''
      const phone = fields.phone_number || fields.phone || ''

      // Format every form answer as a readable Q&A block stored in notes
      const qaLines = Object.entries(fields).filter(([, v]) => v.trim()).map(([k, v]) => `${fmtKey(k)}: ${v}`)
      const notes = [
        ...qaLines,
        '',
        `Ad: ${leadData.ad_name ?? '—'}`,
        `Form ID: ${leadData.form_id ?? '—'}`,
      ].join('\n').trim()

      // Auto-assign to next rep if enabled
      const assignedRepId = await getNextAssignee()

      // Build insert payload — meta_raw_payload is optional (requires DB migration)
      const insertPayload: Record<string, unknown> = {
        contact_person: name,
        email,
        phone,
        company_name: name,
        lead_source: 'meta',
        pipeline_stage: 'new_lead',
        service_type: 'marketing',
        priority: 'medium',
        notes,
        ...(assignedRepId ? { assigned_rep_id: assignedRepId } : {}),
      }

      // Insert into sales_leads
      const { data: lead, error: leadErr } = await db
        .from('sales_leads')
        .insert(insertPayload)
        .select('id')
        .single()

      if (leadErr) {
        await appendLog(db, {
          integration_type: 'meta', event_type: 'lead_insert_failed',
          status: 'error', error_message: leadErr.message, payload: { fields },
        })
        continue
      }

      await appendLog(db, {
        integration_type: 'meta', event_type: 'lead_created',
        status: 'success', error_message: null,
        payload: { lead_id: lead.id, name, email, phone },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
