// ═══════════════════════════════════════════════════
// Fadaa Sales System — TypeScript Types
// ═══════════════════════════════════════════════════

export type Role = 'manager' | 'rep' | 'admin'

export type PipelineStage = string

export type ServiceType = 'marketing' | 'software' | 'both'
export type LeadSource  = 'meta' | 'referral' | 'website' | 'outbound' | 'other'
export type DealType    = 'retainer' | 'one_time'
export type Priority    = 'low' | 'medium' | 'high' | 'urgent'

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type MeetingType   = 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'other'

export type DocType   = 'quotation' | 'contract' | 'proposal' | 'other'
export type DocStatus = 'draft' | 'sent' | 'signed' | 'rejected' | 'expired'
export type MetaLeadOrigin = 'paid' | 'organic' | 'unknown'

export type ActivityType =
  | 'stage_change'
  | 'meeting_logged'
  | 'doc_uploaded'
  | 'lead_created'
  | 'lead_assigned'
  | 'note_added'
  | 'qualified'
  | 'meeting_completed'

// ─── DB row types ──────────────────────────────────

export interface SalesUser {
  id:           string
  username:     string
  email:        string | null
  name:         string
  role:         Role
  avatar_url:   string | null
  is_active:    boolean
  created_at:   string
}

export interface Lead {
  id:                   string
  company_name:         string
  contact_person:       string
  phone:                string | null
  email:                string | null
  service_type:         ServiceType
  lead_source:          LeadSource
  budget_range:         string | null
  pipeline_stage:       PipelineStage
  assigned_rep_id:      string | null
  created_by:           string | null
  notes:                string | null
  next_follow_up_date:  string | null
  deal_type:            DealType | null
  estimated_value:      number | null
  priority:             Priority
  expected_close_date:  string | null
  marketing_package:    string | null
  software_scope_notes: string | null
  is_qualified:         boolean
  lost_reason:          string | null
  created_at:           string
  updated_at:           string
  meta_lead_id?:        string | null
  meta_page_id?:        string | null
  meta_form_id?:        string | null
  meta_stage_key?:      string | null
  meta_stage_label?:    string | null
  meta_assignee_name?:  string | null
  meta_origin?:         MetaLeadOrigin | null
  meta_campaign_name?:  string | null
  meta_last_synced_at?: string | null
  meta_raw_payload?:    {
    fields: Record<string, string>
    lead_id?: string | null
    page_id?: string | null
    created_time?: string | null
    ad_name?: string | null
    form_id?: string | null
    form_name?: string | null
    campaign_name?: string | null
    stage_key?: string | null
    stage_label?: string | null
    assignee_name?: string | null
    origin?: MetaLeadOrigin | null
    last_synced_at?: string | null
  } | null
  // joined
  assigned_rep?:        Pick<SalesUser, 'id' | 'name' | 'avatar_url'> | null
}

export interface Meeting {
  id:               string
  lead_id:          string
  rep_id:           string
  meeting_date:     string
  status:           MeetingStatus
  meeting_type:     MeetingType
  notes:            string | null
  outcome:          string | null
  next_action:      string | null
  next_action_date: string | null
  created_at:       string
  updated_at:       string
  // joined
  lead?:            Pick<Lead, 'id' | 'company_name' | 'contact_person'> | null
  rep?:             Pick<SalesUser, 'id' | 'name'> | null
}

export interface Qualification {
  id:                   string
  lead_id:              string
  qualified_by:         string
  need_score:           number | null
  budget_confirmed:     boolean
  decision_maker:       boolean
  timeline:             string | null
  service_fit_score:    number | null
  qualification_notes:  string | null
  qualified_at:         string
}

export interface Document {
  id:          string
  lead_id:     string
  uploaded_by: string
  doc_type:    DocType
  status:      DocStatus
  version:     string
  file_url:    string | null
  file_name:   string
  file_size_kb: number | null
  notes:       string | null
  upload_date: string
  // joined
  lead?:       Pick<Lead, 'id' | 'company_name'> | null
  uploader?:   Pick<SalesUser, 'id' | 'name'> | null
}

export interface Activity {
  id:          string
  lead_id:     string | null
  user_id:     string | null
  action_type: ActivityType
  description: string
  metadata:    Record<string, unknown>
  created_at:  string
  // joined
  lead?:       Pick<Lead, 'id' | 'company_name'> | null
  user?:       Pick<SalesUser, 'id' | 'name'> | null
}

// ─── Dashboard stat shapes ─────────────────────────

export interface ManagerStats {
  total_leads:       number
  new_leads:         number
  qualified_leads:   number
  meetings_booked:   number
  meetings_done:     number
  proposals_sent:    number
  contracts_sent:    number
  won:               number
  lost:              number
}

export interface RepStats {
  my_leads:       number
  my_meetings:    number
  my_qualified:   number
  my_proposals:   number
  my_won:         number
}

export interface PipelineCount {
  stage: PipelineStage
  count: number
  value: number
}

export interface PipelineStageConfig {
  key: string
  label: string
  color: string
  order: number
  is_terminal?: boolean
  report_bucket?: 'open' | 'qualified' | 'proposal' | 'contract' | 'won' | 'lost'
  meta_stage_key?: string | null
  meta_stage_label?: string | null
  crm_only?: boolean
  suggested_doc_types?: DocType[]
}

export interface RepPerformance {
  rep_id:   string
  rep_name: string
  leads:    number
  meetings: number
  won:      number
  lost:     number
  pipeline: number
}

// ─── Form input types ──────────────────────────────

export interface LeadFormData {
  company_name:         string
  contact_person:       string
  phone:                string
  email:                string
  service_type:         ServiceType
  lead_source:          LeadSource
  budget_range:         string
  pipeline_stage:       PipelineStage
  assigned_rep_id:      string
  notes:                string
  next_follow_up_date:  string
  deal_type:            DealType
  estimated_value:      string
  priority:             Priority
  expected_close_date:  string
  marketing_package:    string
  software_scope_notes: string
}

export interface MeetingFormData {
  lead_id:          string
  meeting_date:     string
  meeting_type:     MeetingType
  status:           MeetingStatus
  notes:            string
  outcome:          string
  next_action:      string
  next_action_date: string
}

export interface QualificationFormData {
  need_score:           number
  budget_confirmed:     boolean
  decision_maker:       boolean
  timeline:             string
  service_fit_score:    number
  qualification_notes:  string
}

// ─── Display helpers ───────────────────────────────

export const STAGE_LABELS: Record<string, string> = {
  new_lead:          'New Lead',
  contacted:         'Contacted',
  discovery:         'Discovery',
  meeting_scheduled: 'Meeting Scheduled',
  meeting_completed: 'Meeting Completed',
  qualified:         'Qualified Lead',
  proposal_sent:     'Proposal Sent',
  negotiation:       'Negotiation',
  contract_sent:     'Contract Sent',
  won:               'Won',
  lost:              'Lost',
}

export const PIPELINE_STAGES: PipelineStage[] = [
  'new_lead', 'contacted', 'discovery',
  'meeting_scheduled', 'meeting_completed',
  'qualified', 'proposal_sent', 'negotiation',
  'contract_sent', 'won', 'lost',
]

export const DEFAULT_PIPELINE_STAGE_CONFIGS: PipelineStageConfig[] = [
  { key: 'new_lead', label: 'New Lead', color: '#94A3B8', order: 10, report_bucket: 'open', suggested_doc_types: ['proposal'] },
  { key: 'contacted', label: 'Contacted', color: '#60A5FA', order: 20, report_bucket: 'open', suggested_doc_types: ['proposal'] },
  { key: 'discovery', label: 'Discovery', color: '#818CF8', order: 30, report_bucket: 'open', suggested_doc_types: ['proposal'] },
  { key: 'meeting_scheduled', label: 'Meeting Booked', color: '#A78BFA', order: 40, report_bucket: 'open', suggested_doc_types: ['proposal'] },
  { key: 'meeting_completed', label: 'Meeting Done', color: '#34D399', order: 50, report_bucket: 'open', suggested_doc_types: ['proposal'] },
  { key: 'qualified', label: 'Qualified', color: '#4ADE80', order: 60, report_bucket: 'qualified', suggested_doc_types: ['proposal'] },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#38BDF8', order: 70, report_bucket: 'proposal', suggested_doc_types: ['proposal', 'quotation'] },
  { key: 'negotiation', label: 'Negotiation', color: '#FB923C', order: 80, report_bucket: 'proposal', suggested_doc_types: ['proposal', 'quotation'] },
  { key: 'contract_sent', label: 'Contract Sent', color: '#F97316', order: 90, report_bucket: 'contract', suggested_doc_types: ['contract'] },
  { key: 'won', label: 'Won', color: '#22C55E', order: 100, report_bucket: 'won', is_terminal: true, suggested_doc_types: ['contract'] },
  { key: 'lost', label: 'Lost', color: '#EF4444', order: 110, report_bucket: 'lost', is_terminal: true, crm_only: true },
]

export const SOURCE_LABELS: Record<LeadSource, string> = {
  meta:     'Meta Ads',
  referral: 'Referral',
  website:  'Website',
  outbound: 'Outbound',
  other:    'Other',
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  marketing: 'Marketing',
  software:  'Software',
  both:      'Both',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low:    'Low',
  medium: 'Medium',
  high:   'High',
  urgent: 'Urgent',
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  discovery:   'Discovery Call',
  demo:        'Demo',
  proposal:    'Proposal Review',
  negotiation: 'Negotiation',
  other:       'Other',
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  quotation: 'Quotation',
  contract:  'Contract',
  proposal:  'Proposal',
  other:     'Other',
}

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft:    'Draft',
  sent:     'Sent',
  signed:   'Signed',
  rejected: 'Rejected',
  expired:  'Expired',
}
