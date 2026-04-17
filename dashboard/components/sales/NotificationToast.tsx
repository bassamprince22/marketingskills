'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/app/api/sales/notifications/route'

interface Toast extends Notification {
  toastId:   string
  expiresAt: number
}

const POLL_INTERVAL = 60_000
const TOAST_LIFE    = 30_000
const SEEN_KEY      = 'fadaa_notif_seen'

function getSeenCounts(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '{}') } catch { return {} }
}
function saveSeenCounts(d: Record<string, number>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify(d))
}

const SEVERITY: Record<string, { border: string; icon: string; color: string; bar: string }> = {
  critical: { border: '#DC2626', icon: '⚠', color: '#F87171', bar: '#DC2626' },
  warning:  { border: '#D97706', icon: '◈', color: '#F59E0B', bar: '#D97706' },
  info:     { border: '#4F8EF7', icon: '✦', color: '#7CB9FC', bar: '#4F8EF7' },
}

export function NotificationToast() {
  const router   = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])
  const seenRef  = useRef<Record<string, number>>(getSeenCounts())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.toastId !== id))
  }, [])

  const poll = useCallback(async () => {
    try {
      const res  = await fetch('/api/sales/notifications')
      const data = await res.json()
      const notifications: Notification[] = data.notifications ?? []
      const seen = seenRef.current
      const newToasts: Toast[] = []

      for (const n of notifications) {
        const prevCount = seen[n.id] ?? 0
        if (n.count > prevCount) {
          newToasts.push({ ...n, toastId: `${n.id}_${Date.now()}`, expiresAt: Date.now() + TOAST_LIFE })
          seen[n.id] = n.count
        }
      }

      if (newToasts.length > 0) {
        saveSeenCounts(seen)
        setToasts(prev => [...newToasts, ...prev].slice(0, 5))
        newToasts.forEach(t => { setTimeout(() => removeToast(t.toastId), TOAST_LIFE) })
      }
    } catch { /* silent */ }
  }, [removeToast])

  useEffect(() => {
    const init = setTimeout(() => {
      poll()
      timerRef.current = setInterval(poll, POLL_INTERVAL)
    }, 5000)
    return () => {
      clearTimeout(init)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [poll])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 200,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = SEVERITY[t.severity]
        return (
          <div
            key={t.toastId}
            style={{
              pointerEvents: 'auto',
              width: 320,
              background: 'rgba(8,12,24,0.97)',
              border: `1px solid ${s.border}30`,
              borderLeft: `3px solid ${s.border}`,
              borderRadius: 12,
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${s.border}15`,
              overflow: 'hidden',
              animation: 'fadeSlideIn 0.22s var(--ease-spring)',
              cursor: 'pointer',
              backdropFilter: 'blur(20px)',
            }}
            onClick={() => { removeToast(t.toastId); router.push(t.filterUrl) }}
          >
            <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 15, color: s.color, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="t-card-title">{t.title}</p>
                <p className="t-caption" style={{ marginTop: 2 }}>{t.message}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeToast(t.toastId) }}
                style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, flexShrink: 0, padding: '0 2px', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
              >
                ✕
              </button>
            </div>
            {/* Countdown bar */}
            <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: '100%', background: s.bar,
                animation: `shrink ${TOAST_LIFE}ms linear forwards`,
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
