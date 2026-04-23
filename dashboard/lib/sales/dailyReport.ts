import { getServiceClient } from '@/lib/supabase'

export interface GeneratedDailyReportDraft {
  leads_total: number
  leads_qualified: number
  leads_waiting: number
  meetings_done: number
  proposals_sent: number
  contracts_generated: number
  won_today: number
  highlights: string
  challenges: string
  next_day_plan: string
  custom_notes: string
  summary: string
}

function dateRangeForDay(date: string) {
  return {
    from: `${date}T00:00:00.000Z`,
    to: `${date}T23:59:59.999Z`,
  }
}

export async function generateDailyReportDraft(userId: string, date: string): Promise<GeneratedDailyReportDraft> {
  const db = getServiceClient()
  const { from, to } = dateRangeForDay(date)

  const [{ data: leads }, { data: meetings }, { data: documents }, { data: activities }] = await Promise.all([
    db
      .from('sales_leads')
      .select('id, pipeline_stage, assigned_rep_id, is_qualified, created_at')
      .eq('assigned_rep_id', userId)
      .gte('updated_at', from)
      .lte('updated_at', to),
    db
      .from('sales_meetings')
      .select('id, status, meeting_date')
      .eq('rep_id', userId)
      .gte('meeting_date', from)
      .lte('meeting_date', to),
    db
      .from('sales_documents')
      .select('id, doc_type, status, upload_date')
      .eq('uploaded_by', userId)
      .gte('upload_date', from)
      .lte('upload_date', to),
    db
      .from('sales_activities')
      .select('id, action_type, description, created_at')
      .eq('user_id', userId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const leadRows = (leads ?? []) as Array<{ pipeline_stage: string; is_qualified: boolean }>
  const meetingRows = (meetings ?? []) as Array<{ status: string }>
  const documentRows = (documents ?? []) as Array<{ doc_type: string; status: string }>
  const activityRows = (activities ?? []) as Array<{ description: string }>

  const meetingsDone = meetingRows.filter((meeting) => meeting.status === 'completed').length
  const proposalsSent = documentRows.filter((document) => document.doc_type === 'proposal' || document.doc_type === 'quotation').length
  const contractsGenerated = documentRows.filter((document) => document.doc_type === 'contract').length
  const wonToday = leadRows.filter((lead) => lead.pipeline_stage === 'won').length
  const qualified = leadRows.filter((lead) => lead.is_qualified || lead.pipeline_stage === 'qualified').length
  const waiting = leadRows.filter((lead) => !['won', 'lost'].includes(lead.pipeline_stage)).length

  const highlightParts = [
    leadRows.length > 0 ? `Worked ${leadRows.length} lead${leadRows.length === 1 ? '' : 's'}` : null,
    meetingsDone > 0 ? `completed ${meetingsDone} meeting${meetingsDone === 1 ? '' : 's'}` : null,
    proposalsSent > 0 ? `sent ${proposalsSent} proposal${proposalsSent === 1 ? '' : 's'}` : null,
    contractsGenerated > 0 ? `generated ${contractsGenerated} contract${contractsGenerated === 1 ? '' : 's'}` : null,
    wonToday > 0 ? `closed ${wonToday} win${wonToday === 1 ? '' : 's'}` : null,
  ].filter(Boolean)

  const summary = highlightParts.length
    ? `Today I ${highlightParts.join(', ')}.`
    : 'Today had light CRM activity and no major milestones were recorded.'

  const recentActions = activityRows.slice(0, 3).map((activity) => `• ${activity.description}`).join('\n')

  return {
    leads_total: leadRows.length,
    leads_qualified: qualified,
    leads_waiting: waiting,
    meetings_done: meetingsDone,
    proposals_sent: proposalsSent,
    contracts_generated: contractsGenerated,
    won_today: wonToday,
    highlights: summary,
    challenges: waiting > 0 ? `${waiting} active lead${waiting === 1 ? '' : 's'} still need follow-up or stage progress.` : '',
    next_day_plan: waiting > 0 ? `Prioritize follow-up on the ${waiting} active lead${waiting === 1 ? '' : 's'} still in motion.` : 'Keep momentum on current opportunities and push qualified leads toward proposal/contract stages.',
    custom_notes: recentActions,
    summary,
  }
}
