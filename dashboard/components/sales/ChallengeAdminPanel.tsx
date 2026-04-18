'use client'

import { useEffect, useState } from 'react'
import { RewardTierBuilder, RewardTier } from './RewardTierBuilder'

interface Challenge {
  id:                    string
  title:                 string
  description:           string | null
  target_amount:         number | null
  start_date:            string
  end_date:              string | null
  is_active:             boolean
  transparent:           boolean
  top_achievers_visible: boolean
  sales_challenge_rewards?: RewardTier[]
}

interface ClaimRow {
  id:              string
  rep_id:          string
  reward_id:       string
  amount_achieved: number | null
  created_at:      string
}

interface LbEntry { rep_id: string; name: string; amount: number; rank: number }

const EMPTY_FORM = {
  title: '', description: '', target_amount: '', start_date: '', end_date: '',
  is_active: false, transparent: true, top_achievers_visible: true,
}

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function dateRange(start: string, end: string | null) {
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!end) return `From ${s}`
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} → ${e}`
}

export function ChallengeAdminPanel() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [rewards,    setRewards]    = useState<RewardTier[]>([])
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')
  const [msgType,    setMsgType]    = useState<'ok' | 'err'>('ok')
  const [editId,     setEditId]     = useState<string | null>(null)

  // Claims state
  const [viewClaimsId,  setViewClaimsId]  = useState<string | null>(null)
  const [claimsData,    setClaimsData]    = useState<Record<string, { leaderboard: LbEntry[]; claims: ClaimRow[]; rewards: RewardTier[] }>>({})
  const [claimsLoading, setClaimsLoading] = useState<string | null>(null)

  function load() {
    fetch('/api/sales/challenges')
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  function openNew() {
    setForm(EMPTY_FORM); setRewards([]); setEditId(null); setShowForm(true)
    setTimeout(() => document.getElementById('challenge-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function openEdit(c: Challenge) {
    setForm({
      title:                 c.title,
      description:           c.description ?? '',
      target_amount:         c.target_amount?.toString() ?? '',
      start_date:            c.start_date,
      end_date:              c.end_date ?? '',
      is_active:             c.is_active,
      transparent:           c.transparent,
      top_achievers_visible: c.top_achievers_visible,
    })
    setRewards((c.sales_challenge_rewards ?? []).map(r => ({
      rank:               r.rank,
      title:              r.title,
      description:        (r as any).description ?? '',
      cash_amount:        r.cash_amount,
      badge_emoji:        r.badge_emoji ?? '🏆',
      badge_color:        r.badge_color ?? '#F59E0B',
      can_claim_multiple: r.can_claim_multiple,
      max_claims:         r.max_claims,
      claim_type:         r.claim_type ?? 'manual',
      require_approval:   r.require_approval ?? false,
    })))
    setEditId(c.id); setShowForm(true)
    setTimeout(() => document.getElementById('challenge-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
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

    await fetch(`/api/sales/challenges/${d.challenge.id}/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewards }),
    })

    setSaving(false)
    flash(editId ? 'Challenge updated' : 'Challenge created!', 'ok')
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
    if (!confirm('Delete this challenge? This cannot be undone.')) return
    await fetch(`/api/sales/challenges/${id}`, { method: 'DELETE' })
    if (viewClaimsId === id) setViewClaimsId(null)
    load()
  }

  async function toggleClaims(challengeId: string) {
    if (viewClaimsId === challengeId) { setViewClaimsId(null); return }
    if (!claimsData[challengeId]) {
      setClaimsLoading(challengeId)
      try {
        const d = await fetch(`/api/sales/challenges/${challengeId}/leaderboard`).then(r => r.json())
        setClaimsData(prev => ({
          ...prev,
          [challengeId]: {
            leaderboard: d.leaderboard ?? [],
            claims:      d.claims      ?? [],
            rewards:     d.rewards     ?? [],
          },
        }))
      } finally { setClaimsLoading(null) }
    }
    setViewClaimsId(challengeId)
  }

  const active = challenges.filter(c => c.is_active)
  const inactive = challenges.filter(c => !c.is_active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats bar */}
      {!loading && challenges.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Total challenges', value: challenges.length, color: 'var(--brand-primary)' },
            { label: 'Active',  value: active.length,   color: '#4ADE80' },
            { label: 'Past',    value: inactive.length,  color: 'var(--text-muted)' },
          ].map(s => (
            <div key={s.label} className="fadaa-card" style={{ padding: '12px 20px', flex: '1 1 120px' }}>
              <p className="t-mono" style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
              <p className="t-caption" style={{ marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Challenge list */}
      <div className="fadaa-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 className="t-section-title">All Challenges</h3>
            <p className="t-caption" style={{ marginTop: 3 }}>Create competitive sales races with reward tiers for your team.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {msg && (
              <span style={{ fontSize: 12, color: msgType === 'ok' ? '#4ADE80' : '#F87171', fontWeight: 500 }}>
                {msgType === 'ok' ? '✓' : '⚠'} {msg}
              </span>
            )}
            <button onClick={openNew} className="fadaa-btn fadaa-btn-sm">+ New Challenge</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />)}
          </div>
        ) : challenges.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-state-icon">🏆</div>
            <p className="empty-state-title">No challenges yet</p>
            <p className="empty-state-desc">Create your first sales race to motivate the team.</p>
            <button onClick={openNew} className="fadaa-btn" style={{ marginTop: 12 }}>+ Create Challenge</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {challenges.map(c => {
              const cd      = claimsData[c.id]
              const claimCount = cd?.claims.length ?? 0

              return (
                <div key={c.id} style={{
                  borderRadius: 12,
                  border: `1px solid ${c.is_active ? 'rgba(74,222,128,0.25)' : 'var(--border-subtle)'}`,
                  background: c.is_active ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)',
                  overflow: 'hidden',
                }}>
                  {/* Challenge row */}
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {c.title}
                        </span>
                        {c.is_active ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', background: 'rgba(74,222,128,0.12)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(74,222,128,0.2)' }}>
                            ● ACTIVE
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-faint)', background: 'rgba(100,116,139,0.1)', padding: '2px 7px', borderRadius: 999 }}>
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="t-caption" style={{ marginTop: 3 }}>
                        {dateRange(c.start_date, c.end_date)}
                        {c.target_amount ? ` · Target: ${fmt(c.target_amount)}` : ''}
                        {` · ${c.sales_challenge_rewards?.length ?? 0} reward tier${(c.sales_challenge_rewards?.length ?? 0) !== 1 ? 's' : ''}`}
                      </p>
                      {/* Reward emojis preview */}
                      {(c.sales_challenge_rewards ?? []).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                          {(c.sales_challenge_rewards ?? []).slice(0, 5).map(r => (
                            <span key={(r as any).id} style={{ fontSize: 16 }} title={(r as any).title}>
                              {r.badge_emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => toggleClaims(c.id)}
                        disabled={claimsLoading === c.id}
                        className="fadaa-btn-ghost fadaa-btn-sm"
                        style={{ fontSize: 11, position: 'relative' }}
                      >
                        {claimsLoading === c.id ? '…' : viewClaimsId === c.id ? 'Hide Claims' : `Claims${cd ? ` (${claimCount})` : ''}`}
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        className="fadaa-btn-sm"
                        style={{
                          fontSize: 11, border: 'none', cursor: 'pointer',
                          background: c.is_active ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)',
                          color: c.is_active ? '#F87171' : '#4ADE80',
                          padding: '4px 10px', borderRadius: 6,
                        }}
                      >
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="fadaa-btn-ghost fadaa-btn-sm"
                        style={{ fontSize: 11 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: 14, padding: '4px 6px' }}
                        title="Delete challenge"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Claims expansion */}
                  {viewClaimsId === c.id && cd && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 16px 16px', background: 'rgba(0,0,0,0.15)' }}>
                      <p className="t-label" style={{ marginBottom: 12, color: 'var(--brand-primary)' }}>
                        Claims {claimCount > 0 ? `(${claimCount})` : ''}
                      </p>
                      {claimCount === 0 ? (
                        <p className="t-caption" style={{ color: 'var(--text-faint)' }}>No claims submitted yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {/* Header */}
                          <div style={{ display: 'flex', gap: 10, padding: '0 0 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span className="t-label" style={{ flex: 1 }}>Rep</span>
                            <span className="t-label" style={{ width: 120 }}>Reward</span>
                            <span className="t-label" style={{ width: 80, textAlign: 'right' }}>Amount</span>
                            <span className="t-label" style={{ width: 80, textAlign: 'right' }}>Date</span>
                            <span className="t-label" style={{ width: 90, textAlign: 'center' }}>Status</span>
                          </div>
                          {cd.claims.map(claim => {
                            const rep    = cd.leaderboard.find(e => e.rep_id === claim.rep_id)
                            const reward = cd.rewards.find((r: any) => r.id === claim.reward_id)
                            const requireApproval = (reward as any)?.require_approval ?? false
                            return (
                              <div key={claim.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                {/* Avatar + name */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                    background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, color: '#fff',
                                  }}>
                                    {(rep?.name ?? '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    {rep?.name ?? 'Unknown'}
                                  </span>
                                </div>
                                {/* Reward */}
                                <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 13 }}>{(reward as any)?.badge_emoji ?? '🏆'}</span>
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {(reward as any)?.title ?? 'Reward'}
                                  </span>
                                </div>
                                {/* Amount */}
                                <span className="t-mono" style={{ width: 80, textAlign: 'right', fontSize: 12, color: claim.amount_achieved ? '#4ADE80' : 'var(--text-faint)' }}>
                                  {claim.amount_achieved ? fmt(Number(claim.amount_achieved)) : '—'}
                                </span>
                                {/* Date */}
                                <span style={{ width: 80, textAlign: 'right', fontSize: 11, color: 'var(--text-faint)' }}>
                                  {new Date(claim.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                {/* Status */}
                                <div style={{ width: 90, textAlign: 'center' }}>
                                  {requireApproval ? (
                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 600 }}>
                                      Pending
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)', fontWeight: 600 }}>
                                      Confirmed
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div id="challenge-form" className="fadaa-card" style={{ padding: '20px 24px', border: '1px solid rgba(79,142,247,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 className="t-section-title">{editId ? 'Edit Challenge' : 'New Challenge'}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="t-label" style={{ marginBottom: 5, display: 'block' }}>Challenge Title *</label>
              <input
                className="fadaa-input"
                value={form.title}
                placeholder="Q2 Sales Race"
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="t-label" style={{ marginBottom: 5, display: 'block' }}>Description</label>
              <textarea
                className="fadaa-input"
                rows={2}
                value={form.description}
                placeholder="Compete for the top spot and win amazing rewards!"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="t-label" style={{ marginBottom: 5, display: 'block' }}>Start Date *</label>
              <input
                className="fadaa-input" type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="t-label" style={{ marginBottom: 5, display: 'block' }}>End Date</label>
              <input
                className="fadaa-input" type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="t-label" style={{ marginBottom: 5, display: 'block' }}>Revenue Target ($)</label>
              <input
                className="fadaa-input" type="number" min={0}
                value={form.target_amount}
                placeholder="e.g. 50000"
                onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10, paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                <span className="t-body">Active (visible to team)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={form.transparent}
                  onChange={e => setForm(f => ({ ...f, transparent: e.target.checked }))}
                />
                <span className="t-body">Transparent leaderboard</span>
              </label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 18, marginBottom: 18 }}>
            <RewardTierBuilder rewards={rewards} onChange={setRewards} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} className="fadaa-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving
                ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</>
                : editId ? 'Save Changes' : '+ Create Challenge'}
            </button>
            <button onClick={() => setShowForm(false)} className="fadaa-btn-ghost fadaa-btn-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
