'use client'

import { useEffect, useState } from 'react'
import type { AutoAssignSettings } from '@/lib/sales/autoAssign'

interface Rep { id: string; name: string; role: string }

interface ApiData {
  settings: { auto_assign: AutoAssignSettings }
  reps:     Rep[]
}

export function AutoAssignCard() {
  const [data,    setData]    = useState<ApiData | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  function load() {
    fetch('/api/sales/settings')
      .then(r => r.json())
      .then(setData)
  }
  useEffect(() => { load() }, [])

  async function toggle() {
    if (!data) return
    setSaving(true)
    const next = !data.settings.auto_assign.enabled
    await patch({ enabled: next })
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
      setData(prev => prev ? { ...prev, settings: d.settings } : prev)
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

  if (!data) return null

  const { auto_assign } = data.settings
  const enabled = auto_assign.enabled
  const pool    = auto_assign.rep_pool
  const allReps = data.reps

  // Which reps are active in the rotation
  const activePool = pool.length > 0 ? allReps.filter(r => pool.includes(r.id)) : allReps
  const lastRep    = allReps.find(r => r.id === auto_assign.last_assigned_rep_id)
  const nextIdx    = lastRep ? (activePool.findIndex(r => r.id === lastRep.id) + 1) % activePool.length : 0
  const nextRep    = activePool[nextIdx]

  return (
    <div className="fadaa-card" style={{ padding: 24 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700 }}>◈ Lead Auto-Assignment</h3>
          <p style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>
            {enabled
              ? 'New leads are automatically assigned round-robin to your team.'
              : 'Auto-assignment is off — assign leads manually on the Pipeline.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span style={{ color: '#4ADE80', fontSize: 12 }}>✓ Saved</span>}
          {/* Toggle switch */}
          <button
            onClick={toggle}
            disabled={saving}
            style={{
              width: 48, height: 26, borderRadius: 999, border: 'none',
              background: enabled ? '#4F8EF7' : '#1E2D4A',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: enabled ? 25 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: enabled ? '#fff' : '#475569',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {enabled && (
        <>
          {/* Next up indicator */}
          {nextRep && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Next lead goes to:</span>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {nextRep.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>{nextRep.name}</span>
              <span style={{ color: '#475569', fontSize: 11, textTransform: 'capitalize' }}>{nextRep.role}</span>
            </div>
          )}

          {/* Rep pool */}
          <div>
            <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
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
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      background: inPool ? 'rgba(79,142,247,0.06)' : 'rgba(100,116,139,0.04)',
                      border: `1px solid ${inPool ? 'rgba(79,142,247,0.2)' : 'rgba(100,116,139,0.1)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: inPool ? 'linear-gradient(135deg,#4F8EF7,#7C3AED)' : '#1E2D4A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                    }}>
                      {rep.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: inPool ? '#E2E8F0' : '#475569', fontSize: 13, fontWeight: inPool ? 500 : 400 }}>
                        {rep.name}
                      </p>
                      <p style={{ color: '#475569', fontSize: 11, textTransform: 'capitalize' }}>{rep.role}</p>
                    </div>
                    {isNext && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(79,142,247,0.15)', color: '#60A5FA', fontWeight: 600 }}>Next</span>}
                    <span style={{ fontSize: 16, color: inPool ? '#4ADE80' : '#1E2D4A' }}>
                      {inPool ? '●' : '○'}
                    </span>
                  </div>
                )
              })}
            </div>
            {pool.length > 0 && (
              <button
                onClick={() => patch({ rep_pool: [] })}
                style={{ marginTop: 10, fontSize: 12, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset to all reps
              </button>
            )}
          </div>
        </>
      )}

      {!enabled && (
        <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
          <p style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
            Manual mode: go to <strong style={{ color: '#E2E8F0' }}>Pipeline</strong> and click the rep badge on any card to reassign it instantly.
          </p>
        </div>
      )}
    </div>
  )
}
