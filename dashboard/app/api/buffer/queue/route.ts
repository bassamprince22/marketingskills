import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { getServiceClient } from '@/lib/supabase'
import { getAllPendingUpdates } from '@/lib/buffer'

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const db = getServiceClient()
  const { data: ws, error } = await db
    .from('workspaces')
    .select('buffer_token')
    .eq('id', workspaceId)
    .single()

  if (error || !ws?.buffer_token) {
    return NextResponse.json({ updates: [] })
  }

  try {
    const updates = await getAllPendingUpdates(ws.buffer_token)
    return NextResponse.json({ updates })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
