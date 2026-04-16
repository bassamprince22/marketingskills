// ═══════════════════════════════════════════════════
// Fadaa Sales System — DB helpers (server-side only)
// All queries use service-role client (bypasses RLS).
// Row-level access is enforced in API route handlers.
// ═══════════════════════════════════════════════════
import { getServiceClient } from '@/lib/supabase'
import type {
  Lead, Meeting, SalesUser, Qualification, Document,
  Activity, PipelineStage, ManagerStats, RepStats,
  PipelineCount, RepPerformance,
} from './types'

// ─── Users ────────────────────────────────────────

export async function getSalesUsers(): Promise<SalesUser[]> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_users')
    .select('id, username, email, name, role, avatar_url, is_active, created_at')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as SalesUser[]
}

export async function getSalesReps(): Promise<SalesUser[]> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_users')
    .select('id, username, email, name, role, avatar_url, is_active, created_at')
    .in('role', ['rep', 'manager'])
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data as SalesUser[]
}

// ─── Leads ────────────────────────────────────────

export async function getLeads(opts: {
  repId?: string   // if set, filter by assigned_rep_id
  stage?: PipelineStage
  serviceType?: string
  source?: string
  priority?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<Lead[]> {
  const db = getServiceClient()
  let q = db
    .from('sales_leads')
    .select('*, assigned_rep:sales_users!assigned_rep_id(id, name, avatar_url)')
    .order('updated_at', { ascending: false })

  if (opts.repId === 'unassigned') q = q.is('assigned_rep_id', null)
  else if (opts.repId)            q = q.eq('assigned_rep_id', opts.repId)
  if (opts.stage)       q = q.eq('pipeline_stage', opts.stage)
  if (opts.serviceType) q = q.eq('service_type', opts.serviceType)
  if (opts.source)      q = q.eq('lead_source', opts.source)
  if (opts.priority)    q = q.eq('priority', opts.priority)
  if (opts.search) {
    q = q.or(
      `company_name.ilike.%${opts.search}%,contact_person.ilike.%${opts.search}%,email.ilike.%${opts.search}%`
    )
  }
  if (opts.limit)  q = q.limit(opts.limit)
  if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

  const { data, error } = await q
  if (error) throw error
  return data as Lead[]
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_leads')
    .select('*, assigned_rep:sales_users!assigned_rep_id(id, name, avatar_url)')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Lead
}

export async function createLead(payload: Partial<Lead>): Promise<Lead> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_leads')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, payload: Partial<Lead>): Promise<Lead> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_leads')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const db = getServiceClient()
  const { error } = await db.from('sales_leads').delete().eq('id', id)
  if (error) throw error
}

// ─── Meetings ─────────────────────────────────────

export async function getMeetings(opts: {
  repId?:  string
  leadId?: string
  status?: string
  limit?:  number
}): Promise<Meeting[]> {
  const db = getServiceClient()
  let q = db
    .from('sales_meetings')
    .select('*, lead:sales_leads(id, company_name, contact_person), rep:sales_users!rep_id(id, name)')
    .order('meeting_date', { ascending: false })

  if (opts.repId)  q = q.eq('rep_id', opts.repId)
  if (opts.leadId) q = q.eq('lead_id', opts.leadId)
  if (opts.status) q = q.eq('status', opts.status)
  if (opts.limit)  q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) throw error
  return data as Meeting[]
}

export async function createMeeting(payload: Partial<Meeting>): Promise<Meeting> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_meetings')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Meeting
}

export async function updateMeeting(id: string, payload: Partial<Meeting>): Promise<Meeting> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_meetings')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Meeting
}

// ─── Qualifications ───────────────────────────────

export async function getQualification(leadId: string): Promise<Qualification | null> {
  const db = getServiceClient()
  const { data } = await db
    .from('sales_qualifications')
    .select('*')
    .eq('lead_id', leadId)
    .single()
  return data as Qualification | null
}

export async function upsertQualification(
  leadId: string,
  qualifiedBy: string,
  payload: Partial<Qualification>
): Promise<Qualification> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_qualifications')
    .upsert({ ...payload, lead_id: leadId, qualified_by: qualifiedBy }, { onConflict: 'lead_id' })
    .select()
    .single()
  if (error) throw error
  // Also mark lead as qualified
  await db.from('sales_leads').update({ is_qualified: true, pipeline_stage: 'qualified' }).eq('id', leadId)
  return data as Qualification
}

// ─── Documents ────────────────────────────────────

export async function getDocuments(opts: { leadId?: string; uploadedBy?: string }): Promise<Document[]> {
  const db = getServiceClient()
  let q = db
    .from('sales_documents')
    .select('*, lead:sales_leads(id, company_name), uploader:sales_users!uploaded_by(id, name)')
    .order('upload_date', { ascending: false })

  if (opts.leadId)     q = q.eq('lead_id', opts.leadId)
  if (opts.uploadedBy) q = q.eq('uploaded_by', opts.uploadedBy)

  const { data, error } = await q
  if (error) throw error
  return data as Document[]
}

export async function createDocument(payload: Partial<Document>): Promise<Document> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_documents')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Document
}

export async function updateDocument(id: string, payload: Partial<Document>): Promise<Document> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_documents')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Document
}

// ─── Activities ───────────────────────────────────

export async function getActivities(opts: {
  leadId?: string
  userId?: string
  limit?:  number
}): Promise<Activity[]> {
  const db = getServiceClient()
  let q = db
    .from('sales_activities')
    .select('*, lead:sales_leads(id, company_name), user:sales_users(id, name)')
    .order('created_at', { ascending: false })

  if (opts.leadId) q = q.eq('lead_id', opts.leadId)
  if (opts.userId) q = q.eq('user_id', opts.userId)
  q = q.limit(opts.limit ?? 20)

  const { data, error } = await q
  if (error) throw error
  return data as Activity[]
}

export async function logActivity(payload: {
  lead_id?:    string
  user_id?:    string
  action_type: Activity['action_type']
  description: string
  metadata?:   Record<string, unknown>
}): Promise<void> {
  const db = getServiceClient()
  await db.from('sales_activities').insert({
    ...payload,
    metadata: payload.metadata ?? {},
  })
}

// ─── Dashboard stats ──────────────────────────────

export async function getManagerStats(): Promise<ManagerStats> {
  const db = getServiceClient()
  const { data: leads } = await db
    .from('sales_leads')
    .select('pipeline_stage, created_at')

  const rows = (leads ?? []) as { pipeline_stage: string; created_at: string }[]
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const stats: ManagerStats = {
    total_leads:     rows.length,
    new_leads:       rows.filter(r => new Date(r.created_at) > weekAgo).length,
    qualified_leads: rows.filter(r => r.pipeline_stage === 'qualified').length,
    meetings_booked: 0,
    meetings_done:   0,
    proposals_sent:  rows.filter(r => ['proposal_sent','negotiation','contract_sent'].includes(r.pipeline_stage)).length,
    contracts_sent:  rows.filter(r => r.pipeline_stage === 'contract_sent').length,
    won:             rows.filter(r => r.pipeline_stage === 'won').length,
    lost:            rows.filter(r => r.pipeline_stage === 'lost').length,
  }

  const { data: meetings } = await db.from('sales_meetings').select('status')
  const mtgs = (meetings ?? []) as { status: string }[]
  stats.meetings_booked = mtgs.filter(m => m.status === 'scheduled').length
  stats.meetings_done   = mtgs.filter(m => m.status === 'completed').length

  return stats
}

export async function getRepStats(repId: string): Promise<RepStats> {
  const db = getServiceClient()
  const { data: leads } = await db
    .from('sales_leads')
    .select('pipeline_stage')
    .eq('assigned_rep_id', repId)

  const rows = (leads ?? []) as { pipeline_stage: string }[]
  const { data: meetings } = await db
    .from('sales_meetings')
    .select('id')
    .eq('rep_id', repId)

  return {
    my_leads:     rows.length,
    my_meetings:  (meetings ?? []).length,
    my_qualified: rows.filter(r => r.pipeline_stage === 'qualified').length,
    my_proposals: rows.filter(r => ['proposal_sent','negotiation','contract_sent'].includes(r.pipeline_stage)).length,
    my_won:       rows.filter(r => r.pipeline_stage === 'won').length,
  }
}

export async function getPipelineCounts(repId?: string): Promise<PipelineCount[]> {
  const db = getServiceClient()
  let q = db.from('sales_leads').select('pipeline_stage, estimated_value')
  if (repId) q = q.eq('assigned_rep_id', repId)
  const { data } = await q
  const rows = (data ?? []) as { pipeline_stage: string; estimated_value: number | null }[]

  const map: Record<string, PipelineCount> = {}
  rows.forEach(r => {
    if (!map[r.pipeline_stage]) map[r.pipeline_stage] = { stage: r.pipeline_stage as PipelineStage, count: 0, value: 0 }
    map[r.pipeline_stage].count++
    map[r.pipeline_stage].value += r.estimated_value ?? 0
  })
  return Object.values(map)
}

export async function getRepPerformance(): Promise<RepPerformance[]> {
  const db = getServiceClient()
  const [{ data: users }, { data: leads }, { data: meetings }] = await Promise.all([
    db.from('sales_users').select('id, name').eq('role', 'rep'),
    db.from('sales_leads').select('assigned_rep_id, pipeline_stage, estimated_value'),
    db.from('sales_meetings').select('rep_id, status'),
  ])

  return ((users ?? []) as SalesUser[]).map(u => {
    const repLeads    = ((leads ?? []) as Lead[]).filter(l => l.assigned_rep_id === u.id)
    const repMeetings = ((meetings ?? []) as Meeting[]).filter(m => m.rep_id === u.id)
    return {
      rep_id:   u.id,
      rep_name: u.name,
      leads:    repLeads.length,
      meetings: repMeetings.length,
      won:      repLeads.filter(l => l.pipeline_stage === 'won').length,
      lost:     repLeads.filter(l => l.pipeline_stage === 'lost').length,
      pipeline: repLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0),
    }
  })
}

// ─── Action Intelligence ──────────────────────────
// These power the "Sales OS" layer: overdue, stale, at-risk, today

export async function getOverdueFollowups(repId?: string): Promise<Lead[]> {
  const db = getServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  let q = db
    .from('sales_leads')
    .select('*, assigned_rep:sales_users!assigned_rep_id(id, name)')
    .lt('next_follow_up_date', today)
    .not('next_follow_up_date', 'is', null)
    .not('pipeline_stage', 'in', '("won","lost")')
    .order('next_follow_up_date', { ascending: true })
    .limit(20)
  if (repId) q = q.eq('assigned_rep_id', repId)
  const { data } = await q
  return (data ?? []) as Lead[]
}

export async function getStaleLeads(repId?: string): Promise<Lead[]> {
  const db = getServiceClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let q = db
    .from('sales_leads')
    .select('*, assigned_rep:sales_users!assigned_rep_id(id, name)')
    .lt('updated_at', sevenDaysAgo)
    .not('pipeline_stage', 'in', '("won","lost")')
    .order('updated_at', { ascending: true })
    .limit(20)
  if (repId) q = q.eq('assigned_rep_id', repId)
  const { data } = await q
  return (data ?? []) as Lead[]
}

export async function getMeetingsToday(repId?: string): Promise<Meeting[]> {
  const db = getServiceClient()
  const start = new Date(); start.setHours(0,0,0,0)
  const end   = new Date(); end.setHours(23,59,59,999)
  let q = db
    .from('sales_meetings')
    .select('*, lead:sales_leads(id, company_name, contact_person), rep:sales_users!rep_id(id, name)')
    .gte('meeting_date', start.toISOString())
    .lte('meeting_date', end.toISOString())
    .order('meeting_date', { ascending: true })
  if (repId) q = q.eq('rep_id', repId)
  const { data } = await q
  return (data ?? []) as Meeting[]
}

export async function getHighValueAtRisk(repId?: string): Promise<Lead[]> {
  const db = getServiceClient()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  let q = db
    .from('sales_leads')
    .select('*, assigned_rep:sales_users!assigned_rep_id(id, name)')
    .lt('updated_at', fourteenDaysAgo)
    .not('pipeline_stage', 'in', '("won","lost","new_lead")')
    .gt('estimated_value', 0)
    .order('estimated_value', { ascending: false })
    .limit(10)
  if (repId) q = q.eq('assigned_rep_id', repId)
  const { data } = await q
  return (data ?? []) as Lead[]
}

// ─── Profiles ─────────────────────────────────────

export async function getUserProfile(userId: string) {
  const db = getServiceClient()
  const { data } = await db
    .from('sales_user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function upsertUserProfile(userId: string, profile: {
  job_title?: string; phone?: string; department?: string
  avatar_url?: string; manager_id?: string | null; bio?: string; join_date?: string
}) {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_user_profiles')
    .upsert({ user_id: userId, ...profile }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Permissions ──────────────────────────────────

export const PERMISSION_MODULES = [
  'dashboard', 'leads', 'pipeline', 'meetings',
  'qualified', 'documents', 'import', 'reports', 'team',
] as const

export type PermissionModule = typeof PERMISSION_MODULES[number]

export interface Permission {
  module:     PermissionModule
  can_view:   boolean
  can_create: boolean
  can_edit:   boolean
  can_delete: boolean
  can_manage: boolean
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const db = getServiceClient()
  const { data } = await db
    .from('sales_permissions')
    .select('module, can_view, can_create, can_edit, can_delete, can_manage')
    .eq('user_id', userId)
  return (data ?? []) as Permission[]
}

export async function setUserPermissions(userId: string, permissions: Permission[]) {
  const db = getServiceClient()
  const rows = permissions.map(p => ({ user_id: userId, ...p }))
  const { error } = await db
    .from('sales_permissions')
    .upsert(rows, { onConflict: 'user_id,module' })
  if (error) throw error
}

// ─── Password reset tokens ────────────────────────

export async function createPasswordResetToken(userId: string): Promise<string> {
  const db = getServiceClient()
  const token = crypto.randomUUID() + '-' + crypto.randomUUID()
  await db.from('sales_password_resets').insert({
    user_id: userId,
    token,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  })
  return token
}

export async function validateResetToken(token: string): Promise<{ userId: string } | null> {
  const db = getServiceClient()
  const { data } = await db
    .from('sales_password_resets')
    .select('user_id, expires_at, used')
    .eq('token', token)
    .maybeSingle()
  if (!data || data.used || new Date(data.expires_at) < new Date()) return null
  return { userId: data.user_id }
}

export async function consumeResetToken(token: string) {
  const db = getServiceClient()
  await db.from('sales_password_resets').update({ used: true }).eq('token', token)
}
