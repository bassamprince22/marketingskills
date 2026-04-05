import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('workspaces')
      .select('id, name, buffer_token, higgsfield_api_key, instagram_token, linkedin_token, tiktok_token, created_at')
      .limit(5)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 })
    }

    // Show which fields are saved without exposing actual values
    const summary = (data ?? []).map((ws) => ({
      id: ws.id,
      name: ws.name,
      buffer_token: ws.buffer_token ? '✓ saved' : 'empty',
      higgsfield_api_key: ws.higgsfield_api_key ? '✓ saved' : 'empty',
      instagram_token: ws.instagram_token ? '✓ saved' : 'empty',
      linkedin_token: ws.linkedin_token ? '✓ saved' : 'empty',
      tiktok_token: ws.tiktok_token ? '✓ saved' : 'empty',
    }))

    return NextResponse.json({ ok: true, workspaces: summary })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
