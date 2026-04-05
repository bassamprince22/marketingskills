import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const db = getServiceClient()
  const { data, error } = await db
    .from('workspaces')
    .select('id, name, automation_enabled, brand_colors, niche_hashtags_tiktok, niche_hashtags_instagram, content_mix_broll, content_mix_avatar, content_mix_real, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('GET /api/workspaces error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ workspaces: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const body = await req.json()
  const db = getServiceClient()

  const { data, error } = await db
    .from('workspaces')
    .insert({
      name: body.name,
      tiktok_token: body.tiktok_token || null,
      instagram_token: body.instagram_token || null,
      instagram_user_id: body.instagram_user_id || null,
      linkedin_token: body.linkedin_token || null,
      linkedin_person_id: body.linkedin_person_id || null,
      buffer_token: body.buffer_token || null,
      higgsfield_api_key: body.higgsfield_api_key || null,
      higgsfield_avatar_id: body.higgsfield_avatar_id || null,
      brand_colors: body.brand_colors || '#6366f1,#8b5cf6',
      automation_enabled: body.automation_enabled ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('POST /api/workspaces error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ workspace: data }, { status: 201 })
}
