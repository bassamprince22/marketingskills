import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { destroyUpdate } from '@/lib/buffer'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { update_id, workspace_id } = await req.json()
  if (!update_id || !workspace_id) {
    return NextResponse.json({ error: 'update_id and workspace_id required' }, { status: 400 })
  }

  const db = getServiceClient()
  const { data: ws, error } = await db
    .from('workspaces')
    .select('buffer_token')
    .eq('id', workspace_id)
    .single()

  if (error || !ws?.buffer_token) {
    return NextResponse.json({ error: 'Buffer token not found for workspace' }, { status: 404 })
  }

  try {
    await destroyUpdate(ws.buffer_token, update_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
