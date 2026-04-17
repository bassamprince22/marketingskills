'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/app/api/sales/notifications/route'

const SEVERITY: Record<string, { bg: string; border: string; icon: string; color: string }> = {
  critical: { bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.2)',  icon: '⚠', color: '#F87171' },
  warning:  { bg: 'rgba(217,119,6,0.07)',  border: 'rgba(217,119,6,0.2)',  icon: '◈', color: '#F59E0B' },
  info:     { bg: 'rgba(79,142,247,0.07)', border: 'rgba(79,142,247,0.2)', icon: '✦', color: '#7CB9FC' },
}

const DISMISS_KEY = 'fadaa_notif_dismissed'

function getDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '{}') } catch { return {} }
}
function saveDismissed(d: Record<string, number>) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify(d))
}

export function NotificationPanel() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissed,     setDismissed]     = useState<Record<string, number>>({})
  const [loaded,        setLoaded]        = useState(false)

  useEffect(() => {
    const d = getDismissed()
    setDismissed(d)
    fetch('/api/sales/notifications')
      .then(r => r.json())
      .then(data => { setNotifications(data.notifications ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  function dismiss(id: string, count: number) {
    const next = { ...dismissed, [id]: count }
    setDismissed(next)
    saveDismissed(next)
  }

  function dismissAll() {
    const next: Record<string, number> = {}
    notifications.forEach(n => { next[n.id] = n.count })
    setDismissed(next)
    saveDismissed(next)
  }

  const visible = notifications.filter(n => (dismissed[n.id] ?? -1) < n.count)

  if (!loaded || visible.length === 0) return null

  return (
    <div style={{ marginBottom: 24, animation: 'slideUp 0.3s var(--ease-out) both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#F87171', fontSize: 13 }}>⚠</span>
          <h2 className="t-section-title">Needs Your Attention</h2>
          <span className="badge badge-red">{visible.length}</span>
        </div>
        <button
          onClick={dismissAll}
          className="t-caption"
          style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Dismiss all
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map(n => {
          const s = SEVERITY[n.severity]
          return (
            <div
              key={n.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 16px', borderRadius: 10,
                background: s.bg, border: `1px solid ${s.border}`,
                cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s',
              }}
              onClick={() => router.push(n.filterUrl)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.85'; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.transform = '' }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, color: s.color }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="t-card-title">{n.title}</p>
                <p className="t-caption" style={{ marginTop: 2 }}>{n.message}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>→ View</span>
                <button
                  onClick={e => { e.stopPropagation(); dismiss(n.id, n.count) }}
                  style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
