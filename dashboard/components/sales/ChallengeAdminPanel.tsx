'use client'

import { useEffect, useState } from 'react'
import { RewardTierBuilder, RewardTier } from './RewardTierBuilder'

interface Challenge {
  id:                   string
  title:                string
  description:          string | null
  target_amount:        number | null
  start_date:           string
  end_date:             string | null
  is_active:            boolean
  transparent:          boolean
  top_achievers_visible: boolean
  sales_challenge_rewards?: RewardTier[]
}

const EMPTY_FORM = {
  title: '', description: '', target_amount: '', start_date: '', end_date: '',
  is_active: false, transparent: true, top_achievers_visible: true,
}

export function ChallengeAdminPanel() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [rewards,    setRewards]    = useState<RewardTier[]>([])
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')
  const [msgType,    setMsgType]    = useState<'ok'|'err'>('ok')
  const [editId,     setEditId]     = useState<string|null>(null)

  function load() {
    fetch('/api/sales/challenges').then(r => r.json()).then(d => {
      setChallenges(d.challenges ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function flash(text: string, type: 'ok'|'err') { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3000) }

  function openNew() {
    setForm(EMPTY_FORM); setRewards([]); setEditId(null); setShowForm(true)
  }

  function openEdit(c: Challenge) {
    setForm({
      title:                c.title,
      description:          c.description ?? '',
      target_amount:        c.target_amount?.toString() ?? '',
      start_date:           c.start_date,
      end_date:             c.end_date ?? '',
      is_active:            c.is_active,
      transparent:          c.transparent,
      top_achievers_visible: c.top_achievers_visible,
    })
    setRewards((c.sales_challenge_rewards ?? []).map(r => ({
      rank:              r.rank,
      title:             r.title,
      description:       (r as any).description ?? '',
      cash_amount:       r.cash_amount,
      badge_emoji:       r.badge_emoji ?? '🏆',
      badge_color:       r.badge_color ?? '#F59E0B',
      can_claim_multiple: r.can_claim_multiple,
      max_claims:        r.max_claims,
    })))
    setEditId(c.id)
    setShowForm(true)
  }

  async function save() {
    if (!form.title || !form.start_date) { flash('Title and start date are required', 'err'); return }
    setSaving(true)
    const body = {
      ...form,
      target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
      end_date:      form.end_date || null,
      description:   form.description || null,
    }

    const url    = editId ? `/api/sales/challenges/${editId}` : '/api/sales/challenges'
    const method = editId ? 'PATCH' : 'POST'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d      = await res.json()
    if (!res.ok) { setSaving(false); flash(d.error ?? 'Save failed', 'err'); return }

    const challengeId = d.challenge.id
    // Save rewards
    await fetch(`/api/sales/challenges/${challengeId}/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewards }),
    })

    setSaving(false)
    flash(editId ? 'Challenge updated' : 'Challenge created', 'ok')
    setShowForm(false); setEditId(null)
    load()
  }

  async function toggleActive(c: Challenge) {
    await fetch(`/api/sales/challenges/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this challenge?')) return
    await fetch(`/api/sales/challenges/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="fadaa-card" style={{ padding: '20px 24px' }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="t-section-title">Challenges & Rewards</h3>
            <p className="t-caption" style={{ marginTop: 3 }}>Create competitive races with reward tiers for your sales team.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {msg && <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)', fontWeight: 500 }}>{msgType === 'ok' ? '✓' : '⚠'} {msg}</span>}
            <button onClick={openNew} className="fadaa-btn fadaa-btn-sm">+ New Challenge</button>
          </div>
        </div>

        {/* Existing challenges list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />)}
          </div>
        ) : challenges.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <p className="empty-state-title">No challenges yet</p>
            <p className="empty-state-sub">Create your first sales race to motivate the team</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {challenges.map(c => (
              <div key={c.id} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.is_active ? 'rgba(79,142,247,0.3)' : 'var(--border-subtle)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p className="t-card-title">{c.title}</p>
                      {c.is_active && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand-primary)', background: 'var(--brand-primary-dim)', padding: '2px 8px', borderRadius: 999 }}>ACTIVE</span>}
                    </div>
                    <p className="t-caption" style={{ marginTop: 2 }}>
                      {c.start_date} {c.end_date ? `→ ${c.end_date}` : '(no end)'}
                      {c.target_amount ? ` · Target: $${Number(c.target_amount).toLocaleString()}` : ''}
                      {` · ${c.sales_challenge_rewards?.length ?? 0} reward tier(s)`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleActive(c)} className={`fadaa-btn fadaa-btn-sm${c.is_active ? ' fadaa-btn-danger' : ''}`} style={{ fontSize: 11 }}>
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(c)} className="fadaa-btn fadaa-btn-sm" style={{ fontSize: 11, background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Edit</button>
                    <button onClick={() => remove(c.id)} style={{ color: 'var(--brand-red-text)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="fadaa-card" style={{ padding: '20px 24px' }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <h3 className="t-section-title">{editId ? 'Edit Challenge' : 'New Challenge'}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Title *</label>
              <input className="fadaa-input" value={form.title} placeholder="Q2 Sales Race" onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Description</label>
              <textarea className="fadaa-input" rows={2} value={form.description} placeholder="Compete for the top spot and win amazing rewards!" onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Target Amount ($)</label>
              <input className="fadaa-input" type="number" min={0} value={form.target_amount} placeholder="e.g. 50000" onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div>
                <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Start Date *</label>
                <input className="fadaa-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>End Date</label>
                <input className="fadaa-input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.transparent} onChange={e => setForm(f => ({ ...f, transparent: e.target.checked }))} />
                <span className="t-body">Transparent leaderboard</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.top_achievers_visible} onChange={e => setForm(f => ({ ...f, top_achievers_visible: e.target.checked }))} />
                <span className="t-body">Show top achievers</span>
              </label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginBottom: 16 }}>
            <RewardTierBuilder rewards={rewards} onChange={setRewards} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} className="fadaa-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</> : 'Save Challenge'}
            </button>
            <button onClick={() => setShowForm(false)} className="fadaa-btn-ghost fadaa-btn-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
