import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role === 'rep') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids, action, value } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  if (!['assign', 'stage'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const db = getServiceClient()

  if (action === 'assign') {
    const repId = value === 'null' || value === null ? null : value
    const { error } = await db.from('sales_leads').update({ assigned_rep_id: repId }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await db.from('sales_leads').update({ pipeline_stage: value }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updated: ids.length })
}
