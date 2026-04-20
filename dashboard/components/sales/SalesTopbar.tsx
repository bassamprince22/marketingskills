'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Notification } from '@/app/api/sales/notifications/route'

type ThemeMode = 'dark' | 'light'
type DensityMode = 'compact' | 'comfortable'

interface SalesTopbarProps {
  onOpenMenu: () => void
  theme: ThemeMode
  density: DensityMode
  onThemeChange: (theme: ThemeMode) => void
  onDensityChange: (density: DensityMode) => void
  showPageActions?: boolean
}

const POLL_INTERVAL = 60_000

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
  showPageActions = false,
}: SalesTopbarProps) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'rep'
  const isAdmin = role === 'admin'

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

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

      {showPageActions && (
        <div className="mission-page-actions">
          <button className="mission-page-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
          </button>
          <button className="mission-page-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>Last 30 days</span>
          </button>
          <Link href="/sales/leads/new" className="fadaa-btn mission-page-new-lead">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>New Lead</span>
          </Link>
        </div>
      )}
    </header>
  )
}
