import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const APP_ID       = process.env.META_APP_ID ?? ''
const APP_SECRET   = process.env.META_APP_SECRET ?? ''
const REDIRECT_URI = 'https://marketingskills-3t9r.vercel.app/api/sales/integrations/meta/callback'
const WEBHOOK_URL  = 'https://marketingskills-3t9r.vercel.app/api/sales/integrations/meta/webhook'
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'fadaa_meta_verify'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.redirect(new URL('/sales/login', req.url))

  const code  = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/sales/integrations?error=facebook_denied', req.url))
  }

  // Step 1: Exchange code for short-lived user token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?client_id=${APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&client_secret=${APP_SECRET}` +
    `&code=${encodeURIComponent(code)}`
  )
  const tokenData = await tokenRes.json()
  if (tokenData.error) {
    const msg = encodeURIComponent(tokenData.error.message ?? tokenData.error.type ?? 'token_exchange')
    return NextResponse.redirect(new URL(`/sales/integrations?error=${msg}`, req.url))
  }
  const shortToken = tokenData.access_token

  // Step 2: Exchange for long-lived token (60 days → permanent page tokens)
  const longTokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}` +
    `&client_secret=${APP_SECRET}` +
    `&fb_exchange_token=${shortToken}`
  )
  const longTokenData = await longTokenRes.json()
  const userToken = longTokenData.access_token ?? shortToken
  const tokenExpiry = longTokenData.expires_in
    ? new Date(Date.now() + longTokenData.expires_in * 1000).toISOString()
    : null

  // Step 3: Get pages using long-lived token (page tokens are permanent)
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userToken}`
  )
  const pagesData = await pagesRes.json()
  const pages = pagesData.data ?? []

  // Step 4: Subscribe each page to leadgen webhook
  for (const page of pages) {
    await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed_fields: ['leadgen'], access_token: page.access_token }),
    })
  }

  // Step 5: Register app-level webhook subscription
  await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      object: 'page', callback_url: WEBHOOK_URL, fields: 'leadgen',
      verify_token: VERIFY_TOKEN, access_token: `${APP_ID}|${APP_SECRET}`,
    }),
  })

  // Step 6: Save to DB
  const db = getServiceClient()

  const { error: upsertErr } = await db.from('sales_integrations').upsert({
    type:      'meta',
    is_active: true,
    config: {
      user_token:        userToken,
      token_expiry:      tokenExpiry,
      pages,
      page_access_token: pages[0]?.access_token ?? null,
      connected_at:      new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'type' })

  if (upsertErr) {
    const msg = encodeURIComponent(`DB save failed: ${upsertErr.message}`)
    return NextResponse.redirect(new URL(`/sales/integrations?error=${msg}`, req.url))
  }

  return NextResponse.redirect(new URL('/sales/integrations?connected=meta', req.url))
}
