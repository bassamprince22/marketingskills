import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { getEffectiveModulePermission } from '@/lib/sales/db'

function getPeriodRange(period: 'month' | 'quarter', anchor?: string | null) {
  const base = anchor ? new Date(anchor) : new Date()
  if (Number.isNaN(base.getTime())) return null

  if (period === 'month') {
    const start = new Date(base.getFullYear(), base.getMonth(), 1)
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999)
    return { from: start.toISOString(), to: end.toISOString() }
  }

  const quarterStartMonth = Math.floor(base.getMonth() / 3) * 3
  const start = new Date(base.getFullYear(), quarterStartMonth, 1)
  const end = new Date(base.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999)
  return { from: start.toISOString(), to: end.toISOString() }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id?: string; role?: string }
  const uid = user.id
  const role = user.role ?? 'rep'
  if (!uid) return NextResponse.json({ error: 'No user id' }, { status: 400 })

  const reportsPermission = await getEffectiveModulePermission(uid, role, 'reports')
  if (!reportsPermission.can_view) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (role !== 'admin' || !reportsPermission.can_manage) {
    return NextResponse.json({ error: 'Analytics are admin only' }, { status: 403 })
  }

  const searchParams = req.nextUrl.searchParams
  let from = searchParams.get('from')
  let to = searchParams.get('to')
  const period = searchParams.get('period') as 'month' | 'quarter' | null
  const anchor = searchParams.get('anchor')

  if (period === 'month' || period === 'quarter') {
    const range = getPeriodRange(period, anchor)
    if (range) {
      from = range.from
      to = range.to
    }
  }

  const db = getServiceClient()

  // Build server-side date-filtered queries to avoid fetching all rows
  let leadsQ = db.from('sales_leads').select('id, pipeline_stage, lead_source, service_type, assigned_rep_id, is_qualified, estimated_value, created_at')
  let meetingsQ = db.from('sales_meetings').select('id, rep_id, status, meeting_date')
  let docsQ = db.from('sales_documents').select('id, doc_type, status, upload_date')

  if (from) { leadsQ = leadsQ.gte('created_at', from); meetingsQ = meetingsQ.gte('meeting_date', from); docsQ = docsQ.gte('upload_date', from) }
  if (to)   { leadsQ = leadsQ.lte('created_at', to);   meetingsQ = meetingsQ.lte('meeting_date', to);   docsQ = docsQ.lte('upload_date', to) }

  // Monthly trend always shows last 6 months regardless of date filter
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0,0,0,0)
  const trendQ = db.from('sales_leads')
    .select('pipeline_stage, estimated_value, created_at')
    .gte('created_at', sixMonthsAgo.toISOString())

  try {
    const [
      { data: leads },
      { data: meetings },
      { data: documents },
      { data: users },
      { data: trendLeads },
    ] = await Promise.all([
      leadsQ,
      meetingsQ,
      docsQ,
      db.from('sales_users').select('id, name').eq('role', 'rep'),
      trendQ,
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Row = Record<string, any>
    const leadRows = (leads ?? []) as Row[]
    const meetingRows = (meetings ?? []) as Row[]
    const documentRows = (documents ?? []) as Row[]
    const usersRows = (users ?? []) as Row[]
    const trendRows = (trendLeads ?? []) as Row[]

    // No JS filtering needed — DB already applied date range
    const filteredLeads = leadRows
    const filteredMeetings = meetingRows
    const filteredDocuments = documentRows

    const bySource: Record<string, number> = {}
    filteredLeads.forEach((lead) => {
      bySource[lead.lead_source] = (bySource[lead.lead_source] ?? 0) + 1
    })

    const byService: Record<string, number> = {}
    filteredLeads.forEach((lead) => {
      byService[lead.service_type] = (byService[lead.service_type] ?? 0) + 1
    })

    const qualByRep = usersRows.map((rep) => ({
      rep_id: rep.id,
      rep_name: rep.name,
      count: filteredLeads.filter((lead) => lead.assigned_rep_id === rep.id && lead.is_qualified).length,
    }))

    const meetingsByRep = usersRows.map((rep) => ({
      rep_id: rep.id,
      rep_name: rep.name,
      total: filteredMeetings.filter((meeting) => meeting.rep_id === rep.id).length,
      completed: filteredMeetings.filter((meeting) => meeting.rep_id === rep.id && meeting.status === 'completed').length,
      no_show: filteredMeetings.filter((meeting) => meeting.rep_id === rep.id && meeting.status === 'no_show').length,
    }))

    const won = filteredLeads.filter((lead) => lead.pipeline_stage === 'won').length
    const lost = filteredLeads.filter((lead) => lead.pipeline_stage === 'lost').length
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0

    const quotations = filteredDocuments.filter((document) => document.doc_type === 'quotation').length
    const contractsSigned = filteredDocuments.filter((document) => document.doc_type === 'contract' && document.status === 'signed').length

    const monthlyMap: Record<string, { month: string; leads: number; won: number; value: number }> = {}
    trendRows.forEach((lead) => {
      const date = new Date(lead.created_at as string)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, leads: 0, won: 0, value: 0 }
      monthlyMap[key].leads += 1
      if (lead.pipeline_stage === 'won') {
        monthlyMap[key].won += 1
        monthlyMap[key].value += (lead.estimated_value as number) ?? 0
      }
    })
    const monthly = Object.values(monthlyMap)
      .sort((left, right) => left.month.localeCompare(right.month))
      .slice(-6)

    const pipelineValue: Record<string, number> = {}
    filteredLeads.forEach((lead) => {
      pipelineValue[lead.pipeline_stage] = (pipelineValue[lead.pipeline_stage] ?? 0) + (lead.estimated_value ?? 0)
    })

    return NextResponse.json({
      summary: {
        total_leads: filteredLeads.length,
        won,
        lost,
        winRate,
        total_meetings: filteredMeetings.length,
        quotations_sent: quotations,
        contracts_signed: contractsSigned,
        total_pipeline_value: filteredLeads.reduce((sum, lead) => sum + (lead.estimated_value ?? 0), 0),
      },
      bySource,
      byService,
      qualByRep,
      meetingsByRep,
      monthly,
      pipelineValue,
      range: {
        from,
        to,
        period: period ?? null,
        anchor: anchor ?? null,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 })
  }
}
