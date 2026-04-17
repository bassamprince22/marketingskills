import { getServiceClient } from '@/lib/supabase'

const BUCKET   = 'sales-config'
const SETTINGS = 'settings.json'

export interface AutoAssignSettings {
  enabled:              boolean
  rep_pool:             string[]
  last_assigned_rep_id: string | null
}

export interface NotificationTypeConfig {
  enabled:          boolean
  threshold_hours?: number
  threshold_days?:  number
}

export interface SystemNotificationSettings {
  new_leads:   NotificationTypeConfig
  urgent:      NotificationTypeConfig
  overdue:     NotificationTypeConfig
  unassigned:  NotificationTypeConfig
  stuck:       NotificationTypeConfig
  hot_deals:   NotificationTypeConfig
}

export interface NotificationSettings {
  system: SystemNotificationSettings
}

export interface Settings {
  auto_assign:   AutoAssignSettings
  notifications: NotificationSettings
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  system: {
    new_leads:   { enabled: true, threshold_hours: 1  },
    urgent:      { enabled: true, threshold_hours: 24 },
    overdue:     { enabled: true },
    unassigned:  { enabled: true },
    stuck:       { enabled: true, threshold_days: 7   },
    hot_deals:   { enabled: true, threshold_days: 14  },
  },
}

const DEFAULT: Settings = {
  auto_assign:   { enabled: false, rep_pool: [], last_assigned_rep_id: null },
  notifications: DEFAULT_NOTIFICATIONS,
}

async function readSettings(db: ReturnType<typeof getServiceClient>): Promise<Settings> {
  const { data, error } = await db.storage.from(BUCKET).download(SETTINGS)
  if (error || !data) return DEFAULT
  try {
    const parsed = JSON.parse(await data.text())
    return {
      ...DEFAULT,
      ...parsed,
      notifications: {
        system: { ...DEFAULT_NOTIFICATIONS.system, ...(parsed.notifications?.system ?? {}) },
      },
    }
  } catch {
    return DEFAULT
  }
}

async function writeSettings(db: ReturnType<typeof getServiceClient>, s: Settings) {
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' })
  await db.storage.from(BUCKET).upload(SETTINGS, blob, { upsert: true, contentType: 'application/json' })
}

// Returns the next rep ID to assign to (round-robin), or null if no reps
export async function getNextAssignee(): Promise<string | null> {
  const db  = getServiceClient()
  const cfg = await readSettings(db)
  if (!cfg.auto_assign.enabled) return null

  // Get eligible reps
  let q = db.from('sales_users').select('id').eq('is_active', true).in('role', ['rep', 'manager']).order('name')
  if (cfg.auto_assign.rep_pool.length > 0) {
    q = q.in('id', cfg.auto_assign.rep_pool)
  }
  const { data: reps } = await q
  if (!reps?.length) return null

  // Find next rep in rotation
  const ids   = reps.map(r => r.id)
  const last  = cfg.auto_assign.last_assigned_rep_id
  const idx   = last ? ids.indexOf(last) : -1
  const next  = ids[(idx + 1) % ids.length]

  // Persist the new pointer
  await writeSettings(db, {
    ...cfg,
    auto_assign: { ...cfg.auto_assign, last_assigned_rep_id: next },
  })

  return next
}

export { readSettings, writeSettings }
