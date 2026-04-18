'use client'

import { useState } from 'react'

export interface RewardTier {
  rank:               number
  title:              string
  description:        string
  cash_amount:        number | null
  badge_emoji:        string
  badge_color:        string
  can_claim_multiple: boolean
  max_claims:         number | null
  claim_type:         'auto' | 'manual'
  require_approval:   boolean
}

const RANK_META = [
  { emoji: '🥇', label: '1st Place', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { emoji: '🥈', label: '2nd Place', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  { emoji: '🥉', label: '3rd Place', color: '#B47358', bg: 'rgba(180,115,88,0.12)' },
  { emoji: '4️⃣', label: '4th Place', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)' },
  { emoji: '5️⃣', label: '5th Place', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)' },
]

function fmt(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `$${v}`
}

export function RewardTierBuilder({
  rewards,
  onChange,
}: {
  rewards: RewardTier[]
  onChange: (next: RewardTier[]) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)

  function add() {
    const i = rewards.length
    const meta = RANK_META[i] ?? RANK_META[RANK_META.length - 1]
    onChange([...rewards, {
      rank:               i + 1,
      title:              meta.label,
      description:        '',
      cash_amount:        null,
      badge_emoji:        meta.emoji,
      badge_color:        meta.color,
      can_claim_multiple: false,
      max_claims:         1,
      claim_type:         'manual',
      require_approval:   false,
    }])
    setSelected(i)
  }

  function remove(i: number) {
    onChange(rewards.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, rank: idx + 1 })))
    setSelected(null)
  }

  function update(i: number, patch: Partial<RewardTier>) {
    onChange(rewards.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const totalRewards = rewards.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p className="t-label">Reward Tiers</p>
        {totalRewards < 5 && (
          <button onClick={add} className="fadaa-btn fadaa-btn-sm">+ Add Tier</button>
        )}
      </div>

      {totalRewards === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <p className="t-caption">No reward tiers yet — add your first tier</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
          {/* ── Pyramid visualization ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, marginBottom: 16 }}>
            {rewards.map((r, i) => {
              const meta = RANK_META[i] ?? RANK_META[RANK_META.length - 1]
              // Pyramid: rank 1 = 50% wide, each additional rank adds 10%
              const widthPct = Math.min(100, 50 + i * 15)
              const isActive = selected === i
              return (
                <div
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  style={{
                    width: `${widthPct}%`,
                    padding: '10px 14px',
                    borderRadius: i === 0 ? '12px 12px 0 0' : i === rewards.length - 1 ? '0 0 12px 12px' : '0',
                    background: isActive ? (meta.bg.replace('0.12', '0.22').replace('0.08', '0.16')) : meta.bg,
                    border: `1px solid ${meta.color}${isActive ? '60' : '30'}`,
                    borderBottom: i === rewards.length - 1 ? undefined : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{r.badge_emoji || meta.emoji}</span>
                    <div>
                      <p style={{ color: meta.color, fontWeight: 700, fontSize: 13 }}>{r.title || meta.label}</p>
                      {r.cash_amount ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>{fmt(r.cash_amount)} cash</p>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                      padding: '2px 7px', borderRadius: 999,
                      background: r.claim_type === 'auto' ? 'rgba(74,222,128,0.12)' : 'rgba(79,142,247,0.12)',
                      color: r.claim_type === 'auto' ? 'var(--brand-green-text)' : 'var(--brand-primary)',
                    }}>
                      {r.claim_type === 'auto' ? 'AUTO' : 'MANUAL'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{isActive ? '▲' : '▼'}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Edit panel for selected tier ────────────────────────── */}
          {selected !== null && rewards[selected] && (() => {
            const r = rewards[selected]
            const i = selected
            const meta = RANK_META[i] ?? RANK_META[RANK_META.length - 1]
            return (
              <div style={{
                padding: '16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${meta.color}30`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ color: meta.color, fontWeight: 700, fontSize: 13 }}>
                    {meta.emoji} Rank {r.rank} Settings
                  </p>
                  <button
                    onClick={() => remove(i)}
                    style={{ color: 'var(--brand-red-text)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    Remove tier
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="t-label" style={{ marginBottom: 3, display: 'block' }}>Title</label>
                    <input className="fadaa-input" value={r.title}
                      onChange={e => update(i, { title: e.target.value })} />
                  </div>
                  <div>
                    <label className="t-label" style={{ marginBottom: 3, display: 'block' }}>Cash Reward ($)</label>
                    <input className="fadaa-input" type="number" min={0}
                      value={r.cash_amount ?? ''}
                      placeholder="0 = no cash"
                      onChange={e => update(i, { cash_amount: parseFloat(e.target.value) || null })} />
                  </div>
                  <div>
                    <label className="t-label" style={{ marginBottom: 3, display: 'block' }}>Badge Emoji</label>
                    <input className="fadaa-input" value={r.badge_emoji} style={{ fontSize: 18, textAlign: 'center' }}
                      onChange={e => update(i, { badge_emoji: e.target.value })} />
                  </div>
                  <div>
                    <label className="t-label" style={{ marginBottom: 3, display: 'block' }}>Badge Color</label>
                    <input className="fadaa-input" type="color" value={r.badge_color} style={{ padding: 3, height: 36, cursor: 'pointer' }}
                      onChange={e => update(i, { badge_color: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="t-label" style={{ marginBottom: 3, display: 'block' }}>Description</label>
                    <input className="fadaa-input" value={r.description} placeholder="e.g. Top performer of the quarter"
                      onChange={e => update(i, { description: e.target.value })} />
                  </div>

                  {/* ── Claim settings ────────────────────────────────── */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p className="t-label" style={{ marginBottom: 8 }}>Claim Settings</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {/* Claim type */}
                      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                        {(['manual', 'auto'] as const).map(ct => (
                          <button
                            key={ct}
                            onClick={() => update(i, { claim_type: ct })}
                            style={{
                              padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                              background: r.claim_type === ct ? (ct === 'auto' ? 'rgba(74,222,128,0.18)' : 'rgba(79,142,247,0.18)') : 'transparent',
                              color: r.claim_type === ct ? (ct === 'auto' ? 'var(--brand-green-text)' : 'var(--brand-primary)') : 'var(--text-muted)',
                            }}
                          >
                            {ct === 'manual' ? '👆 Manual claim' : '⚡ Auto-award'}
                          </button>
                        ))}
                      </div>

                      {/* Max claims */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="t-caption">Max winners:</span>
                        <input className="fadaa-input" type="number" min={1} style={{ width: 64, textAlign: 'center' }}
                          value={r.max_claims ?? ''}
                          placeholder="∞"
                          onChange={e => update(i, { max_claims: parseInt(e.target.value) || null })} />
                        <span className="t-caption">blank = unlimited</span>
                      </div>
                    </div>

                    {/* Claim type explanation */}
                    <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {r.claim_type === 'auto'
                        ? '⚡ Auto-award: rep is automatically given this reward the moment they reach the required rank.'
                        : '👆 Manual claim: rep must click "Claim Reward" from their dashboard when they qualify.'}
                    </p>

                    {/* Approval toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                      <button
                        role="switch"
                        aria-checked={r.require_approval}
                        onClick={() => update(i, { require_approval: !r.require_approval })}
                        style={{
                          width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                          background: r.require_approval ? 'var(--brand-primary)' : 'var(--border-strong)',
                          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 2, width: 16, height: 16,
                          background: '#fff', borderRadius: '50%',
                          left: r.require_approval ? 18 : 2, transition: 'left 0.18s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }} />
                      </button>
                      <span className="t-body" style={{ fontSize: 12 }}>
                        Require manager approval before reward is awarded
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
