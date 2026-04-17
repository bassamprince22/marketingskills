import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

const SOURCES = ['meta', 'referral', 'website', 'outbound', 'other']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (user.role !== 'admin') return err('Forbidden', 403)

  const db = getServiceClient()
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  // Get campaign costs
  const { data: costs } = await db.from('sales_campaign_costs')
    .select('*')
    .order('month', { ascending: false })
    .limit(100)

  // Build spend map: source -> total spend (within range if provided)
  const spendBySource: Record<string, number> = {}
  SOURCES.forEach(s => { spendBySource[s] = 0 })
  for (const cost of (costs ?? [])) {
    const monthDate = new Date(cost.month)
    if (from && monthDate < new Date(from)) continue
    if (to   && monthDate > new Date(to + 'T23:59:59')) continue
    spendBySource[cost.source] = (spendBySource[cost.source] ?? 0) + Number(cost.spend)
  }

  // Get leads data
  let leadsQ = db.from('sales_leads').select('id, lead_source, pipeline_stage, is_qualified, estimated_value, created_at, updated_at')
  if (from) leadsQ = leadsQ.gte('created_at', from)
  if (to)   leadsQ = leadsQ.lte('created_at', to + 'T23:59:59')

  const { data: leads } = await leadsQ

  // Aggregate by source
  type SourceMetrics = {
    leads: number; qualified: number; meetings: number; proposals: number; won: number; revenue: number
  }
  const bySource: Record<string, SourceMetrics> = {}
  SOURCES.forEach(s => { bySource[s] = { leads: 0, qualified: 0, meetings: 0, proposals: 0, won: 0, revenue: 0 } })

  const stageGroups = {
    qualified: ['qualified', 'proposal_sent', 'negotiation', 'contract_sent', 'won'],
    meeting:   ['meeting_completed', 'qualified', 'proposal_sent', 'negotiation', 'contract_sent', 'won'],
    proposal:  ['proposal_sent', 'negotiation', 'contract_sent', 'won'],
    won:       ['won'],
  }

  for (const lead of (leads ?? [])) {
    const src = lead.lead_source ?? 'other'
    if (!bySource[src]) bySource[src] = { leads: 0, qualified: 0, meetings: 0, proposals: 0, won: 0, revenue: 0 }
    bySource[src].leads++
    if (stageGroups.qualified.includes(lead.pipeline_stage)) bySource[src].qualified++
    if (stageGroups.meeting.includes(lead.pipeline_stage))   bySource[src].meetings++
    if (stageGroups.proposal.includes(lead.pipeline_stage))  bySource[src].proposals++
    if (lead.pipeline_stage === 'won') {
      bySource[src].won++
      bySource[src].revenue += Number(lead.estimated_value ?? 0)
    }
  }

  // Compute KPIs per source
  const kpis = SOURCES.map(src => {
    const m    = bySource[src]
    const spend = spendBySource[src] ?? 0
    return {
      source:             src,
      spend,
      leads:              m.leads,
      qualified:          m.qualified,
      meetings:           m.meetings,
      proposals:          m.proposals,
      won:                m.won,
      revenue:            m.revenue,
      cpl:                m.leads > 0 ? spend / m.leads : null,
      cost_per_qualified: m.qualified > 0 ? spend / m.qualified : null,
      cost_per_meeting:   m.meetings > 0 ? spend / m.meetings : null,
      cost_per_won:       m.won > 0 ? spend / m.won : null,
      roi:                spend > 0 ? ((m.revenue - spend) / spend) * 100 : null,
    }
  })

  // Overall funnel
  const totalLeads     = (leads ?? []).length
  const totalQualified = (leads ?? []).filter(l => stageGroups.qualified.includes(l.pipeline_stage)).length
  const totalMeetings  = (leads ?? []).filter(l => stageGroups.meeting.includes(l.pipeline_stage)).length
  const totalProposals = (leads ?? []).filter(l => stageGroups.proposal.includes(l.pipeline_stage)).length
  const totalWon       = (leads ?? []).filter(l => l.pipeline_stage === 'won').length

  const funnel = {
    leads:     totalLeads,
    qualified: totalQualified,
    meetings:  totalMeetings,
    proposals: totalProposals,
    won:       totalWon,
    rates: {
      qualified_rate: totalLeads     > 0 ? totalQualified / totalLeads     * 100 : 0,
      meeting_rate:   totalQualified > 0 ? totalMeetings  / totalQualified * 100 : 0,
      proposal_rate:  totalMeetings  > 0 ? totalProposals / totalMeetings  * 100 : 0,
      close_rate:     totalProposals > 0 ? totalWon       / totalProposals * 100 : 0,
    },
  }

  return NextResponse.json({ kpis, funnel, costs: costs ?? [] })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { id?: string; role?: string }
  if (user.role !== 'admin') return err('Forbidden', 403)

  const body = await req.json()
  const { source, month, spend, notes } = body
  if (!source || !month) return err('source and month required')

  const db = getServiceClient()
  const { data, error } = await db.from('sales_campaign_costs')
    .upsert({ source, month, spend: spend ?? 0, notes: notes ?? null, created_by: user.id },
      { onConflict: 'source,month' })
    .select()
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ cost: data })
}
