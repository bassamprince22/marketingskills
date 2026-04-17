import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRepStats, getMeetingsToday } from '@/lib/sales/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id?: string }
  if (!user.id) return NextResponse.json({ error: 'No user id' }, { status: 400 })

  try {
    const [stats, meetings] = await Promise.all([
      getRepStats(user.id),
      getMeetingsToday(user.id),
    ])

    return NextResponse.json({
      leads_total:         stats.my_leads,
      leads_qualified:     stats.my_qualified,
      leads_waiting:       0,
      meetings_done:       meetings.filter(m => m.status === 'completed').length,
      proposals_sent:      stats.my_proposals,
      contracts_generated: 0,
      won_today:           stats.my_won,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
