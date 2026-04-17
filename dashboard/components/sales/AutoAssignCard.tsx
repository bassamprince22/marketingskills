'use client'

import { useEffect, useState } from 'react'
import type { AutoAssignSettings } from '@/lib/sales/autoAssign'

interface Rep { id: string; name: string; role: string }

interface ApiData {
  settings: { auto_assign: AutoAssignSettings }
  reps:     Rep[]
}

const DEFAULT_SETTINGS: ApiData = {
  settings: { auto_assign: { enabled: false, rep_pool: [], last_assigned_rep_id: null } },
  reps: [],
}

function ToggleSwitch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-checked={on}
      role="switch"
      style={{
        width: 48, height: 26, borderRadius: 999, border: 'none',
        background: on ? 'var(--brand-primary)' : 'var(--border-default)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: on ? '#fff' : 'var(--text-muted)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

export function AutoAssignCard() {
  const [data,    setData]    = useState<ApiData | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  function load() {
    setLoadErr(false)
    fetch('/api/sales/settings')
      .then(r => r.json())
      .then(d => {
        setData(d?.settings?.auto_assign ? d : DEFAULT_SETTINGS)
      })
      .catch(() => { setData(DEFAULT_SETTINGS); setLoadErr(true) })
  }
  useEffect(() => { load() }, [])

  async function toggle() {
    if (!data) return
    setSaving(true)
    await patch({ enabled: !data.settings.auto_assign.enabled })
    setSaving(false)
  }

  async function patch(partial: Partial<AutoAssignSettings>) {
    if (!data) return
    const updated = { ...data.settings.auto_assign, ...partial }
    const res     = await fetch('/api/sales/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ auto_assign: updated }),
    })
    if (res.ok) {
      const d = await res.json()
      if (d.settings?.auto_assign) {
        setData(prev => prev ? { ...prev, settings: d.settings } : prev)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  function toggleRep(repId: string) {
    if (!data) return
    const pool    = data.settings.auto_assign.rep_pool
    const newPool = pool.includes(repId) ? pool.filter(id => id !== repId) : [...pool, repId]
    patch({ rep_pool: newPool })
  }

  if (!data) {
    return (
      <div className="fadaa-card" style={{ padding: '20px 24px' }}>
        <div className="card-header">
          <h3 className="t-section-title">◈ Lead Auto-Assignment</h3>
        </div>
        <p className="t-caption" style={{ padding: '12px 0' }}>Loading settings…</p>
      </div>
    )
  }

  const { auto_assign } = data.settings
  const enabled     = auto_assign.enabled
  const pool        = auto_assign.rep_pool
  const allReps     = data.reps
  const activePool  = pool.length > 0 ? allReps.filter(r => pool.includes(r.id)) : allReps
  const lastRep     = allReps.find(r => r.id === auto_assign.last_assigned_rep_id)
  const nextIdx     = lastRep ? (activePool.findIndex(r => r.id === lastRep.id) + 1) % activePool.length : 0
  const nextRep     = activePool[nextIdx]

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      {loadErr && (
        <div style={{
          marginBottom: 16, padding: '8px 12px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8,
        }}>
          <p className="t-caption" style={{ color: '#FCD34D' }}>
            Could not reach settings API — showing defaults.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h3 className="t-section-title">◈ Lead Auto-Assignment</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>
            {enabled
              ? 'New leads are automatically assigned round-robin.'
              : 'Auto-assignment is off — assign leads manually.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span className="t-caption" style={{ color: '#4ADE80' }}>✓ Saved</span>}
          <ToggleSwitch on={enabled} onClick={toggle} disabled={saving} />
        </div>
      </div>

      {enabled && (
        <>
          {nextRep && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 20, padding: '10px 14px',
              background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)',
              borderRadius: 10,
            }}>
              <p className="t-caption">Next lead goes to:</p>
              <div className="avatar avatar-sm">{nextRep.name.charAt(0).toUpperCase()}</div>
              <p className="t-body" style={{ fontWeight: 600 }}>{nextRep.name}</p>
              <span className="badge badge-blue" style={{ marginLeft: 2, textTransform: 'capitalize' }}>{nextRep.role}</span>
            </div>
          )}

          <div>
            <p className="t-label" style={{ marginBottom: 10 }}>
              Assignment Pool {pool.length > 0 ? `(${activePool.length} selected)` : '(all reps)'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allReps.map(rep => {
                const inPool = pool.length === 0 || pool.includes(rep.id)
                const isNext = nextRep?.id === rep.id
                return (
                  <div
                    key={rep.id}
                    onClick={() => toggleRep(rep.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                      background: inPool ? 'rgba(79,142,247,0.06)' : 'rgba(100,116,139,0.04)',
                      border: `1px solid ${inPool ? 'rgba(79,142,247,0.2)' : 'var(--border-subtle)'}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <div className={`avatar avatar-sm${inPool ? '' : ''}`} style={{
                      background: inPool ? 'linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))' : 'var(--border-default)',
                    }}>
                      {rep.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="t-body" style={{ fontWeight: inPool ? 500 : 400, color: inPool ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {rep.name}
                      </p>
                      <p className="t-caption" style={{ textTransform: 'capitalize' }}>{rep.role}</p>
                    </div>
                    {isNext && <span className="badge badge-blue badge-sm">Next</span>}
                    <span style={{ fontSize: 16, color: inPool ? '#4ADE80' : 'var(--border-default)' }}>
                      {inPool ? '●' : '○'}
                    </span>
                  </div>
                )
              })}
            </div>
            {pool.length > 0 && (
              <button
                onClick={() => patch({ rep_pool: [] })}
                className="t-caption"
                style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Reset to all reps
              </button>
            )}
          </div>
        </>
      )}

      {!enabled && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 10,
        }}>
          <p className="t-caption" style={{ lineHeight: 1.6 }}>
            Manual mode: go to <strong style={{ color: 'var(--text-primary)' }}>Pipeline</strong> and click the rep badge on any card to reassign instantly.
          </p>
        </div>
      )}
    </div>
  )
}
