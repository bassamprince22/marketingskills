import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { getServiceClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const body = await req.json()
  const db = getServiceClient()

  const allowed = [
    'name', 'tiktok_token', 'instagram_token', 'instagram_user_id',
    'linkedin_token', 'linkedin_person_id', 'buffer_token',
    'higgsfield_api_key', 'higgsfield_avatar_id', 'brand_colors',
    'niche_hashtags_tiktok', 'niche_hashtags_instagram',
    'content_mix_broll', 'content_mix_avatar', 'content_mix_real',
    'automation_enabled',
  ]
  const credentialKeys = [
    'tiktok_token', 'instagram_token', 'instagram_user_id',
    'linkedin_token', 'linkedin_person_id', 'buffer_token',
    'higgsfield_api_key', 'higgsfield_avatar_id',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (!(key in body)) continue
    // Skip credential fields if blank — means "keep existing value"
    if (credentialKeys.includes(key) && !body[key]) continue
    updates[key] = body[key]
  }

  const { data, error } = await db
    .from('workspaces')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ workspace: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const db = getServiceClient()
  const { error } = await db.from('workspaces').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
