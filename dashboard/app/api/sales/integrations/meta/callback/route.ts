import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import {
  getMetaCallbackUrl,
  getMetaWebhookUrl,
  markMetaConnected,
  type MetaIntegrationRecord,
  writeMetaIntegration,
} from '@/lib/sales/metaIntegration'

const APP_ID = process.env.META_APP_ID ?? ''
const APP_SECRET = process.env.META_APP_SECRET ?? ''
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'fadaa_meta_verify'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.redirect(new URL('/sales/login', req.url))

  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/sales/integrations?error=facebook_denied', req.url))
  }

  const origin = new URL(req.url).origin
  const redirectUrl = getMetaCallbackUrl(origin)
  const webhookUrl = getMetaWebhookUrl(origin)

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
      `&client_secret=${APP_SECRET}` +
      `&code=${encodeURIComponent(code)}`,
    { cache: 'no-store' }
  )
  const tokenData = await tokenRes.json()
  if (tokenData.error) {
    const msg = encodeURIComponent(tokenData.error.message ?? tokenData.error.type ?? 'token_exchange')
    return NextResponse.redirect(new URL(`/sales/integrations?error=${msg}`, req.url))
  }
  const shortToken = tokenData.access_token

  const longTokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${APP_ID}` +
      `&client_secret=${APP_SECRET}` +
      `&fb_exchange_token=${shortToken}`,
    { cache: 'no-store' }
  )
  const longTokenData = await longTokenRes.json()
  const userToken = longTokenData.access_token ?? shortToken
  const tokenExpiry = longTokenData.expires_in
    ? new Date(Date.now() + longTokenData.expires_in * 1000).toISOString()
    : null

  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userToken}`,
    { cache: 'no-store' }
  )
  const pagesData = await pagesRes.json()
  if (pagesData.error) {
    const msg = encodeURIComponent(pagesData.error.message ?? 'page_fetch_failed')
    return NextResponse.redirect(new URL(`/sales/integrations?error=${msg}`, req.url))
  }

  const pages = pagesData.data ?? []

  for (const page of pages) {
    await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: page.access_token,
      }),
      cache: 'no-store',
    })
  }

  await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      object: 'page',
      callback_url: webhookUrl,
      fields: 'leadgen',
      verify_token: VERIFY_TOKEN,
      access_token: `${APP_ID}|${APP_SECRET}`,
    }),
    cache: 'no-store',
  })

  const integration: MetaIntegrationRecord = {
    type: 'meta',
    is_active: true,
    config: {
      user_token: userToken,
      token_expiry: tokenExpiry,
      pages,
      page_access_token: pages[0]?.access_token ?? null,
      connected_at: new Date().toISOString(),
      default_page_id: pages[0]?.id ?? null,
      last_sync_at: null,
      last_sync_source: null,
      sync_stats: {
        total_imported: 0,
        total_updated: 0,
      },
    },
    updated_at: new Date().toISOString(),
  }

  try {
    const db = getServiceClient()
    await writeMetaIntegration(db, integration)
    await markMetaConnected(db, integration)
  } catch (storageError) {
    const msg = encodeURIComponent(
      `Storage save failed: ${storageError instanceof Error ? storageError.message : 'unknown'}`
    )
    return NextResponse.redirect(new URL(`/sales/integrations?error=${msg}`, req.url))
  }

  return NextResponse.redirect(new URL('/sales/integrations?connected=meta', req.url))
}
