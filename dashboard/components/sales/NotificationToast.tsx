'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/app/api/sales/notifications/route'

interface Toast extends Notification {
  toastId: string
  expiresAt: number
}

const POLL_INTERVAL = 60_000   // check every 60s
const TOAST_LIFE   = 30_000   // auto-dismiss after 30s
const SEEN_KEY     = 'fadaa_notif_seen'

function getSeenCounts(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '{}') } catch { return {} }
}
function saveSeenCounts(d: Record<string, number>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify(d))
}

const SEVERITY_STYLE: Record<string, { border: string; icon: string; color: string; bar: string }> = {
  critical: { border: '#EF4444', icon: '⚠', color: '#F87171', bar: '#EF4444' },
  warning:  { border: '#F59E0B', icon: '◈', color: '#FCD34D', bar: '#F59E0B' },
  info:     { border: '#4F8EF7', icon: '✦', color: '#60A5FA', bar: '#4F8EF7' },
}

export function NotificationToast() {
  const router     = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])
  const seenRef    = useRef<Record<string, number>>(getSeenCounts())
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          newToasts.push({
            ...n,
            toastId:   `${n.id}_${Date.now()}`,
            expiresAt: Date.now() + TOAST_LIFE,
          })
          seen[n.id] = n.count
        }
      }

      if (newToasts.length > 0) {
        saveSeenCounts(seen)
        setToasts(prev => [...newToasts, ...prev].slice(0, 5))
        // auto-dismiss each toast after TOAST_LIFE
        newToasts.forEach(t => {
          setTimeout(() => removeToast(t.toastId), TOAST_LIFE)
        })
      }
    } catch { /* silent — polling is best-effort */ }
  }, [removeToast])

  useEffect(() => {
    // Initial check after 5s (let dashboard load first)
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
      display: 'flex', flexDirection: 'column-reverse', gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = SEVERITY_STYLE[t.severity]
        const remaining = Math.max(0, t.expiresAt - Date.now())
        return (
          <div
            key={t.toastId}
            style={{
              pointerEvents: 'auto',
              width: 340, background: '#0F1629',
              border: `1px solid ${s.border}40`,
              borderLeft: `3px solid ${s.border}`,
              borderRadius: 10,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${s.border}20`,
              overflow: 'hidden',
              animation: 'fadeSlideIn 0.25s ease',
              cursor: 'pointer',
            }}
            onClick={() => { removeToast(t.toastId); router.push(t.filterUrl) }}
          >
            <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, color: s.color, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{t.title}</p>
                <p style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>{t.message}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeToast(t.toastId) }}
                style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '0 2px' }}
              >
                ✕
              </button>
            </div>
            {/* countdown bar */}
            <div style={{ height: 2, background: '#1E2D4A' }}>
              <div style={{
                height: '100%', background: s.bar,
                animation: `shrink ${TOAST_LIFE}ms linear forwards`,
              }} />
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
