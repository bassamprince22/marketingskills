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

const PRESETS = [
  { name: 'Social Media Management', description: 'Full social media strategy & content', commission_pct: 8 },
  { name: 'SEO Services',            description: 'Search engine optimization',           commission_pct: 10 },
  { name: 'Google Ads Management',   description: 'Google paid search campaigns',         commission_pct: 12 },
  { name: 'Meta Ads Management',     description: 'Facebook & Instagram paid campaigns',  commission_pct: 12 },
  { name: 'Content Creation',        description: 'Blog posts, copywriting, graphics',    commission_pct: 7  },
  { name: 'Email Marketing',         description: 'Newsletter & drip campaigns',          commission_pct: 8  },
  { name: 'Web Design & Dev',        description: 'Website design and development',       commission_pct: 10 },
  { name: 'Branding & Identity',     description: 'Logo, brand guide, visual identity',   commission_pct: 12 },
  { name: 'Video Production',        description: 'Video ads, reels, promotional content',commission_pct: 10 },
  { name: 'CRM Consulting',          description: 'CRM setup, training & consulting',     commission_pct: 15 },
]

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
  const [showPresets, setShowPresets] = useState(false)

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

  async function addService(name: string, description: string | null, pct: number) {
    const res = await fetch('/api/sales/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null, commission_pct: pct }),
    })
    if (!res.ok) { flash('Failed to add service', 'err'); return }
    const d = await res.json()
    setServices(prev => [...prev, d.service])
    return true
  }

  async function add() {
    if (!newName.trim()) return
    const ok = await addService(newName.trim(), newDesc, newPct)
    if (ok) { setNewName(''); setNewDesc(''); setNewPct(0); setAddOpen(false); flash('Service added', 'ok') }
  }

  async function addPreset(p: typeof PRESETS[0]) {
    const already = services.some(s => s.name.toLowerCase() === p.name.toLowerCase())
    if (already) { flash(`"${p.name}" already exists`, 'err'); return }
    const ok = await addService(p.name, p.description, p.commission_pct)
    if (ok) flash(`${p.name} added`, 'ok')
  }

  const existingNames = new Set(services.map(s => s.name.toLowerCase()))

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div>
          <h3 className="t-section-title">Services & Commission Rates</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>Define your service catalog and set commission % per service.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {msg && <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)', fontWeight: 500 }}>{msgType === 'ok' ? '✓' : '⚠'} {msg}</span>}
          <button onClick={() => { setShowPresets(o => !o); setAddOpen(false) }} className="fadaa-btn-ghost fadaa-btn-sm">
            {showPresets ? 'Hide Presets' : '⚡ Quick Add'}
          </button>
          <button onClick={() => { setAddOpen(o => !o); setShowPresets(false) }} className="fadaa-btn fadaa-btn-sm">+ Custom</button>
        </div>
      </div>

      {/* ── Preset services ──────────────────────────────────────────── */}
      {showPresets && (
        <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.12)' }}>
          <p className="t-label" style={{ marginBottom: 10 }}>Common Marketing Services — click to add instantly</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map(p => {
              const added = existingNames.has(p.name.toLowerCase())
              return (
                <button
                  key={p.name}
                  onClick={() => !added && addPreset(p)}
                  disabled={added}
                  title={`${p.description} · ${p.commission_pct}% commission`}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                    border: `1px solid ${added ? 'var(--border-subtle)' : 'rgba(79,142,247,0.3)'}`,
                    background: added ? 'rgba(255,255,255,0.03)' : 'rgba(79,142,247,0.08)',
                    color: added ? 'var(--text-muted)' : 'var(--brand-primary)',
                    cursor: added ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {added ? '✓' : '+'} {p.name}
                  <span style={{ opacity: 0.6, fontSize: 10 }}>{p.commission_pct}%</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Custom add form ──────────────────────────────────────────── */}
      {addOpen && (
        <div style={{ padding: '14px 16px', marginBottom: 12, borderRadius: 10, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)' }}>
          <p className="t-label" style={{ marginBottom: 10 }}>New Custom Service</p>
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
          <p className="empty-state-sub">Use Quick Add to add common services, or create a custom one</p>
        </div>
      ) : (
        <div>
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
