'use client'

import { useEffect, useState } from 'react'
import type { SystemNotificationSettings, NotificationTypeConfig } from '@/lib/sales/autoAssign'
import { DEFAULT_NOTIFICATIONS } from '@/lib/sales/autoAssign'

/* ─── Personal prefs (localStorage) ──────────────────────────────────── */
const PREFS_KEY = 'fadaa_notif_prefs'

export interface NotifPrefs {
  toast_enabled: boolean
  panel_enabled: boolean
}

export function getNotifPrefs(): NotifPrefs {
  try { return { toast_enabled: true, panel_enabled: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } }
  catch { return { toast_enabled: true, panel_enabled: true } }
}

function saveNotifPrefs(p: NotifPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p))
}

/* ─── Shared sub-components ───────────────────────────────────────────── */
function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <p className="t-body" style={{ fontWeight: 500 }}>{label}</p>
        {sub && <p className="t-caption" style={{ marginTop: 2 }}>{sub}</p>}
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        style={{
          width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: on ? 'var(--brand-primary)' : 'var(--border-strong)',
          position: 'relative', flexShrink: 0,
          transition: 'background 0.2s',
          boxShadow: on ? '0 0 8px var(--brand-primary-dim)' : 'none',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, width: 16, height: 16,
          background: '#fff', borderRadius: '50%',
          left: on ? 21 : 3,
          transition: 'left 0.18s var(--ease-spring)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )
}

/* ─── System notification type row ───────────────────────────────────── */
const TYPE_META: Record<string, { label: string; desc: string; severity: string; hasHours?: boolean; hasDays?: boolean }> = {
  new_leads:   { label: 'New Leads',           severity: 'info',     desc: 'Alert when new leads are created',                         hasHours: true  },
  urgent:      { label: 'Urgent Leads',         severity: 'critical', desc: 'Alert when urgent leads have no activity',                  hasHours: true  },
  overdue:     { label: 'Overdue Follow-ups',   severity: 'critical', desc: 'Alert when follow-up dates pass with no action',            },
  unassigned:  { label: 'Unassigned Leads',     severity: 'warning',  desc: 'Alert when leads have no rep assigned',                    },
  stuck:       { label: 'Idle Leads',           severity: 'warning',  desc: 'Alert when leads have no stage change or update',          hasDays: true   },
  hot_deals:   { label: 'Stalled Deals',        severity: 'critical', desc: 'Alert when negotiation/contract leads go quiet',           hasDays: true   },
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--brand-red-text)',
  warning:  'var(--brand-amber-text)',
  info:     'var(--brand-blue-text)',
}

function TypeRow({
  id, cfg, onChange,
}: {
  id: string
  cfg: NotificationTypeConfig
  onChange: (next: NotificationTypeConfig) => void
}) {
  const meta = TYPE_META[id]
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 8, color: SEVERITY_COLOR[meta.severity], marginTop: 1 }}>●</span>
          <div>
            <p className="t-body" style={{ fontWeight: 500 }}>{meta.label}</p>
            <p className="t-caption" style={{ marginTop: 1 }}>{meta.desc}</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={cfg.enabled}
          onClick={() => onChange({ ...cfg, enabled: !cfg.enabled })}
          style={{
            width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: cfg.enabled ? 'var(--brand-primary)' : 'var(--border-strong)',
            position: 'relative',
            transition: 'background 0.2s',
            boxShadow: cfg.enabled ? '0 0 8px var(--brand-primary-dim)' : 'none',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, width: 16, height: 16,
            background: '#fff', borderRadius: '50%',
            left: cfg.enabled ? 21 : 3,
            transition: 'left 0.18s var(--ease-spring)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>

      {cfg.enabled && (meta.hasHours || meta.hasDays) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 18 }}>
          <span className="t-caption">Threshold:</span>
          <input
            type="number"
            min={1}
            max={meta.hasHours ? 168 : 90}
            className="fadaa-input"
            style={{ width: 68, padding: '4px 8px', fontSize: 12 }}
            value={meta.hasHours ? (cfg.threshold_hours ?? 1) : (cfg.threshold_days ?? 7)}
            onChange={e => {
              const v = Math.max(1, parseInt(e.target.value) || 1)
              onChange(meta.hasHours ? { ...cfg, threshold_hours: v } : { ...cfg, threshold_days: v })
            }}
          />
          <span className="t-caption">{meta.hasHours ? 'hours' : 'days'}</span>
        </div>
      )}
    </div>
  )
}

/* ─── Personal prefs section ──────────────────────────────────────────── */
function PersonalPrefsSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>({ toast_enabled: true, panel_enabled: true })
  const [saved,  setSaved] = useState(false)

  useEffect(() => { setPrefs(getNotifPrefs()) }, [])

  function update(next: NotifPrefs) {
    setPrefs(next)
    saveNotifPrefs(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div>
          <h3 className="t-section-title">My Notification Preferences</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>Control how you receive alerts in this browser.</p>
        </div>
        {saved && <span style={{ color: 'var(--brand-green-text)', fontSize: 12 }}>✓ Saved</span>}
      </div>

      <Toggle
        on={prefs.toast_enabled}
        onChange={v => update({ ...prefs, toast_enabled: v })}
        label="Pop-up Toasts"
        sub="Show slide-in alerts for new notifications"
      />
      <Toggle
        on={prefs.panel_enabled}
        onChange={v => update({ ...prefs, panel_enabled: v })}
        label="Dashboard Alert Panel"
        sub="Show the attention panel at the top of your dashboard"
      />
    </div>
  )
}

/* ─── System settings section (manager / admin only) ─────────────────── */
function SystemSettingsSection() {
  const [sys,     setSys]     = useState<SystemNotificationSettings>(DEFAULT_NOTIFICATIONS.system)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  useEffect(() => {
    fetch('/api/sales/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.notifications?.system) setSys(d.settings.notifications.system)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/sales/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: { system: sys } }),
    })
    setSaving(false)
    if (res.ok) flash('System notification settings saved', 'ok')
    else flash('Failed to save', 'err')
  }

  function updateType(id: string, next: NotificationTypeConfig) {
    setSys(prev => ({ ...prev, [id]: next }))
  }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div>
          <h3 className="t-section-title">System Notification Settings</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>Control which alerts fire for all managers — affects the dashboard panel and toasts.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {msg && (
            <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {msgType === 'ok' ? '✓' : '⚠'} {msg}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || loading}
            className="fadaa-btn fadaa-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saving ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
        </div>
      ) : (
        <div>
          <p className="t-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>Notification Types</p>
          {(Object.keys(sys) as (keyof SystemNotificationSettings)[]).map(id => (
            <TypeRow
              key={id}
              id={id}
              cfg={sys[id]}
              onChange={next => updateType(id, next)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Exported card (role-aware) ──────────────────────────────────────── */
export function NotificationSettingsCard({ role }: { role: string }) {
  const isPrivileged = role === 'manager' || role === 'admin'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {isPrivileged && <SystemSettingsSection />}
      <PersonalPrefsSection />
    </div>
  )
}
