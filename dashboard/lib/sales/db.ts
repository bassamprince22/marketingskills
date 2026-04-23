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
import { hydrateMetaLead, isUnknownLeadValue } from './meta'

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
  repId?: string
  stage?: PipelineStage
  serviceType?: string
  source?: string
  priority?: string
  search?: string
  metaOrigin?: string
  metaForm?: string
  metaCampaign?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}): Promise<Lead[]> {
  const db = getServiceClient()
  let q = applyLeadFilters(
    db.from('sales_leads').select('*, assigned_rep:sales_users!assigned_rep_id(id, name, avatar_url)').order('created_at', { ascending: false }),
    opts
  )
  if (opts.limit)  q = q.limit(opts.limit)
  if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

  const { data, error } = await q
  if (error) throw error
  return dedupeMetaLeads(((data ?? []) as Lead[]).map(hydrateMetaLead))
}

export async function getLeadsTotal(opts: {
  repId?: string
  stage?: PipelineStage
  serviceType?: string
  source?: string
  priority?: string
  search?: string
  metaOrigin?: string
  metaForm?: string
  metaCampaign?: string
  dateFrom?: string
  dateTo?: string
}): Promise<number> {
  const db = getServiceClient()
  const query = applyLeadFilters(
    db.from('sales_leads').select('id', { count: 'exact', head: true }),
    opts
  )
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

function applyLeadFilters<T extends { eq: Function; is: Function; gte: Function; lte: Function; or: Function; ilike: Function; not: Function }>(q: T, opts: {
  repId?: string
  stage?: string
  serviceType?: string
  source?: string
  priority?: string
  search?: string
  metaOrigin?: string
  metaForm?: string
  metaCampaign?: string
  dateFrom?: string
  dateTo?: string
}) {
  if (opts.repId === 'unassigned') q = q.is('assigned_rep_id', null)
  else if (opts.repId)            q = q.eq('assigned_rep_id', opts.repId)
  if (opts.stage)       q = q.eq('pipeline_stage', opts.stage)
  if (opts.serviceType) q = q.eq('service_type', opts.serviceType)
  if (opts.source)      q = q.eq('lead_source', opts.source)
  if (opts.priority)    q = q.eq('priority', opts.priority)
  if (opts.dateFrom)    q = q.gte('created_at', opts.dateFrom)
  if (opts.dateTo)      q = q.lte('created_at', opts.dateTo)
  if (opts.search) {
    q = q.or(
      `company_name.ilike.%${opts.search}%,contact_person.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`
    )
  }
  if (opts.metaForm) q = q.ilike('notes', `%${opts.metaForm}%`)
  if (opts.metaCampaign) q = q.ilike('notes', `%${opts.metaCampaign}%`)
  if (opts.metaOrigin === 'paid') q = q.not('meta_raw_payload->>ad_name', 'is', null)
  if (opts.metaOrigin === 'organic') q = q.is('meta_raw_payload->>ad_name', null)
  return q
}

function normalizeLeadPhone(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]+/g, '')
  return digits || null
}

function scoreLeadForDedupe(lead: Lead) {
  let score = 0
  if (lead.meta_lead_id || lead.meta_raw_payload?.lead_id) score += 8
  if (lead.email?.trim()) score += 4
  if (lead.phone?.trim()) score += 4
  if (!isUnknownLeadValue(lead.contact_person)) score += 2
  if (!isUnknownLeadValue(lead.company_name)) score += 2
  if (lead.notes?.trim()) score += 1
  return score
}

function pickPreferredLead(existing: Lead, incoming: Lead) {
  const scoreDiff = scoreLeadForDedupe(incoming) - scoreLeadForDedupe(existing)
  if (scoreDiff > 0) return incoming
  if (scoreDiff < 0) return existing

  const existingCreated = new Date(existing.created_at).getTime()
  const incomingCreated = new Date(incoming.created_at).getTime()
  if (Number.isFinite(existingCreated) && Number.isFinite(incomingCreated) && incomingCreated < existingCreated) {
    return incoming
  }

  return existing
}

function getMetaLeadDedupeKey(lead: Lead) {
  if (lead.lead_source !== 'meta') return null

  const metaLeadId = lead.meta_lead_id ?? lead.meta_raw_payload?.lead_id ?? null
  if (metaLeadId) return `meta-lead:${metaLeadId}`

  const email = lead.email?.trim().toLowerCase() ?? ''
  const phone = normalizeLeadPhone(lead.phone) ?? ''
  const formId = lead.meta_form_id ?? lead.meta_raw_payload?.form_id ?? ''

  if (email || phone) {
    return `meta-contact:${formId}:${email}:${phone}`
  }

  return null
}

function dedupeMetaLeads(leads: Lead[]) {
  const deduped: Lead[] = []
  const indexByKey = new Map<string, number>()

  for (const lead of leads) {
    const key = getMetaLeadDedupeKey(lead)
    if (!key) {
      deduped.push(lead)
      continue
    }

    const existingIndex = indexByKey.get(key)
    if (existingIndex == null) {
      indexByKey.set(key, deduped.length)
      deduped.push(lead)
      continue
    }

    deduped[existingIndex] = pickPreferredLead(deduped[existingIndex], lead)
  }

  return deduped
}

export async function getUnassignedLeads(limit = 10): Promise<Lead[]> {
  return getLeads({ repId: 'unassigned', limit })
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const db = getServiceClient()
  const { data, error } = await db
    .from('sales_leads')
    .select('*, assigned_rep:sales_users!assigned_rep_id(id, name, avatar_url)')
    .eq('id', id)
    .single()
  if (error) return null
  return hydrateMetaLead(data as Lead)
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

const MEETING_SELECT =
  '*, lead:sales_leads(id, company_name, contact_person), rep:sales_users!rep_id(id, name)'

function normalizeMeetingPayload(payload: Partial<Meeting>): Partial<Meeting> {
  return {
    ...payload,
    notes: payload.notes?.trim() || null,
    outcome: payload.outcome?.trim() || null,
    next_action: payload.next_action?.trim() || null,
    next_action_date: payload.next_action_date?.trim() || null,
  }
}

export async function getMeetings(opts: {
  repId?:  string
  leadId?: string
  status?: string
  limit?:  number
}): Promise<Meeting[]> {
  const db = getServiceClient()
  let q = db
    .from('sales_meetings')
    .select(MEETING_SELECT)
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
  const normalized = normalizeMeetingPayload(payload)
  const { data, error } = await db
    .from('sales_meetings')
    .insert(normalized)
    .select(MEETING_SELECT)
    .single()
  if (error) throw error
  return data as Meeting
}

export async function updateMeeting(id: string, payload: Partial<Meeting>): Promise<Meeting> {
  const db = getServiceClient()
  const normalized = normalizeMeetingPayload(payload)
  const { data, error } = await db
    .from('sales_meetings')
    .update(normalized)
    .eq('id', id)
    .select(MEETING_SELECT)
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

export async function getDocuments(opts: { leadId?: string; leadIds?: string[]; uploadedBy?: string }): Promise<Document[]> {
  const db = getServiceClient()
  let q = db
    .from('sales_documents')
    .select('*, lead:sales_leads(id, company_name), uploader:sales_users!uploaded_by(id, name)')
    .order('upload_date', { ascending: false })

  if (opts.leadId)     q = q.eq('lead_id', opts.leadId)
  if (opts.leadIds?.length) q = q.in('lead_id', opts.leadIds)
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

function fullPermission(module: PermissionModule): Permission {
  return {
    module,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true,
    can_manage: true,
  }
}

function reportsFallback(role: string): Permission {
  if (role === 'admin') return fullPermission('reports')
  if (role === 'manager') {
    return {
      module: 'reports',
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: false,
      can_manage: true,
    }
  }
  return {
    module: 'reports',
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: false,
    can_manage: false,
  }
}

export async function getEffectiveModulePermission(
  userId: string,
  role: string,
  module: PermissionModule
): Promise<Permission> {
  if (role === 'admin') return fullPermission(module)

  const db = getServiceClient()
  const [{ data: userRows }, { data: roleRows }] = await Promise.all([
    db.from('sales_permissions')
      .select('module, can_view, can_create, can_edit, can_delete, can_manage')
      .eq('user_id', userId)
      .eq('module', module)
      .limit(1),
    db.from('sales_role_permissions')
      .select('module, can_view, can_create, can_edit, can_delete, can_manage')
      .eq('role', role)
      .eq('module', module)
      .limit(1),
  ])

  const match = (userRows ?? [])[0] ?? (roleRows ?? [])[0]
  if (match) return match as Permission
  if (module === 'reports') return reportsFallback(role)
  return {
    module,
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
    can_manage: false,
  }
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
