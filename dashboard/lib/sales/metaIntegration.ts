import { getNextAssignee } from '@/lib/sales/autoAssign'
import { sendMetaHealthEmail } from '@/lib/sales/emailReporter'
import { extractMetaLeadIdentity, isUnknownLeadValue } from '@/lib/sales/meta'
import { getServiceClient } from '@/lib/supabase'

const BUCKET = 'sales-config'
const CONFIG_FILE = 'meta-integration.json'
const LOGS_FILE = 'meta-logs.json'
const HEALTH_FILE = 'meta-health.json'
const META_API_VERSION = 'v19.0'
const SYNC_STALE_MS = 24 * 60 * 60 * 1000
const SYNC_BOOTSTRAP_LOOKBACK_SECONDS = 6 * 60 * 60
const SYNC_OVERLAP_SECONDS = 15 * 60
const MANUAL_IMPORT_LOOKBACK_SECONDS = 30 * 24 * 60 * 60

export type MetaSyncSource = 'webhook' | 'manual_import' | 'cron'
type MetaHealthSource = MetaSyncSource | 'connect' | 'settings' | 'disconnect'
type MetaHealthStatus = 'healthy' | 'warning' | 'broken'
type MetaLogStatus = 'success' | 'warning' | 'error' | 'info'

type DbClient = ReturnType<typeof getServiceClient>

export interface MetaPageConfig {
  id: string
  name: string
  access_token: string
}

export interface MetaIntegrationConfig {
  user_token?: string
  token_expiry?: string | null
  pages?: MetaPageConfig[]
  page_access_token?: string | null
  connected_at?: string
  default_page_id?: string | null
  last_sync_at?: string | null
  last_sync_source?: MetaSyncSource | null
  sync_stats?: {
    total_imported?: number
    total_updated?: number
  }
}

export interface MetaIntegrationRecord {
  type: 'meta'
  is_active: boolean
  config: MetaIntegrationConfig
  updated_at: string
}

export interface MetaLogEntry {
  id: string
  created_at: string
  integration_type: 'meta'
  event_type: string
  status: MetaLogStatus
  error_message?: string | null
  payload?: Record<string, unknown> | null
}

export interface MetaHealthRecord {
  status: MetaHealthStatus
  status_message: string
  connected: boolean
  page_count: number
  default_page_configured: boolean
  default_page_valid: boolean
  default_page_id: string | null
  token_expiry: string | null
  token_valid: boolean | null
  last_checked_at: string | null
  last_checked_source: MetaHealthSource | null
  last_webhook_at: string | null
  last_successful_ingest_at: string | null
  last_successful_sync_at: string | null
  last_sync_source: MetaSyncSource | null
  last_failure_at: string | null
  last_error_message: string | null
  consecutive_failures: number
  total_imported: number
  total_updated: number
  last_alert_state: MetaHealthStatus | null
  last_alert_at: string | null
  last_recovery_at: string | null
  updated_at: string
}

export interface MetaLeadPayload {
  leadId: string | null
  pageId: string | null
  formId: string | null
  formName: string | null
  adName: string | null
  createdTime: string | null
  fields: Record<string, string>
}

export interface MetaSyncSummary {
  total: number
  imported: number
  updated: number
  skipped: number
  failed: number
  pages: number
  forms: number
  since: string
  until: string
}

interface MetaGraphPage<T> {
  data?: T[]
  error?: { message?: string; type?: string; code?: number }
  paging?: { next?: string }
}

interface MetaFormSummary {
  id: string
  name: string
}

interface MetaLeadRow {
  id?: string
  field_data?: Array<{ name: string; values?: string[] }>
  created_time?: string
  ad_name?: string | null
  form_id?: string | null
}

function nowIso() {
  return new Date().toISOString()
}

function isoOrNull(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function formatFieldLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function nonEmpty(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T
}

async function ensureBucket(db: DbClient) {
  const { data } = await db.storage.listBuckets()
  if ((data ?? []).some((bucket) => bucket.id === BUCKET)) return
  await db.storage.createBucket(BUCKET, { public: false })
}

async function readJson<T>(db: DbClient, file: string): Promise<T | null> {
  const { data, error } = await db.storage.from(BUCKET).download(file)
  if (error || !data) return null
  try {
    const text = await data.text()
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function writeJson(db: DbClient, file: string, value: unknown) {
  await ensureBucket(db)
  const blob = new Blob([JSON.stringify(value)], { type: 'application/json' })
  const { error } = await db.storage
    .from(BUCKET)
    .upload(file, blob, { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}

function defaultMetaHealth(): MetaHealthRecord {
  return {
    status: 'broken',
    status_message: 'Meta is not connected.',
    connected: false,
    page_count: 0,
    default_page_configured: false,
    default_page_valid: false,
    default_page_id: null,
    token_expiry: null,
    token_valid: null,
    last_checked_at: null,
    last_checked_source: null,
    last_webhook_at: null,
    last_successful_ingest_at: null,
    last_successful_sync_at: null,
    last_sync_source: null,
    last_failure_at: null,
    last_error_message: null,
    consecutive_failures: 0,
    total_imported: 0,
    total_updated: 0,
    last_alert_state: null,
    last_alert_at: null,
    last_recovery_at: null,
    updated_at: nowIso(),
  }
}

function getMetaErrorMessage(error: { message?: string; type?: string; code?: number } | null | undefined) {
  if (!error) return 'Meta request failed'
  return [error.message, error.type, error.code].filter(Boolean).join(' · ')
}

function parseFieldData(fieldData: MetaLeadRow['field_data']): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const field of fieldData ?? []) {
    const name = field.name?.trim()
    if (!name) continue
    fields[name] = field.values?.[0] ?? ''
  }
  return fields
}

function buildMetaNotes(fields: Record<string, string>, formName: string | null, adName: string | null, formId: string | null) {
  const qaLines = Object.entries(fields)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${formatFieldLabel(key)}: ${value}`)
  const footer = [
    formName ? `Form: ${formName}` : null,
    adName ? `Ad: ${adName}` : null,
    formId ? `Form ID: ${formId}` : null,
  ].filter(nonEmpty)

  return [...qaLines, qaLines.length > 0 && footer.length > 0 ? '' : null, ...footer]
    .filter((line): line is string => typeof line === 'string')
    .join('\n')
    .trim()
}

function isSameOrNewer(left: string | null | undefined, right: string | null | undefined) {
  if (!left) return false
  if (!right) return true
  return new Date(left).getTime() >= new Date(right).getTime()
}

async function fetchMetaJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const payload = await response.json()
  if (!response.ok) {
    const error = payload?.error?.message ?? response.statusText
    throw new Error(error)
  }
  if (payload?.error) {
    throw new Error(getMetaErrorMessage(payload.error))
  }
  return payload as T
}

async function fetchMetaCollection<T>(url: string): Promise<T[]> {
  const items: T[] = []
  let nextUrl: string | undefined = url
  let pageCount = 0

  while (nextUrl && pageCount < 50) {
    const responsePage: MetaGraphPage<T> = await fetchMetaJson<MetaGraphPage<T>>(nextUrl)
    items.push(...(responsePage.data ?? []))
    nextUrl = responsePage.paging?.next
    pageCount += 1
  }

  return items
}

async function getAdminEmails(db: DbClient) {
  const { data } = await db.from('sales_users')
    .select('email')
    .eq('is_active', true)
    .eq('role', 'admin')
  return (data ?? []).map((row) => row.email).filter(Boolean) as string[]
}

function describeHealth(integration: MetaIntegrationRecord | null, current: Partial<MetaHealthRecord>) {
  const pages = integration?.config?.pages ?? []
  const connected = Boolean(integration?.is_active)
  const defaultPageId = integration?.config?.default_page_id ?? null
  const defaultPageConfigured = Boolean(defaultPageId)
  const defaultPageValid = defaultPageId ? pages.some((page) => page.id === defaultPageId) : false
  const tokenExpiry = isoOrNull(integration?.config?.token_expiry ?? current.token_expiry ?? null)
  const tokenValid = tokenExpiry ? new Date(tokenExpiry).getTime() > Date.now() : null
  const lastActivity = [current.last_successful_sync_at, current.last_webhook_at, current.last_successful_ingest_at]
    .filter(Boolean)
    .sort()
  const mostRecentActivity = lastActivity.length > 0 ? lastActivity[lastActivity.length - 1] : null

  let status: MetaHealthStatus = 'healthy'
  let message = 'Meta auto-leads are running normally.'

  if (!connected) {
    status = 'broken'
    message = 'Meta is not connected.'
  } else if (pages.length === 0) {
    status = 'broken'
    message = 'Meta is connected, but no Facebook pages were returned.'
  } else if (tokenValid === false) {
    status = 'broken'
    message = 'The Meta access token has expired. Reconnect Facebook.'
  } else if (!defaultPageConfigured) {
    status = 'warning'
    message = 'Choose an auto-import page so new Meta leads can enter automatically.'
  } else if (!defaultPageValid) {
    status = 'warning'
    message = 'The selected auto-import page is no longer available. Pick a new page.'
  } else if (!mostRecentActivity) {
    status = 'warning'
    message = 'Meta is connected, but no successful webhook or sync has been recorded yet.'
  } else if (Date.now() - new Date(mostRecentActivity).getTime() > SYNC_STALE_MS) {
    status = 'warning'
    message = 'No successful Meta webhook or sync has been recorded in the last 24 hours.'
  } else if (
    current.last_failure_at &&
    isSameOrNewer(current.last_failure_at, current.last_successful_sync_at) &&
    !current.last_successful_ingest_at
  ) {
    status = 'warning'
    message = current.last_error_message
      ? `Meta needs attention: ${current.last_error_message}`
      : 'Meta needs attention.'
  }

  return {
    status,
    message,
    connected,
    pageCount: pages.length,
    defaultPageConfigured,
    defaultPageValid,
    defaultPageId,
    tokenExpiry,
    tokenValid,
  }
}

async function persistHealth(
  db: DbClient,
  integration: MetaIntegrationRecord | null,
  overrides: Partial<MetaHealthRecord>,
  options?: { notify?: boolean }
) {
  const previous = (await readJson<MetaHealthRecord>(db, HEALTH_FILE)) ?? defaultMetaHealth()
  const merged: MetaHealthRecord = {
    ...previous,
    ...compactObject(overrides),
    updated_at: nowIso(),
  }
  const descriptor = describeHealth(integration, merged)
  const next: MetaHealthRecord = {
    ...merged,
    status: descriptor.status,
    status_message: descriptor.message,
    connected: descriptor.connected,
    page_count: descriptor.pageCount,
    default_page_configured: descriptor.defaultPageConfigured,
    default_page_valid: descriptor.defaultPageValid,
    default_page_id: descriptor.defaultPageId,
    token_expiry: descriptor.tokenExpiry,
    token_valid: descriptor.tokenValid,
  }

  if (options?.notify) {
    const transitionedToAlert =
      next.connected &&
      next.status !== 'healthy' &&
      previous.last_alert_state !== next.status
    const transitionedToRecovery =
      previous.status !== 'healthy' &&
      next.status === 'healthy'

    if (transitionedToAlert || transitionedToRecovery) {
      const adminEmails = await getAdminEmails(db)
      await sendMetaHealthEmail(adminEmails, {
        status: next.status,
        title: transitionedToRecovery ? 'Meta auto-leads recovered' : 'Meta auto-leads need attention',
        message: next.status_message,
        checkedAt: next.last_checked_at ?? next.updated_at,
        lastWebhookAt: next.last_webhook_at,
        lastSyncAt: next.last_successful_sync_at,
      })

      next.last_alert_state = transitionedToRecovery ? 'healthy' : next.status
      next.last_alert_at = nowIso()
      if (transitionedToRecovery) next.last_recovery_at = next.last_alert_at
    }
  }

  await writeJson(db, HEALTH_FILE, next)
  return next
}

export async function readMetaIntegration(db: DbClient) {
  return readJson<MetaIntegrationRecord>(db, CONFIG_FILE)
}

export async function writeMetaIntegration(db: DbClient, integration: MetaIntegrationRecord) {
  await writeJson(db, CONFIG_FILE, integration)
}

export async function readMetaLogs(db: DbClient) {
  return (await readJson<MetaLogEntry[]>(db, LOGS_FILE)) ?? []
}

export async function appendMetaLog(
  db: DbClient,
  log: Omit<MetaLogEntry, 'id' | 'created_at' | 'integration_type'>
) {
  const existing = await readMetaLogs(db)
  const entry: MetaLogEntry = {
    ...log,
    id: crypto.randomUUID(),
    created_at: nowIso(),
    integration_type: 'meta',
  }
  const updated: MetaLogEntry[] = [
    entry,
    ...existing,
  ].slice(0, 100)
  await writeJson(db, LOGS_FILE, updated)
}

export async function readMetaHealth(db: DbClient) {
  return (await readJson<MetaHealthRecord>(db, HEALTH_FILE)) ?? defaultMetaHealth()
}

export function resolvePublicAppUrl(origin?: string) {
  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '')
  }
  return (origin ?? 'http://localhost:3000').replace(/\/$/, '')
}

export function getMetaCallbackUrl(origin?: string) {
  return `${resolvePublicAppUrl(origin)}/api/sales/integrations/meta/callback`
}

export function getMetaWebhookUrl(origin?: string) {
  return `${resolvePublicAppUrl(origin)}/api/sales/integrations/meta/webhook`
}

export async function refreshMetaHealth(
  db: DbClient,
  overrides: Partial<MetaHealthRecord>,
  options?: { notify?: boolean }
) {
  const integration = await readMetaIntegration(db)
  return persistHealth(db, integration, overrides, options)
}

export async function markMetaDisconnected(db: DbClient) {
  await persistHealth(
    db,
    null,
    {
      last_checked_at: nowIso(),
      last_checked_source: 'disconnect',
      last_error_message: null,
      consecutive_failures: 0,
      last_alert_state: null,
      last_alert_at: null,
    },
    { notify: false }
  )
}

export async function markMetaConnected(db: DbClient, integration: MetaIntegrationRecord) {
  await persistHealth(
    db,
    integration,
    {
      last_checked_at: nowIso(),
      last_checked_source: 'connect',
      last_error_message: null,
      consecutive_failures: 0,
    },
    { notify: false }
  )
}

async function updateIntegrationStats(
  db: DbClient,
  integration: MetaIntegrationRecord,
  input: {
    source: MetaSyncSource
    imported: number
    updated: number
    at?: string
  }
) {
  const stamp = input.at ?? nowIso()
  const next: MetaIntegrationRecord = {
    ...integration,
    config: {
      ...integration.config,
      last_sync_at: stamp,
      last_sync_source: input.source,
      sync_stats: {
        total_imported: (integration.config.sync_stats?.total_imported ?? 0) + input.imported,
        total_updated: (integration.config.sync_stats?.total_updated ?? 0) + input.updated,
      },
    },
    updated_at: stamp,
  }
  await writeMetaIntegration(db, next)
  return next
}

async function findExistingLead(
  db: DbClient,
  options: {
    metaLeadId: string | null
    email: string | null
    phone: string | null
  }
) {
  if (options.metaLeadId) {
    const { data } = await db.from('sales_leads')
      .select('id, company_name, contact_person, email, phone, notes, lead_source, meta_lead_id')
      .eq('meta_lead_id', options.metaLeadId)
      .maybeSingle()
    if (data) return { match: data, strategy: 'meta_lead_id' as const }

    const filters = [options.email ? `email.eq.${options.email}` : null, options.phone ? `phone.eq.${options.phone}` : null]
      .filter(Boolean)
      .join(',')
    if (filters) {
      const { data: legacy } = await db.from('sales_leads')
        .select('id, company_name, contact_person, email, phone, notes, lead_source, meta_lead_id')
        .eq('lead_source', 'meta')
        .is('meta_lead_id', null)
        .or(filters)
        .order('created_at', { ascending: false })
        .limit(2)
      if ((legacy ?? []).length === 1) return { match: legacy?.[0], strategy: 'legacy_contact' as const }
    }
    return { match: null, strategy: null }
  }

  const filters = [options.email ? `email.eq.${options.email}` : null, options.phone ? `phone.eq.${options.phone}` : null]
    .filter(Boolean)
    .join(',')

  if (!filters) return { match: null, strategy: null }

  const { data } = await db.from('sales_leads')
    .select('id, company_name, contact_person, email, phone, notes, lead_source, meta_lead_id')
    .or(filters)
    .order('created_at', { ascending: false })
    .limit(2)

  if ((data ?? []).length === 1) return { match: data?.[0], strategy: 'contact' as const }
  return { match: null, strategy: null }
}

async function ingestMetaLead(
  db: DbClient,
  payload: MetaLeadPayload
) {
  const identity = extractMetaLeadIdentity({ fields: payload.fields })
  const fallbackName = identity.contactPerson ?? identity.companyName ?? 'Meta Lead'
  const companyName = identity.companyName ?? fallbackName
  const email = identity.email ?? null
  const phone = identity.phone ?? null
  const notes = buildMetaNotes(payload.fields, payload.formName, payload.adName, payload.formId)
  const metaPayload = {
    fields: payload.fields,
    lead_id: payload.leadId,
    page_id: payload.pageId,
    created_time: payload.createdTime,
    ad_name: payload.adName,
    form_id: payload.formId,
    form_name: payload.formName,
  }

  const { match, strategy } = await findExistingLead(db, {
    metaLeadId: payload.leadId,
    email,
    phone,
  })

  if (match) {
    const updates: Record<string, unknown> = {
      notes: notes || match.notes,
      meta_raw_payload: metaPayload,
      meta_lead_id: payload.leadId ?? match.meta_lead_id ?? null,
      meta_page_id: payload.pageId ?? null,
      meta_form_id: payload.formId ?? null,
    }

    if (!nonEmpty(match.email) && email) updates.email = email
    if (!nonEmpty(match.phone) && phone) updates.phone = phone
    if (isUnknownLeadValue(match.contact_person) && fallbackName !== 'Meta Lead') {
      updates.contact_person = fallbackName
    }
    if (isUnknownLeadValue(match.company_name) && companyName !== 'Meta Lead') {
      updates.company_name = companyName
    }

    const { data, error } = await db.from('sales_leads')
      .update(updates)
      .eq('id', match.id)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { action: 'updated' as const, leadId: data.id, strategy }
  }

  const assignedRepId = await getNextAssignee()
  const insertPayload = {
    contact_person: fallbackName,
    company_name: companyName,
    email,
    phone,
    lead_source: 'meta',
    pipeline_stage: 'new_lead',
    service_type: 'marketing',
    priority: 'medium',
    notes,
    meta_lead_id: payload.leadId,
    meta_page_id: payload.pageId,
    meta_form_id: payload.formId,
    meta_raw_payload: metaPayload,
    ...(assignedRepId ? { assigned_rep_id: assignedRepId } : {}),
  }

  const { data, error } = await db.from('sales_leads')
    .insert(insertPayload)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return { action: 'imported' as const, leadId: data.id, strategy: 'insert' as const }
}

async function fetchForms(page: MetaPageConfig) {
  return fetchMetaCollection<MetaFormSummary>(
    `https://graph.facebook.com/${META_API_VERSION}/${page.id}/leadgen_forms?fields=id,name&limit=100&access_token=${page.access_token}`
  )
}

async function fetchFormLeads(page: MetaPageConfig, form: MetaFormSummary, since: number, until: number) {
  const filtering = JSON.stringify([
    { field: 'time_created', operator: 'GREATER_THAN', value: since },
    { field: 'time_created', operator: 'LESS_THAN_OR_EQUAL', value: until },
  ])

  return fetchMetaCollection<MetaLeadRow>(
    `https://graph.facebook.com/${META_API_VERSION}/${form.id}/leads?fields=id,field_data,created_time,ad_name,form_id&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${page.access_token}`
  )
}

function selectPages(
  integration: MetaIntegrationRecord,
  pageId?: string | null
) {
  const pages = integration.config.pages ?? []
  if (pageId === 'all') return pages
  if (pageId) {
    return pages.filter((page) => page.id === pageId)
  }
  if (integration.config.default_page_id) {
    return pages.filter((page) => page.id === integration.config.default_page_id)
  }
  return pages
}

export async function syncMetaWindow(
  db: DbClient,
  options: {
    source: MetaSyncSource
    since: number
    until: number
    pageId?: string | null
  }
): Promise<MetaSyncSummary> {
  const integration = await readMetaIntegration(db)
  if (!integration?.is_active) {
    const message = 'Meta is not connected.'
    await persistHealth(
      db,
      integration ?? null,
      {
        last_checked_at: nowIso(),
        last_checked_source: options.source,
        last_failure_at: nowIso(),
        last_error_message: message,
        consecutive_failures: ((await readMetaHealth(db)).consecutive_failures ?? 0) + 1,
      },
      { notify: options.source === 'cron' }
    )
    throw new Error(message)
  }

  const pages = selectPages(integration, options.pageId)
  if (pages.length === 0) {
    const message = integration.config.default_page_id
      ? 'The selected auto-import page could not be found among connected pages.'
      : 'No Meta pages are connected.'
    await persistHealth(
      db,
      integration,
      {
        last_checked_at: nowIso(),
        last_checked_source: options.source,
        last_failure_at: nowIso(),
        last_error_message: message,
        consecutive_failures: ((await readMetaHealth(db)).consecutive_failures ?? 0) + 1,
      },
      { notify: options.source === 'cron' }
    )
    throw new Error(message)
  }

  const summary: MetaSyncSummary = {
    total: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    pages: pages.length,
    forms: 0,
    since: new Date(options.since * 1000).toISOString(),
    until: new Date(options.until * 1000).toISOString(),
  }

  for (const page of pages) {
    const forms = await fetchForms(page)
    summary.forms += forms.length

    for (const form of forms) {
      const leads = await fetchFormLeads(page, form, options.since, options.until)
      summary.total += leads.length

      for (const lead of leads) {
        try {
          const action = await ingestMetaLead(db, {
            leadId: lead.id ?? null,
            pageId: page.id,
            formId: lead.form_id ?? form.id,
            formName: form.name ?? null,
            adName: lead.ad_name ?? null,
            createdTime: isoOrNull(lead.created_time),
            fields: parseFieldData(lead.field_data),
          })

          if (action.action === 'imported') summary.imported += 1
          else summary.updated += 1
        } catch {
          summary.failed += 1
        }
      }
    }
  }

  const stamp = nowIso()
  const updatedIntegration = await updateIntegrationStats(db, integration, {
    source: options.source,
    imported: summary.imported,
    updated: summary.updated,
    at: stamp,
  })

  await appendMetaLog(db, {
    event_type: options.source === 'manual_import' ? 'manual_import' : 'scheduled_sync',
    status: summary.failed > 0 && summary.imported === 0 && summary.updated === 0 ? 'error' : summary.failed > 0 ? 'warning' : 'success',
    error_message: summary.failed > 0 ? `${summary.failed} lead${summary.failed === 1 ? '' : 's'} failed during sync.` : null,
    payload: {
      imported: summary.imported,
      updated: summary.updated,
      skipped: summary.skipped,
      total: summary.total,
      pages: summary.pages,
      forms: summary.forms,
      since: summary.since,
      until: summary.until,
      source: options.source,
    },
  })

  await persistHealth(
    db,
    updatedIntegration,
    {
      last_checked_at: stamp,
      last_checked_source: options.source,
      last_successful_sync_at: stamp,
      last_sync_source: options.source,
      last_successful_ingest_at: summary.imported > 0 || summary.updated > 0 ? stamp : undefined,
      last_failure_at: summary.failed > 0 && summary.imported === 0 && summary.updated === 0 ? stamp : null,
      last_error_message: summary.failed > 0 && summary.imported === 0 && summary.updated === 0
        ? `${summary.failed} lead${summary.failed === 1 ? '' : 's'} failed during sync.`
        : null,
      consecutive_failures: summary.failed > 0 && summary.imported === 0 && summary.updated === 0
        ? ((await readMetaHealth(db)).consecutive_failures ?? 0) + 1
        : 0,
      total_imported: (await readMetaHealth(db)).total_imported + summary.imported,
      total_updated: (await readMetaHealth(db)).total_updated + summary.updated,
    },
    { notify: options.source === 'cron' }
  )

  return summary
}

export async function processMetaWebhookLead(
  db: DbClient,
  payload: { leadgenId: string; pageId: string }
) {
  const integration = await readMetaIntegration(db)
  const receivedAt = nowIso()

  if (!integration?.is_active) {
    await persistHealth(
      db,
      integration ?? null,
      {
        last_webhook_at: receivedAt,
        last_checked_at: receivedAt,
        last_checked_source: 'webhook',
        last_failure_at: receivedAt,
        last_error_message: 'Received a Meta webhook while the integration was disconnected.',
      },
      { notify: false }
    )
    return { action: 'skipped' as const, reason: 'inactive' }
  }

  if (integration.config.default_page_id && integration.config.default_page_id !== payload.pageId) {
    await persistHealth(
      db,
      integration,
      {
        last_webhook_at: receivedAt,
        last_checked_at: receivedAt,
        last_checked_source: 'webhook',
      },
      { notify: false }
    )
    return { action: 'skipped' as const, reason: 'page_filtered' }
  }

  const pageToken =
    integration.config.pages?.find((page) => page.id === payload.pageId)?.access_token ??
    integration.config.page_access_token ??
    null

  if (!pageToken) {
    const message = 'No page access token found for this Meta page.'
    await appendMetaLog(db, {
      event_type: 'lead_fetch_failed',
      status: 'error',
      error_message: message,
      payload: { leadgen_id: payload.leadgenId, page_id: payload.pageId },
    })
    await persistHealth(
      db,
      integration,
      {
        last_webhook_at: receivedAt,
        last_checked_at: receivedAt,
        last_checked_source: 'webhook',
        last_failure_at: receivedAt,
        last_error_message: message,
        consecutive_failures: ((await readMetaHealth(db)).consecutive_failures ?? 0) + 1,
      },
      { notify: false }
    )
    return { action: 'failed' as const, reason: 'missing_page_token' }
  }

  try {
    const lead = await fetchMetaJson<MetaLeadRow>(
      `https://graph.facebook.com/${META_API_VERSION}/${payload.leadgenId}?fields=id,field_data,created_time,ad_name,form_id&access_token=${pageToken}`
    )
    const outcome = await ingestMetaLead(db, {
      leadId: lead.id ?? payload.leadgenId,
      pageId: payload.pageId,
      formId: lead.form_id ?? null,
      formName: null,
      adName: lead.ad_name ?? null,
      createdTime: isoOrNull(lead.created_time),
      fields: parseFieldData(lead.field_data),
    })

    const updatedIntegration = await updateIntegrationStats(db, integration, {
      source: 'webhook',
      imported: outcome.action === 'imported' ? 1 : 0,
      updated: outcome.action === 'updated' ? 1 : 0,
      at: receivedAt,
    })

    await appendMetaLog(db, {
      event_type: outcome.action === 'imported' ? 'lead_created' : 'lead_updated',
      status: 'success',
      error_message: null,
      payload: {
        lead_id: outcome.leadId,
        meta_lead_id: lead.id ?? payload.leadgenId,
        page_id: payload.pageId,
        action: outcome.action,
        match_strategy: outcome.strategy,
      },
    })

    await persistHealth(
      db,
      updatedIntegration,
      {
        last_webhook_at: receivedAt,
        last_checked_at: receivedAt,
        last_checked_source: 'webhook',
        last_successful_ingest_at: receivedAt,
        last_sync_source: 'webhook',
        last_error_message: null,
        last_failure_at: null,
        consecutive_failures: 0,
        total_imported: (await readMetaHealth(db)).total_imported + (outcome.action === 'imported' ? 1 : 0),
        total_updated: (await readMetaHealth(db)).total_updated + (outcome.action === 'updated' ? 1 : 0),
      },
      { notify: false }
    )

    return outcome
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Meta lead processing failed.'
    await appendMetaLog(db, {
      event_type: 'lead_fetch_failed',
      status: 'error',
      error_message: message,
      payload: { leadgen_id: payload.leadgenId, page_id: payload.pageId },
    })
    await persistHealth(
      db,
      integration,
      {
        last_webhook_at: receivedAt,
        last_checked_at: receivedAt,
        last_checked_source: 'webhook',
        last_failure_at: receivedAt,
        last_error_message: message,
        consecutive_failures: ((await readMetaHealth(db)).consecutive_failures ?? 0) + 1,
      },
      { notify: false }
    )
    return { action: 'failed' as const, reason: message }
  }
}

export function getCronWindow(health: MetaHealthRecord) {
  const until = Math.floor(Date.now() / 1000)
  const lastSuccessTs = health.last_successful_sync_at
    ? Math.floor(new Date(health.last_successful_sync_at).getTime() / 1000)
    : null
  const since = Math.max(
    until - MANUAL_IMPORT_LOOKBACK_SECONDS,
    (lastSuccessTs ?? until - SYNC_BOOTSTRAP_LOOKBACK_SECONDS) - SYNC_OVERLAP_SECONDS
  )

  return { since, until }
}

export function getManualImportWindow() {
  const until = Math.floor(Date.now() / 1000)
  return {
    since: until - MANUAL_IMPORT_LOOKBACK_SECONDS,
    until,
  }
}
