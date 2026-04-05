import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ config: data ?? null })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { workspace_id, ...rest } = body

  if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const db = getServiceClient()

  // Also handle workspace-level fields (automation_enabled, brand_colors, hashtags)
  const workspaceFields = [
    'automation_enabled', 'brand_colors', 'niche_hashtags_tiktok',
    'niche_hashtags_instagram', 'content_mix_broll', 'content_mix_avatar', 'content_mix_real',
  ]
  const workspaceUpdates: Record<string, unknown> = {}
  const configUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const [k, v] of Object.entries(rest)) {
    if (workspaceFields.includes(k)) workspaceUpdates[k] = v
    else configUpdates[k] = v
  }

  const promises: Promise<unknown>[] = []

  if (Object.keys(workspaceUpdates).length > 0) {
    promises.push(
      db.from('workspaces').update(workspaceUpdates).eq('id', workspace_id)
    )
  }

  if (Object.keys(configUpdates).length > 1) {
    promises.push(
      db.from('config').upsert({ workspace_id, ...configUpdates }, { onConflict: 'workspace_id' })
    )
  }

  await Promise.all(promises)
  return NextResponse.json({ ok: true })
}
