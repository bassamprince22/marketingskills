import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeads, upsertQualification, logActivity } from '@/lib/sales/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, role } = session.user as { id: string; role: string }

  const sp = req.nextUrl.searchParams
  try {
    const leads = await getLeads({
      repId:       role === 'rep' ? id : (sp.get('repId') ?? undefined),
      serviceType: sp.get('serviceType') ?? undefined,
    })
    const qualified = leads.filter(l => l.is_qualified)
    return NextResponse.json({ leads: qualified })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch qualified leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId } = session.user as { id: string }

  try {
    const { lead_id, ...payload } = await req.json()
    if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
    const qual = await upsertQualification(lead_id, userId, payload)
    await logActivity({
      lead_id,
      user_id:     userId,
      action_type: 'qualified',
      description: 'Lead qualified via BANT assessment',
    })
    return NextResponse.json({ qualification: qual }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to qualify lead' }, { status: 500 })
  }
}
