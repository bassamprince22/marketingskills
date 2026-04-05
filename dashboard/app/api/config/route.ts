import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

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
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const body = await req.json()
  const { workspace_id, ...rest } = body

  if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const db = getServiceClient()

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

  if (Object.keys(workspaceUpdates).length > 0) {
    await db.from('workspaces').update(workspaceUpdates).eq('id', workspace_id)
  }

  if (Object.keys(configUpdates).length > 1) {
    await db.from('config').upsert({ workspace_id, ...configUpdates }, { onConflict: 'workspace_id' })
  }

  return NextResponse.json({ ok: true })
}
