import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeads, createLead, logActivity } from '@/lib/sales/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, role } = session.user as { id: string; role: string }

  const sp = req.nextUrl.searchParams
  try {
    const leads = await getLeads({
      repId:       role === 'rep' ? id : (sp.get('repId') ?? undefined),
      stage:       sp.get('stage') as any  ?? undefined,
      serviceType: sp.get('serviceType')   ?? undefined,
      source:      sp.get('source')        ?? undefined,
      priority:    sp.get('priority')      ?? undefined,
      search:      sp.get('search')        ?? undefined,
      limit:       parseInt(sp.get('limit') ?? '100'),
      offset:      parseInt(sp.get('offset') ?? '0'),
    })
    return NextResponse.json({ leads })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId, role } = session.user as { id: string; role: string }

  try {
    const body = await req.json()
    // Reps can only create leads assigned to themselves
    if (role === 'rep') body.assigned_rep_id = userId
    body.created_by = userId

    const lead = await createLead(body)
    await logActivity({
      lead_id:     lead.id,
      user_id:     userId,
      action_type: 'lead_created',
      description: `Created lead for ${lead.company_name}`,
    })
    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
