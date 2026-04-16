import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const BUCKET      = 'sales-config'
const CONFIG_FILE = 'meta-integration.json'

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
  const blob = new Blob([JSON.stringify(value)], { type: 'application/json' })
  await db.storage
    .from(BUCKET)
    .upload(file, blob, { upsert: true, contentType: 'application/json' })
}

// POST — manually add a Facebook page by its ID
// Falls back to fetching /{page_id}?fields=access_token when /me/accounts
// doesn't return the page (common for Business Manager-owned pages).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { page_id } = await req.json() as { page_id: string }
  if (!page_id || !/^\d+$/.test(page_id.trim())) {
    return NextResponse.json({ error: 'Enter a numeric Facebook Page ID' }, { status: 400 })
  }
  const cleanId = page_id.trim()

  const db = getServiceClient()
  const config = await readJson(db, CONFIG_FILE)
  if (!config?.is_active) {
    return NextResponse.json({ error: 'Meta not connected — connect Facebook first' }, { status: 400 })
  }

  const userToken: string | undefined = config.config?.user_token
  if (!userToken) {
    return NextResponse.json({ error: 'User token missing — please reconnect Facebook' }, { status: 400 })
  }

  // Fetch the page directly using the stored user token.
  // This works for business-managed pages that don't show up in /me/accounts
  // as long as the user has ANY role on them.
  const pageRes = await fetch(
    `https://graph.facebook.com/v19.0/${cleanId}?fields=id,name,access_token&access_token=${userToken}`
  )
  const pageData = await pageRes.json() as {
    id?: string
    name?: string
    access_token?: string
    error?: { message: string; type?: string; code?: number }
  }

  if (pageData.error) {
    return NextResponse.json({
      error: `Facebook: ${pageData.error.message}`,
      hint: 'Make sure the user who connected has an Admin or Editor role on this page (check Meta Business Settings → Pages → People).',
    }, { status: 400 })
  }

  if (!pageData.access_token || !pageData.id || !pageData.name) {
    return NextResponse.json({
      error: 'Facebook returned no page access token',
      hint: 'Your user needs an Admin or Editor role on this page. In Meta Business Settings, open Pages → Fadaa Marketing → People and add yourself as Admin.',
    }, { status: 400 })
  }

  // Subscribe this page to the leadgen webhook
  const subRes = await fetch(`https://graph.facebook.com/v19.0/${pageData.id}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscribed_fields: ['leadgen'], access_token: pageData.access_token }),
  })
  const subData = await subRes.json() as { success?: boolean; error?: { message: string } }
  if (subData.error) {
    return NextResponse.json({
      error: `Webhook subscribe failed: ${subData.error.message}`,
    }, { status: 400 })
  }

  // Dedupe & merge into stored pages
  const existing = (config.config?.pages as { id: string; name: string; access_token: string }[] | undefined) ?? []
  const newPages = [
    ...existing.filter(p => p.id !== pageData.id),
    { id: pageData.id, name: pageData.name, access_token: pageData.access_token },
  ]

  await writeJson(db, CONFIG_FILE, {
    ...config,
    config: {
      ...config.config,
      pages:             newPages,
      page_access_token: config.config?.page_access_token ?? pageData.access_token,
    },
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, page: { id: pageData.id, name: pageData.name } })
}
