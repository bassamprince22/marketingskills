'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface LeaderboardEntry {
  rep_id:     string
  name:       string
  avatar_url: string | null
  amount:     number
  rank:       number
}

interface Reward {
  id:          string
  rank:        number
  title:       string
  cash_amount: number | null
  badge_emoji: string
  badge_color: string
}

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
}

function fmt(v: number) {
  if (v >= 1000000) return `$${(v/1000000).toFixed(1)}M`
  if (v >= 1000)    return `$${(v/1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function Countdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(endDate).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const days  = Math.floor(diff / 86400000)
      const hrs   = Math.floor((diff % 86400000) / 3600000)
      const mins  = Math.floor((diff % 3600000) / 60000)
      const secs  = Math.floor((diff % 60000) / 1000)
      setTimeLeft(days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}h ${mins}m ${secs}s`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [endDate])

  return (
    <div style={{ textAlign: 'right' }}>
      <p className="t-caption">Time remaining</p>
      <p className="t-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand-amber-text)' }}>{timeLeft}</p>
    </div>
  )
}

export function ChallengeRaceWidget() {
  const { data: session } = useSession()
  const role   = (session?.user as { id?: string; role?: string })?.role ?? 'rep'
  const userId = (session?.user as { id?: string })?.id

  const [challenge,    setChallenge]    = useState<Challenge | null>(null)
  const [leaderboard,  setLeaderboard]  = useState<LeaderboardEntry[]>([])
  const [rewards,      setRewards]      = useState<Reward[]>([])
  const [loading,      setLoading]      = useState(true)
  const [congrats,     setCongrats]     = useState<Reward | null>(null)
  const [claiming,     setClaiming]     = useState(false)
  const [claimed,      setClaimed]      = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/sales/challenges')
      const data = await res.json()
      const active = (data.challenges ?? []).find((c: Challenge) => c.is_active)
      if (!active) { setLoading(false); return }

      setChallenge(active)
      const lbRes  = await fetch(`/api/sales/challenges/${active.id}/leaderboard`)
      const lbData = await lbRes.json()
      setLeaderboard(lbData.leaderboard ?? [])
      setRewards(lbData.rewards ?? [])
      setLoading(false)
    } catch { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !challenge) return null

  const isPrivileged = role === 'manager' || role === 'admin'
  const max     = Math.max(...leaderboard.map(e => e.amount), 1)
  const target  = challenge.target_amount ?? max
  const myEntry = leaderboard.find(e => e.rep_id === userId)

  async function claimReward(reward: Reward, amountAchieved: number | null) {
    if (claiming) return
    setClaiming(true)
    try {
      const res = await fetch(`/api/sales/challenges/${challenge!.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: reward.id, amount_achieved: amountAchieved }),
      })
      if (res.ok) {
        setClaimed(prev => { const n = new Set(prev); n.add(reward.id); return n })
        setCongrats(reward)
      }
    } finally { setClaiming(false) }
  }

  // Only show own bar to rep if not transparent
  const displayBoard = !challenge.transparent && role === 'rep'
    ? (myEntry ? [myEntry] : [])
    : leaderboard.slice(0, 10)

  const top3 = leaderboard.slice(0, 3)

  return (
    <div className="fadaa-card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(79,142,247,0.2)' }}>
      {/* Congratulation overlay */}
      {congrats && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
        }} onClick={() => setCongrats(null)}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 80 }}>{congrats.badge_emoji}</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 16 }}>Congratulations!</h2>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginTop: 8 }}>{congrats.title}</p>
            {congrats.cash_amount && <p style={{ fontSize: 24, color: 'var(--brand-green-text)', fontWeight: 700, marginTop: 12 }}>+{fmt(congrats.cash_amount)}</p>}
            <p className="t-caption" style={{ marginTop: 20 }}>Click anywhere to close</p>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{challenge.title}</h3>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand-primary)', background: 'var(--brand-primary-dim)', padding: '2px 8px', borderRadius: 999 }}>LIVE</span>
            </div>
            {challenge.description && <p className="t-caption" style={{ marginTop: 4 }}>{challenge.description}</p>}
          </div>
          {challenge.end_date && <Countdown endDate={challenge.end_date} />}
        </div>

        {/* Reward tiers */}
        {rewards.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {rewards.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                background: `${r.badge_color}20`, border: `1px solid ${r.badge_color}40`,
              }}>
                <span style={{ fontSize: 14 }}>{r.badge_emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.badge_color }}>
                  Rank {r.rank}: {r.title}
                  {r.cash_amount ? ` · ${fmt(r.cash_amount)}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Podium (top 3) */}
        {top3.length > 0 && (challenge.transparent || isPrivileged) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', alignItems: 'flex-end' }}>
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, i) => {
              const isFirst = entry?.rank === 1
              const height  = isFirst ? 100 : 72
              return (
                <div key={entry?.rep_id} style={{ textAlign: 'center', flex: '0 0 auto', width: 100 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>
                    {entry?.rank === 1 ? '🥇' : entry?.rank === 2 ? '🥈' : '🥉'}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry?.name}
                  </p>
                  <div style={{
                    height, borderRadius: '8px 8px 0 0',
                    background: isFirst
                      ? 'linear-gradient(180deg, #F59E0B, #D97706)'
                      : entry?.rank === 2 ? 'rgba(148,163,184,0.4)' : 'rgba(180,123,88,0.4)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                  }}>
                    {fmt(entry?.amount ?? 0)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Progress bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayBoard.map(entry => {
            const pct  = target > 0 ? Math.min(100, (entry.amount / target) * 100) : 0
            const isMe = entry.rep_id === userId
            const reward = rewards.find(r => r.rank === entry.rank)
            return (
              <div key={entry.rep_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="t-caption" style={{ fontWeight: isMe ? 700 : 400, color: isMe ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                      #{entry.rank} {entry.name}{isMe ? ' (you)' : ''}
                    </span>
                    {reward && <span style={{ fontSize: 12 }}>{reward.badge_emoji}</span>}
                  </div>
                  <span className="t-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(entry.amount)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    width: `${pct}%`,
                    background: isMe
                      ? 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))'
                      : 'rgba(148,163,184,0.3)',
                    transition: 'width 0.8s ease-out',
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Target indicator */}
        {challenge.target_amount && (
          <p className="t-caption" style={{ marginTop: 10, textAlign: 'right' }}>
            Target: {fmt(challenge.target_amount)}
          </p>
        )}

        {/* Claim Reward — reps only, when they have a qualifying rank */}
        {role === 'rep' && myEntry && (() => {
          const myReward = rewards.find(r => r.rank === myEntry.rank)
          if (!myReward) return null
          const alreadyClaimed = claimed.has(myReward.id)
          return (
            <div style={{
              marginTop: 20, padding: '14px 16px', borderRadius: 10,
              background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{myReward.badge_emoji}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    You qualified: {myReward.title}
                  </p>
                  {myReward.cash_amount && (
                    <p style={{ fontSize: 12, color: 'var(--brand-green-text)', fontWeight: 600 }}>
                      {fmt(myReward.cash_amount)} reward
                    </p>
                  )}
                </div>
              </div>
              <button
                disabled={alreadyClaimed || claiming}
                onClick={() => claimReward(myReward, myEntry.amount)}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: alreadyClaimed ? 'default' : 'pointer',
                  background: alreadyClaimed ? 'rgba(100,116,139,0.2)' : 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
                  color: alreadyClaimed ? 'var(--text-faint)' : '#fff',
                  fontSize: 13, fontWeight: 700, transition: 'opacity 0.15s',
                  opacity: claiming ? 0.6 : 1, flexShrink: 0,
                }}
              >
                {alreadyClaimed ? '✓ Claimed' : claiming ? 'Claiming…' : '🎉 Claim Reward'}
              </button>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
