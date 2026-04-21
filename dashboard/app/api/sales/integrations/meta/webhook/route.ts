import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { processMetaWebhookLead } from '@/lib/sales/metaIntegration'

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

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const leadgenId = change.value?.leadgen_id
      const pageId = change.value?.page_id
      if (!leadgenId || !pageId) continue

      await processMetaWebhookLead(db, { leadgenId, pageId })
    }
  }

  return NextResponse.json({ ok: true })
}
