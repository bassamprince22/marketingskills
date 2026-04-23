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
  try { return JSON.parse(await data.text()) } catch { return null }
}

async function appendLog(db: ReturnType<typeof getServiceClient>, log: Record<string, unknown>) {
  try {
    const existing = (await readJson(db, LOGS_FILE)) ?? []
    const updated  = [{ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...log }, ...existing].slice(0, 100)
    const blob     = new Blob([JSON.stringify(updated)], { type: 'application/json' })
    await db.storage.from(BUCKET).upload(LOGS_FILE, blob, { upsert: true, contentType: 'application/json' })
  } catch { /* non-critical */ }
}

async function fetchLead(leadgen_id: string, token: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${leadgen_id}?fields=field_data,created_time,ad_name,form_id&access_token=${token}`
  )
  return res.json()
}

// ── GET: Facebook webhook verification ───────────────────────────────────
export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams
  const mode      = sp.get('hub.mode')
  const token     = sp.get('hub.verify_token')
  const challenge = sp.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// ── POST: Receive lead events ─────────────────────────────────────────────
// IMPORTANT: Always return 200 — Meta disables the webhook after too many non-200 responses
export async function POST(req: NextRequest) {
  try {
    const db   = getServiceClient()
    const body = await req.json()

    if (body.object !== 'page') return NextResponse.json({ ok: true })

    const integration   = await readJson(db, CONFIG_FILE)
    const defaultPageId = (integration?.config?.default_page_id as string | undefined) ?? null
    const storedPages   = (integration?.config?.pages as { id: string; access_token: string }[] | undefined) ?? []
    const userToken     = (integration?.config?.user_token as string | undefined) ?? null

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue

        const { leadgen_id, page_id } = change.value as { leadgen_id: string; page_id: string }

        // If a default page is set, only process that page
        if (defaultPageId && page_id !== defaultPageId) continue

        // Find token — page token first, fall back to stored user token
        const pageToken = storedPages.find(p => p.id === page_id)?.access_token
          ?? integration?.config?.page_access_token as string | undefined
          ?? userToken

        if (!pageToken) {
          await appendLog(db, {
            integration_type: 'meta', event_type: 'lead_fetch_failed',
            status: 'error',
            error_message: 'No access token found — go to Integrations and click "Refresh Token".',
            payload: { leadgen_id, page_id },
          })
          continue
        }

        // Fetch lead data — try page token, fall back to user token if 190/102 error
        let leadData = await fetchLead(leadgen_id, pageToken)

        if (leadData.error && userToken && userToken !== pageToken) {
          leadData = await fetchLead(leadgen_id, userToken)
        }

        if (leadData.error) {
          await appendLog(db, {
            integration_type: 'meta', event_type: 'lead_fetch_failed',
            status: 'error',
            error_message: `Meta API ${leadData.error.code}: ${leadData.error.message}. Refresh token in Integrations.`,
            payload: { leadgen_id, page_id, meta_error: leadData.error },
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
        const notes = [
          'Source: Meta Lead Ad',
          leadData.ad_name ? `Ad: ${leadData.ad_name}`       : null,
          leadData.form_id ? `Form ID: ${leadData.form_id}`  : null,
          fields.city      ? `City: ${fields.city}`          : null,
          fields.job_title ? `Job: ${fields.job_title}`      : null,
        ].filter(Boolean).join('\n')

        const assignedRepId = await getNextAssignee()

        const { data: lead, error: leadErr } = await db
          .from('sales_leads')
          .insert({
            contact_person: name,
            email,
            phone,
            company_name:   name,
            lead_source:    'meta',
            pipeline_stage: 'new_lead',
            service_type:   'marketing',
            notes,
            priority:       'medium',
            ...(assignedRepId ? { assigned_rep_id: assignedRepId } : {}),
          })
          .select('id')
          .single()

        if (leadErr) {
          await appendLog(db, {
            integration_type: 'meta', event_type: 'lead_insert_failed',
            status: 'error', error_message: leadErr.message,
            payload: { fields },
          })
          continue
        }

        await appendLog(db, {
          integration_type: 'meta', event_type: 'lead_created',
          status: 'success', error_message: null,
          payload: { lead_id: lead.id, name, email, phone, form_id: leadData.form_id },
        })
      }
    }
  } catch (err) {
    // Always return 200 — never let Meta disable the webhook on server errors
    console.error('Webhook processing error:', err)
  }

  return NextResponse.json({ ok: true })
}
