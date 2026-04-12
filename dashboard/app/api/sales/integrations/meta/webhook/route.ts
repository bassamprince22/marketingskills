import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'fadaa_meta_verify'
const APP_SECRET   = process.env.META_APP_SECRET ?? ''

// ── GET: Facebook webhook verification ───────────
export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams
  const mode     = sp.get('hub.mode')
  const token    = sp.get('hub.verify_token')
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

  // Log every incoming event
  await db.from('sales_integration_logs').insert({
    integration_type: 'meta',
    event_type: 'webhook_received',
    payload: body,
    status: 'processing',
  })

  if (body.object !== 'page') return NextResponse.json({ ok: true })

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const { leadgen_id, page_id } = change.value

      // Get the stored page access token
      const { data: integration } = await db
        .from('sales_integrations')
        .select('config')
        .eq('type', 'meta')
        .single()

      const pageToken = integration?.config?.pages?.find(
        (p: { id: string }) => p.id === page_id
      )?.access_token ?? integration?.config?.page_access_token

      if (!pageToken) {
        await db.from('sales_integration_logs').insert({
          integration_type: 'meta', event_type: 'lead_fetch_failed',
          payload: { leadgen_id, page_id }, status: 'error',
          error_message: 'No page access token found',
        })
        continue
      }

      // Fetch full lead data from Meta Graph API
      const leadRes = await fetch(
        `https://graph.facebook.com/v19.0/${leadgen_id}?fields=field_data,created_time,ad_name,form_id&access_token=${pageToken}`
      )
      const leadData = await leadRes.json()

      if (leadData.error) {
        await db.from('sales_integration_logs').insert({
          integration_type: 'meta', event_type: 'lead_fetch_failed',
          payload: leadData, status: 'error', error_message: leadData.error.message,
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
      const notes = `Source: Meta Lead Ad\nAd: ${leadData.ad_name ?? '—'}\nForm ID: ${leadData.form_id ?? '—'}`

      // Insert into sales_leads
      const { data: lead, error: leadErr } = await db
        .from('sales_leads')
        .insert({
          contact_person: name,
          email,
          phone,
          company_name: name,
          lead_source: 'meta',
          pipeline_stage: 'new_lead',
          service_type: 'marketing',
          notes,
          priority: 'medium',
        })
        .select('id')
        .single()

      if (leadErr) {
        await db.from('sales_integration_logs').insert({
          integration_type: 'meta', event_type: 'lead_insert_failed',
          payload: { fields }, status: 'error', error_message: leadErr.message,
        })
        continue
      }

      await db.from('sales_integration_logs').insert({
        integration_type: 'meta', event_type: 'lead_created',
        payload: { lead_id: lead.id, name, email, phone }, status: 'success',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
