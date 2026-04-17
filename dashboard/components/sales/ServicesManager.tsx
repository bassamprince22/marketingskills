'use client'

import { useEffect, useState } from 'react'

interface Service {
  id:             string
  name:           string
  description:    string | null
  commission_pct: number
  is_enabled:     boolean
  sort_order:     number
}

function fmt(v: number) { return `${v}%` }

export function ServicesManager() {
  const [services,  setServices]  = useState<Service[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [msg,       setMsg]       = useState('')
  const [msgType,   setMsgType]   = useState<'ok' | 'err'>('ok')
  const [addOpen,   setAddOpen]   = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [newPct,    setNewPct]    = useState(0)

  function load() {
    fetch('/api/sales/services').then(r => r.json()).then(d => {
      setServices(d.services ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  async function update(id: string, patch: Partial<Service>) {
    setSaving(id)
    const res = await fetch(`/api/sales/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(null)
    if (!res.ok) flash('Save failed', 'err')
    else { setServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s)); flash('Saved', 'ok') }
  }

  async function remove(id: string) {
    if (!confirm('Remove this service?')) return
    await fetch(`/api/sales/services/${id}`, { method: 'DELETE' })
    setServices(prev => prev.filter(s => s.id !== id))
    flash('Removed', 'ok')
  }

  async function add() {
    if (!newName.trim()) return
    const res = await fetch('/api/sales/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc || null, commission_pct: newPct }),
    })
    if (!res.ok) { flash('Failed to add service', 'err'); return }
    const d = await res.json()
    setServices(prev => [...prev, d.service])
    setNewName(''); setNewDesc(''); setNewPct(0); setAddOpen(false)
    flash('Service added', 'ok')
  }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div>
          <h3 className="t-section-title">Services & Commission Rates</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>Define your service catalog and set commission % per service.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {msg && <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)', fontWeight: 500 }}>{msgType === 'ok' ? '✓' : '⚠'} {msg}</span>}
          <button onClick={() => setAddOpen(o => !o)} className="fadaa-btn fadaa-btn-sm">+ Add Service</button>
        </div>
      </div>

      {addOpen && (
        <div style={{ padding: '14px 16px', marginBottom: 12, borderRadius: 10, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)' }}>
          <p className="t-label" style={{ marginBottom: 10 }}>New Service</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Name *</label>
              <input className="fadaa-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. SEO Management" />
            </div>
            <div>
              <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Description</label>
              <input className="fadaa-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div>
              <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Commission %</label>
              <input className="fadaa-input" type="number" min={0} max={100} style={{ width: 80 }} value={newPct} onChange={e => setNewPct(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={add} className="fadaa-btn fadaa-btn-sm">Add</button>
            <button onClick={() => setAddOpen(false)} className="fadaa-btn-ghost fadaa-btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚙</div>
          <p className="empty-state-title">No services yet</p>
          <p className="empty-state-sub">Add your first service to enable commission tracking</p>
        </div>
      ) : (
        <div>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px 60px', gap: 12, padding: '6px 12px', marginBottom: 4 }}>
            {['Service','Description','Commission %','Enabled',''].map(h => <span key={h} className="t-label" style={{ fontSize: 10 }}>{h}</span>)}
          </div>
          {services.map(s => (
            <div
              key={s.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px 60px', gap: 12, padding: '10px 12px', borderRadius: 8, alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}
            >
              <input
                className="fadaa-input"
                style={{ fontSize: 13 }}
                defaultValue={s.name}
                onBlur={e => { if (e.target.value !== s.name) update(s.id, { name: e.target.value }) }}
              />
              <input
                className="fadaa-input"
                style={{ fontSize: 12 }}
                defaultValue={s.description ?? ''}
                placeholder="—"
                onBlur={e => { const v = e.target.value || null; if (v !== s.description) update(s.id, { description: v }) }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  className="fadaa-input"
                  type="number" min={0} max={100}
                  style={{ width: 60, fontSize: 12 }}
                  defaultValue={s.commission_pct}
                  onBlur={e => {
                    const v = parseFloat(e.target.value) || 0
                    if (v !== s.commission_pct) update(s.id, { commission_pct: v })
                  }}
                />
                <span className="t-caption">%</span>
              </div>
              <button
                role="switch"
                aria-checked={s.is_enabled}
                onClick={() => update(s.id, { is_enabled: !s.is_enabled })}
                disabled={saving === s.id}
                style={{
                  width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: s.is_enabled ? 'var(--brand-primary)' : 'var(--border-strong)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, width: 16, height: 16,
                  background: '#fff', borderRadius: '50%',
                  left: s.is_enabled ? 21 : 3, transition: 'left 0.18s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
              <button
                onClick={() => remove(s.id)}
                style={{ color: 'var(--brand-red-text)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                title="Remove"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
