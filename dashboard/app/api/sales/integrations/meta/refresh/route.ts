import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const APP_ID       = process.env.META_APP_ID       ?? '1375549184609507'
const APP_SECRET   = process.env.META_APP_SECRET   ?? ''
const WEBHOOK_URL  = 'https://marketingskills-3t9r.vercel.app/api/sales/integrations/meta/webhook'
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'fadaa_meta_verify'
const BUCKET       = 'sales-config'
const CONFIG_FILE  = 'meta-integration.json'
const LOGS_FILE    = 'meta-logs.json'

async function readJson(db: ReturnType<typeof getServiceClient>, file: string) {
  const { data, error } = await db.storage.from(BUCKET).download(file)
  if (error || !data) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}

async function writeJson(db: ReturnType<typeof getServiceClient>, file: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value)], { type: 'application/json' })
  await db.storage.from(BUCKET).upload(file, blob, { upsert: true, contentType: 'application/json' })
}

async function appendLog(db: ReturnType<typeof getServiceClient>, log: Record<string, unknown>) {
  try {
    const existing = (await readJson(db, LOGS_FILE)) ?? []
    const updated  = [{ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...log }, ...existing].slice(0, 100)
    const blob     = new Blob([JSON.stringify(updated)], { type: 'application/json' })
    await db.storage.from(BUCKET).upload(LOGS_FILE, blob, { upsert: true, contentType: 'application/json' })
  } catch { /* non-critical */ }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { access_token } = await req.json() as { access_token: string }
  if (!access_token?.trim()) return NextResponse.json({ error: 'access_token is required' }, { status: 400 })

  const db = getServiceClient()
  let userToken = access_token.trim()

  // Step 1: Try to exchange for a long-lived token (60 days → page tokens are permanent)
  if (APP_SECRET) {
    try {
      const res  = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token` +
        `?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${userToken}`
      )
      const data = await res.json()
      if (data.access_token) userToken = data.access_token
    } catch { /* use original token */ }
  }

  // Step 2: Fetch pages + permanent page access tokens
  const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userToken}`)
  const pagesData = await pagesRes.json()

  if (pagesData.error) {
    return NextResponse.json({
      error: `Meta rejected the token: ${pagesData.error.message}`,
      code:  pagesData.error.code,
    }, { status: 400 })
  }

  const pages: { id: string; name: string; access_token: string }[] = pagesData.data ?? []

  // Step 3: Re-subscribe each page to the leadgen webhook
  const subscriptions: { page: string; ok: boolean; error?: string }[] = []
  for (const page of pages) {
    const subRes  = await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscribed_fields: ['leadgen'], access_token: page.access_token }),
    })
    const subData = await subRes.json()
    subscriptions.push({ page: page.name, ok: !!subData.success, error: subData.error?.message })
  }

  // Step 4: Re-register app-level webhook (needs APP_SECRET)
  let appLevelOk = false
  if (APP_SECRET) {
    const appSubRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/subscriptions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        object: 'page', callback_url: WEBHOOK_URL, fields: 'leadgen',
        verify_token: VERIFY_TOKEN, access_token: `${APP_ID}|${APP_SECRET}`,
      }),
    })
    const appSubData = await appSubRes.json()
    appLevelOk = !!appSubData.success
  }

  // Step 5: Merge into existing config (preserve default_page_id and other settings)
  const existing  = await readJson(db, CONFIG_FILE)
  const newConfig = {
    type:      'meta',
    is_active: true,
    config: {
      ...(existing?.config ?? {}),
      user_token:        userToken,
      pages,
      page_access_token: pages[0]?.access_token ?? null,
      refreshed_at:      new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }

  await writeJson(db, CONFIG_FILE, newConfig)
  await appendLog(db, {
    integration_type: 'meta',
    event_type:       'token_refreshed',
    status:           'success',
    payload:          { pages_count: pages.length, app_level_subscription: appLevelOk, subscriptions },
  })

  return NextResponse.json({
    ok:           true,
    pages_count:  pages.length,
    pages:        pages.map(p => ({ id: p.id, name: p.name })),
    subscriptions,
    app_level_ok: appLevelOk,
  })
}
