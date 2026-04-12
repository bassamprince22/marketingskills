import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const APP_ID      = process.env.META_APP_ID ?? ''
const APP_SECRET  = process.env.META_APP_SECRET ?? ''
// Hardcoded to exactly match the OAuth dialog redirect_uri — NEXTAUTH_URL trailing-slash causes mismatch
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

  // Exchange code for user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`
  )
  const tokenData = await tokenRes.json()
  if (tokenData.error) {
    const msg = encodeURIComponent(tokenData.error.message ?? tokenData.error.type ?? 'token_exchange')
    return NextResponse.redirect(new URL(`/sales/integrations?error=${msg}`, req.url))
  }
  const userToken = tokenData.access_token

  // Get list of pages the user manages
  const pagesRes  = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userToken}`
  )
  const pagesData = await pagesRes.json()
  const pages     = pagesData.data ?? []

  // Subscribe each page to leadgen webhook
  for (const page of pages) {
    // Subscribe page to webhook
    await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: page.access_token,
      }),
    })
  }

  // Subscribe the app to the page leadgen events via Graph API
  await fetch(
    `https://graph.facebook.com/v19.0/${APP_ID}/subscriptions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        object: 'page',
        callback_url: WEBHOOK_URL,
        fields: 'leadgen',
        verify_token: VERIFY_TOKEN,
        access_token: `${APP_ID}|${APP_SECRET}`,
      }),
    }
  )

  // Save to DB
  const db = getServiceClient()
  const { id: userId } = session.user as { id: string }

  await db.from('sales_integrations').upsert({
    type: 'meta',
    is_active: true,
    config: {
      user_token: userToken,
      pages,
      page_access_token: pages[0]?.access_token ?? null,
      connected_at: new Date().toISOString(),
    },
    created_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'type' })

  return NextResponse.redirect(new URL('/sales/integrations?connected=meta', req.url))
}
