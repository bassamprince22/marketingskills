import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEffectiveModulePermission } from '@/lib/sales/db'
import { generateDailyReportDraft } from '@/lib/sales/dailyReport'

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

const TODAY = new Date().toISOString().split('T')[0]

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as { user?: { id?: string; role?: string } } | null
  if (!session?.user) return err('Unauthorized', 401)

  const user = session.user as { id?: string; role?: string }
  const uid = user.id
  const role = user.role ?? 'rep'
  if (!uid) return err('No user id', 400)

  const permission = await getEffectiveModulePermission(uid, role, 'reports')
  if (!permission.can_view) return err('Forbidden', 403)

  const body = await req.json()
  const reportDate = body.report_date ?? TODAY
  const targetUserId = role === 'admin' && permission.can_manage ? (body.user_id ?? uid) : uid

  if (role !== 'admin' && reportDate !== TODAY) {
    return err('Only today can be generated here', 403)
  }

  try {
    const draft = await generateDailyReportDraft(targetUserId, reportDate)
    return NextResponse.json({ report_date: reportDate, draft })
  } catch (error) {
    console.error(error)
    return err('Failed to generate report draft', 500)
  }
}
