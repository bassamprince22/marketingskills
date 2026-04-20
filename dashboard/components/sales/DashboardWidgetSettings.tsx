'use client'

import { useEffect, useState } from 'react'
import { type WidgetConfig, DEFAULT_WIDGETS } from '@/lib/sales/widgetConfig'

export function DashboardWidgetSettings() {
  const [widgets,  setWidgets]  = useState<WidgetConfig[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)

  useEffect(() => {
    fetch('/api/sales/dashboard-widgets')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setWidgets(d?.widgets ?? DEFAULT_WIDGETS); setLoading(false) })
      .catch(() => { setWidgets(DEFAULT_WIDGETS); setLoading(false) })
  }, [])

  function flash(text: string, ok: boolean) {
    setMsg(text); setMsgOk(ok)
    setTimeout(() => setMsg(''), 3000)
  }

  function toggleVisible(id: string) {
    setWidgets(ws => ws.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...widgets]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setWidgets(next.map((w, i) => ({ ...w, order: i + 1 })))
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/sales/dashboard-widgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: widgets.map((w, i) => ({ ...w, order: i + 1 })) }),
    })
    setSaving(false)
    if (res.ok) flash('Layout saved', true)
    else flash('Failed to save', false)
  }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h3 className="t-section-title">Dashboard Widgets</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>
            Toggle visibility and drag to reorder. Changes apply to all team members.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {msg && (
            <span style={{ fontSize: 12, fontWeight: 500, color: msgOk ? '#4ADE80' : '#F87171' }}>
              {msgOk ? '✓' : '⚠'} {msg}
            </span>
          )}
          <button
            className="fadaa-btn fadaa-btn-sm"
            onClick={save}
            disabled={saving || loading}
          >
            {saving ? 'Saving…' : 'Save layout'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {widgets.map((w, i) => (
            <div
              key={w.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: w.visible ? 'rgba(79,142,247,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${w.visible ? 'rgba(79,142,247,0.18)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.15s',
              }}
            >
              {/* Drag handle / index */}
              <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 20, textAlign: 'center', fontFamily: 'var(--font-mono, monospace)' }}>
                {i + 1}
              </span>

              {/* Label */}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: w.visible ? '#E2E8F0' : 'var(--text-faint)' }}>
                {w.label}
              </span>

              {/* Up / Down */}
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', color: i === 0 ? 'var(--text-faint)' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: i === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
                  }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === widgets.length - 1}
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', color: i === widgets.length - 1 ? 'var(--text-faint)' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: i === widgets.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12,
                  }}
                  title="Move down"
                >
                  ↓
                </button>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleVisible(w.id)}
                style={{
                  width: 44, height: 24, borderRadius: 999, padding: '0 3px',
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                  background: w.visible ? '#4F8EF7' : 'rgba(100,116,139,0.3)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: w.visible ? 'flex-end' : 'flex-start',
                }}
                title={w.visible ? 'Hide widget' : 'Show widget'}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s',
                }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
