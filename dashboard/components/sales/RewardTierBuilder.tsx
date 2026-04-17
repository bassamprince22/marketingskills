'use client'

export interface RewardTier {
  rank:              number
  title:             string
  description:       string
  cash_amount:       number | null
  badge_emoji:       string
  badge_color:       string
  can_claim_multiple: boolean
  max_claims:        number | null
}

const RANK_LABELS = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place', '4th Place', '5th Place']

export function RewardTierBuilder({
  rewards,
  onChange,
}: {
  rewards: RewardTier[]
  onChange: (next: RewardTier[]) => void
}) {
  function add() {
    onChange([...rewards, {
      rank:              rewards.length + 1,
      title:             RANK_LABELS[rewards.length] ?? `Rank ${rewards.length + 1}`,
      description:       '',
      cash_amount:       null,
      badge_emoji:       '🏆',
      badge_color:       '#F59E0B',
      can_claim_multiple: false,
      max_claims:        1,
    }])
  }

  function remove(i: number) {
    onChange(rewards.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, rank: idx + 1 })))
  }

  function update(i: number, patch: Partial<RewardTier>) {
    onChange(rewards.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p className="t-label">Reward Tiers</p>
        <button onClick={add} className="fadaa-btn fadaa-btn-sm">+ Add Tier</button>
      </div>

      {rewards.length === 0 && (
        <p className="t-caption" style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>No reward tiers yet</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rewards.map((r, i) => (
          <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{r.badge_emoji}</span>
                <span className="t-label">Tier {r.rank}</span>
              </div>
              <button onClick={() => remove(i)} style={{ color: 'var(--brand-red-text)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Remove</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="t-label" style={{ marginBottom: 3, display: 'block' }}>Title</label>
                <input className="fadaa-input" value={r.title} onChange={e => update(i, { title: e.target.value })} />
              </div>
              <div>
                <label className="t-label" style={{ marginBottom: 3, display: 'block' }}>Cash Reward ($)</label>
                <input className="fadaa-input" type="number" min={0}
                  value={r.cash_amount ?? ''}
                  placeholder="0"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="t-label">Max Claims:</label>
                <input className="fadaa-input" type="number" min={1} style={{ width: 70 }}
                  value={r.max_claims ?? ''}
                  placeholder="∞"
                  onChange={e => update(i, { max_claims: parseInt(e.target.value) || null })} />
                <span className="t-caption">leave blank for unlimited</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
