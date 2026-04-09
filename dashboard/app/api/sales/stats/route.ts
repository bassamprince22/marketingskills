import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getManagerStats, getRepStats,
  getPipelineCounts, getRepPerformance,
  getActivities,
} from '@/lib/sales/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, role } = session.user as { id: string; role: string }

  try {
    if (role === 'manager' || role === 'admin') {
      const [stats, pipeline, performance, activities] = await Promise.all([
        getManagerStats(),
        getPipelineCounts(),
        getRepPerformance(),
        getActivities({ limit: 15 }),
      ])
      return NextResponse.json({ type: 'manager', stats, pipeline, performance, activities })
    } else {
      const [stats, pipeline, activities] = await Promise.all([
        getRepStats(id),
        getPipelineCounts(id),
        getActivities({ userId: id, limit: 10 }),
      ])
      return NextResponse.json({ type: 'rep', stats, pipeline, activities })
    }
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
