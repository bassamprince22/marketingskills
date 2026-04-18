import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { logActivity } from '@/lib/sales/db'

// POST /api/sales/leads/bulk
// body: { ids: string[], action: 'assign' | 'stage', value: string | null }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: userId, role } = session.user as { id: string; role: string }
  if (role === 'rep') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { ids: string[]; action: 'assign' | 'stage'; value: string | null }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { ids, action, value } = body
  if (!ids?.length || !action) return NextResponse.json({ error: 'Missing ids or action' }, { status: 400 })

  const db = getServiceClient()

  if (action === 'assign') {
    const repId = value === 'null' || !value ? null : value
    const { error } = await db
      .from('sales_leads')
      .update({ assigned_rep_id: repId, updated_at: new Date().toISOString() })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await Promise.all(ids.map(leadId =>
      logActivity({
        lead_id: leadId, user_id: userId,
        action_type: 'lead_assigned',
        description: repId ? 'Bulk assigned to rep' : 'Bulk unassigned',
      })
    ))
  } else if (action === 'stage') {
    if (!value) return NextResponse.json({ error: 'Stage value required' }, { status: 400 })
    const { error } = await db
      .from('sales_leads')
      .update({ pipeline_stage: value, updated_at: new Date().toISOString() })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await Promise.all(ids.map(leadId =>
      logActivity({
        lead_id: leadId, user_id: userId,
        action_type: 'stage_change',
        description: `Bulk moved to ${value.replace(/_/g, ' ')}`,
      })
    ))
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ updated: ids.length })
}
