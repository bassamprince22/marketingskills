import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActivities } from '@/lib/sales/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, role } = session.user as { id: string; role: string }

  const sp = req.nextUrl.searchParams
  try {
    const activities = await getActivities({
      leadId: sp.get('leadId') ?? undefined,
      userId: role === 'rep' ? id : (sp.get('userId') ?? undefined),
      limit:  parseInt(sp.get('limit') ?? '20'),
    })
    return NextResponse.json({ activities })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
