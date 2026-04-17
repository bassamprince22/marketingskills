'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/app/api/sales/notifications/route'

const SEVERITY_STYLE: Record<string, { bg: string; border: string; icon: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.25)',   icon: '⚠', color: '#F87171' },
  warning:  { bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.25)',  icon: '◈', color: '#FCD34D' },
  info:     { bg: 'rgba(79,142,247,0.07)',  border: 'rgba(79,142,247,0.25)',  icon: '✦', color: '#60A5FA' },
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
      .then(data => {
        setNotifications(data.notifications ?? [])
        setLoaded(true)
      })
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

  // Only show notifications where count changed since last dismiss
  const visible = notifications.filter(n => (dismissed[n.id] ?? -1) < n.count)

  if (!loaded || visible.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#F87171', fontSize: 14 }}>⚠</span>
          <h2 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700 }}>
            Needs Your Attention
          </h2>
          <span style={{
            background: 'rgba(239,68,68,0.15)', color: '#F87171',
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          }}>
            {visible.length}
          </span>
        </div>
        <button
          onClick={dismissAll}
          style={{ fontSize: 11, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Dismiss all
        </button>
      </div>

      {/* Notification rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(n => {
          const s = SEVERITY_STYLE[n.severity]
          return (
            <div
              key={n.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 10,
                background: s.bg, border: `1px solid ${s.border}`,
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onClick={() => router.push(n.filterUrl)}
            >
              <span style={{ fontSize: 18, flexShrink: 0, color: s.color }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>{n.title}</p>
                <p style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{n.message}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>→ View</span>
                <button
                  onClick={e => { e.stopPropagation(); dismiss(n.id, n.count) }}
                  style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
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
