import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getWebhookRepairWindow, processMetaWebhookLead, syncMetaWindow } from '@/lib/sales/metaIntegration'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'fadaa_meta_verify'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body.object !== 'page') return NextResponse.json({ ok: true })

  const db = getServiceClient()
  const repairResults = new Map<string, { ok: boolean; message?: string }>()
  const failures: Array<{ leadgenId: string; pageId: string; reason: string }> = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const leadgenId = change.value?.leadgen_id
      const pageId = change.value?.page_id
      if (!leadgenId || !pageId) continue

      const outcome = await processMetaWebhookLead(db, { leadgenId, pageId })
      if (outcome.action !== 'failed') continue

      if (!repairResults.has(pageId)) {
        try {
          const repairWindow = getWebhookRepairWindow()
          const repair = await syncMetaWindow(db, {
            source: 'webhook',
            pageId,
            since: repairWindow.since,
            until: repairWindow.until,
          })
          repairResults.set(pageId, {
            ok: repair.imported > 0 || repair.updated > 0,
            message: repair.imported > 0 || repair.updated > 0
              ? `Recovered via repair sync (${repair.imported} imported, ${repair.updated} updated).`
              : 'Repair sync completed but did not recover any recent leads.',
          })
        } catch (error) {
          repairResults.set(pageId, {
            ok: false,
            message: error instanceof Error ? error.message : 'Webhook repair sync failed.',
          })
        }
      }

      const repairResult = repairResults.get(pageId)
      if (repairResult?.ok) continue

      failures.push({
        leadgenId,
        pageId,
        reason: repairResult?.message ?? (outcome.reason || 'Meta webhook processing failed.'),
      })
    }
  }

  // Always return 200 — Meta disables the webhook after repeated non-200 responses.
  // Failures are logged internally; Meta will not retry successfully-acknowledged events.
  return NextResponse.json({ ok: true, failures: failures.length > 0 ? failures : undefined })
}
