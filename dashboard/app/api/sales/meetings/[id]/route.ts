import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateMeeting, logActivity } from '@/lib/sales/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId } = session.user as { id: string }

  try {
    const body    = await req.json()
    const meeting = await updateMeeting(params.id, body)
    if (body.status === 'completed') {
      await logActivity({
        lead_id:     meeting.lead_id,
        user_id:     userId,
        action_type: 'meeting_completed',
        description: `Meeting completed: ${meeting.meeting_type}`,
      })
    }
    return NextResponse.json({ meeting })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}
