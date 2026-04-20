import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeads, createLead, logActivity } from '@/lib/sales/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, role } = session.user as { id: string; role: string }

  const sp = req.nextUrl.searchParams

  function resolveDateRange(range: string | null): { dateFrom?: string; dateTo?: string } {
    if (!range) return {}
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00:00.000Z`
    const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
    const startOfMonth = (y: number, m: number) =>
      `${y}-${pad(m + 1)}-01T00:00:00.000Z`
    const endOfMonth = (y: number, m: number) => {
      const last = new Date(y, m + 1, 0)
      return `${y}-${pad(m + 1)}-${pad(last.getDate())}T23:59:59.999Z`
    }
    switch (range) {
      case 'today':      return { dateFrom: todayStart }
      case 'yesterday': {
        const y = new Date(Date.now() - 86400000)
        const yStart = `${y.getFullYear()}-${pad(y.getMonth()+1)}-${pad(y.getDate())}T00:00:00.000Z`
        const yEnd   = `${y.getFullYear()}-${pad(y.getMonth()+1)}-${pad(y.getDate())}T23:59:59.999Z`
        return { dateFrom: yStart, dateTo: yEnd }
      }
      case '7d':         return { dateFrom: daysAgo(7) }
      case '30d':        return { dateFrom: daysAgo(30) }
      case '90d':        return { dateFrom: daysAgo(90) }
      case 'this_month': return { dateFrom: startOfMonth(now.getFullYear(), now.getMonth()) }
      case 'last_month': {
        const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1
        const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
        return { dateFrom: startOfMonth(ly, lm), dateTo: endOfMonth(ly, lm) }
      }
      default: return {}
    }
  }

  const { dateFrom, dateTo } = resolveDateRange(sp.get('dateRange'))

  try {
    const leads = await getLeads({
      repId:       role === 'rep' ? id : (sp.get('repId') ?? undefined),
      stage:       sp.get('stage') as any  ?? undefined,
      serviceType: sp.get('serviceType')   ?? undefined,
      source:      sp.get('source')        ?? undefined,
      priority:    sp.get('priority')      ?? undefined,
      search:      sp.get('search')        ?? undefined,
      dateFrom,
      dateTo,
      limit:       parseInt(sp.get('limit') ?? '200'),
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
    // Reps own leads they enter themselves; managers/admins leave unassigned for explicit assignment
    if (role === 'rep') {
      body.assigned_rep_id = userId
    }
    // managers/admins: only assign if they explicitly chose a rep

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
