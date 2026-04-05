import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id')
  const limit = Number(searchParams.get('limit') ?? 20)

  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('trends')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trends: data })
}
