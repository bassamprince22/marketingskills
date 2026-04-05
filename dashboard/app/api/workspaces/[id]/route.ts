import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getServiceClient()

  // Only update fields that are present in the body
  const allowed = [
    'name', 'tiktok_token', 'instagram_token', 'instagram_user_id',
    'linkedin_token', 'linkedin_person_id', 'buffer_token',
    'higgsfield_api_key', 'higgsfield_avatar_id', 'brand_colors',
    'niche_hashtags_tiktok', 'niche_hashtags_instagram',
    'content_mix_broll', 'content_mix_avatar', 'content_mix_real',
    'automation_enabled',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceClient()
  const { error } = await db.from('workspaces').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
