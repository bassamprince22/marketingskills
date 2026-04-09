import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMeetings, createMeeting, logActivity } from '@/lib/sales/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, role } = session.user as { id: string; role: string }

  const sp = req.nextUrl.searchParams
  try {
    const meetings = await getMeetings({
      repId:  role === 'rep' ? id : (sp.get('repId') ?? undefined),
      leadId: sp.get('leadId') ?? undefined,
      status: sp.get('status') ?? undefined,
      limit:  parseInt(sp.get('limit') ?? '100'),
    })
    return NextResponse.json({ meetings })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId } = session.user as { id: string }

  try {
    const body = await req.json()
    body.rep_id = userId
    const meeting = await createMeeting(body)
    await logActivity({
      lead_id:     meeting.lead_id,
      user_id:     userId,
      action_type: 'meeting_logged',
      description: `Logged ${meeting.meeting_type} meeting`,
    })
    return NextResponse.json({ meeting }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
