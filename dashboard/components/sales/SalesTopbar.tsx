'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { Notification } from '@/app/api/sales/notifications/route'
import AiChatDrawer from '@/components/sales/AiChatDrawer'

type ThemeMode = 'dark' | 'light'
type DensityMode = 'compact' | 'comfortable'
type PageActionPreset = 'none' | 'dashboard' | 'records'

interface SalesTopbarProps {
  onOpenMenu: () => void
  theme: ThemeMode
  density: DensityMode
  onThemeChange: (theme: ThemeMode) => void
  onDensityChange: (density: DensityMode) => void
  pageActionPreset?: PageActionPreset
}

const POLL_INTERVAL = 60_000
const DASHBOARD_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
] as const

const RECORD_RANGES = [
  { value: '', label: 'All time' },
  ...DASHBOARD_RANGES,
] as const

const SEVERITY_TONE: Record<string, string> = {
  critical: 'var(--brand-red-text)',
  warning: 'var(--brand-amber-text)',
  info: 'var(--brand-primary-text)',
}

export function SalesTopbar({
  onOpenMenu,
  theme,
  density,
  onThemeChange,
  onDensityChange,
  pageActionPreset = 'none',
}: SalesTopbarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'rep'
  const isAdmin = role === 'admin'

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function loadNotifications() {
      try {
        const res = await fetch('/api/sales/notifications')
        const data = await res.json()
        if (active) setNotifications(data.notifications ?? [])
      } catch {
        if (active) setNotifications([])
      }
    }

    loadNotifications()
    const interval = setInterval(loadNotifications, POLL_INTERVAL)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const visibleNotifications = useMemo(
    () => notifications.filter(n => n.count > 0),
    [notifications]
  )
  const rangeOptions = pageActionPreset === 'records' ? RECORD_RANGES : DASHBOARD_RANGES
  const currentRange = searchParams.get('dateRange') ?? (pageActionPreset === 'records' ? '' : '30d')

  function setDashboardRange(nextRange: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextRange) {
      params.set('dateRange', nextRange)
    } else {
      params.delete('dateRange')
    }
    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  return (
    <header className="mission-topbar">
      <div className="mission-topbar-left">
        <button className="mission-menu-btn" onClick={onOpenMenu} aria-label="Open navigation">
          <span />
          <span />
          <span />
        </button>

        <div className="mission-search">
          <svg className="mission-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="fadaa-input"
            readOnly
            value=""
            placeholder="Mission search coming soon"
            aria-label="Global search coming soon"
          />
          <span className="mission-search-kbd">Ctrl+K</span>
        </div>
      </div>

      <div className="mission-topbar-actions">
        <div className="mission-pill-group" aria-label="Language controls">
          <button className="mission-pill active">EN</button>
        </div>

        <div className="mission-pill-group" aria-label="Theme controls">
          <button
            className={`mission-pill${theme === 'dark' ? ' active' : ''}`}
            onClick={() => onThemeChange('dark')}
          >
            Dark
          </button>
          <button
            className={`mission-pill${theme === 'light' ? ' active' : ''}`}
            onClick={() => onThemeChange('light')}
          >
            Light
          </button>
        </div>

        {isAdmin && (
          <div className="mission-pill-group" aria-label="Density controls">
            <button
              className={`mission-pill${density === 'compact' ? ' active' : ''}`}
              onClick={() => onDensityChange('compact')}
            >
              Compact
            </button>
            <button
              className={`mission-pill${density === 'comfortable' ? ' active' : ''}`}
              onClick={() => onDensityChange('comfortable')}
            >
              Comfortable
            </button>
          </div>
        )}

        {/* AI Copilot button */}
        <button
          onClick={() => setAiOpen(true)}
          aria-label="Open AI Sales Copilot"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 12px 5px 6px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,142,247,0.15))',
            border: '1px solid rgba(124,58,237,0.35)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(79,142,247,0.25))'
            el.style.borderColor = 'rgba(124,58,237,0.6)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,142,247,0.15))'
            el.style.borderColor = 'rgba(124,58,237,0.35)'
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #4F8EF7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>
            AI
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
            Fadaa AI
          </span>
        </button>

        <div className="mission-notifications-wrap">
          <button
            className="mission-icon-btn"
            onClick={() => setNotificationsOpen(open => !open)}
            aria-label="Notifications"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
            {visibleNotifications.length > 0 && (
              <span className="mission-notification-count">{visibleNotifications.length}</span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <button
                className="mission-popover-scrim"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
              />
              <div className="mission-popover">
                <div className="mission-popover-header">
                  <div>
                    <p className="t-section-title">Notifications</p>
                    <p className="t-caption">
                      {visibleNotifications.length} active alert{visibleNotifications.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Link href="/sales/dashboard" className="mission-popover-link" onClick={() => setNotificationsOpen(false)}>
                    Open dashboard
                  </Link>
                </div>

                <div className="mission-popover-list">
                  {visibleNotifications.length === 0 ? (
                    <div className="mission-popover-empty">
                      <p className="t-card-title">All clear</p>
                      <p className="t-caption">No urgent notifications right now.</p>
                    </div>
                  ) : (
                    visibleNotifications.slice(0, 6).map(notification => (
                      <Link
                        key={notification.id}
                        href={notification.filterUrl}
                        className="mission-notification-item"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <div
                          className="mission-notification-dot"
                          style={{ background: SEVERITY_TONE[notification.severity] ?? 'var(--brand-primary-text)' }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p className="t-card-title">{notification.title}</p>
                          <p className="t-caption">{notification.message}</p>
                        </div>
                        <span className="badge badge-blue">{notification.count}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Link href="/sales/leads/new" className="fadaa-btn mission-primary-cta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span>New Lead</span>
        </Link>
      </div>

      {pageActionPreset !== 'none' && (
        <div className="mission-page-actions">
          {pageActionPreset === 'dashboard' && (
            <Link href="/sales/reports" className="mission-page-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </Link>
          )}
          <div className="mission-page-chip" style={{ padding: '0 14px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <select
              value={currentRange}
              onChange={(event) => setDashboardRange(event.target.value)}
              aria-label="Dashboard date range"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                font: 'inherit',
                outline: 'none',
                cursor: 'pointer',
                paddingRight: 4,
              }}
            >
              {rangeOptions.map((range) => (
                <option key={range.value} value={range.value} style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          {pageActionPreset === 'dashboard' && (
            <Link href="/sales/leads/new" className="fadaa-btn mission-page-new-lead">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span>New Lead</span>
            </Link>
          )}
        </div>
      )}

      <AiChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} userRole={role} />
    </header>
  )
}
