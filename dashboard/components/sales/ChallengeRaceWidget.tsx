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
  id:                    string
  title:                 string
  description:           string | null
  target_amount:         number | null
  start_date:            string
  end_date:              string | null
  is_active:             boolean
  transparent:           boolean
  top_achievers_visible: boolean
}

interface Props {
  onManageClick?: () => void
}

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function RepInitial({ name, isMe }: { name: string; isMe: boolean }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: isMe ? 'linear-gradient(135deg, #4F8EF7, #7C3AED)' : 'rgba(100,116,139,0.18)',
      border: isMe ? '2px solid rgba(79,142,247,0.4)' : '1px solid rgba(100,116,139,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: isMe ? '#fff' : 'var(--text-muted)',
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function Countdown({ endDate }: { endDate: string }) {
  const [t, setT] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(endDate).getTime() - Date.now()
      if (diff <= 0) { setT('Ended'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setT(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endDate])

  return (
    <div style={{ textAlign: 'right' }}>
      <p className="t-caption">Time remaining</p>
      <p className="t-mono" style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>{t}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="fadaa-card" style={{ marginBottom: 20, padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 22, width: 220, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, width: 150, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ height: 38, width: 110, borderRadius: 8 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[80, 110, 90].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 28, width: w, borderRadius: 999 }} />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <div className="skeleton" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
            <div className="skeleton" style={{ height: 14, flex: 1, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 14, width: 52, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ height: 5, borderRadius: 999, marginLeft: 64 }} />
        </div>
      ))}
    </div>
  )
}

export function ChallengeRaceWidget({ onManageClick }: Props) {
  const { data: session } = useSession()
  const role   = (session?.user as { id?: string; role?: string })?.role ?? 'rep'
  const userId = (session?.user as { id?: string })?.id

  const [challenge,   setChallenge]   = useState<Challenge | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [rewards,     setRewards]     = useState<Reward[]>([])
  const [loading,     setLoading]     = useState(true)
  const [congrats,    setCongrats]    = useState<Reward | null>(null)
  const [claiming,    setClaiming]    = useState(false)
  const [claimed,     setClaimed]     = useState<Set<string>>(new Set())

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

  const isPrivileged = role === 'manager' || role === 'admin'

  // ── Loading ─────────────────────────────────────
  if (loading) return <LoadingSkeleton />

  // ── No active challenge ──────────────────────────
  if (!challenge) return (
    <div className="fadaa-card" style={{
      marginBottom: 20, padding: '56px 40px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, rgba(79,142,247,0.04), rgba(124,58,237,0.04))',
      border: '1px dashed rgba(79,142,247,0.22)',
    }}>
      <div style={{ fontSize: 64, marginBottom: 20, filter: 'grayscale(0.3)' }}>🏁</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
        No active challenge
      </h3>
      <p className="t-caption" style={{ maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.8 }}>
        {isPrivileged
          ? 'Launch a sales race to energize your team. Set a target, define reward tiers, and watch the leaderboard heat up.'
          : "No sales race is running right now. Stay sharp — your manager will launch the next one soon!"}
      </p>
      {isPrivileged && onManageClick && (
        <button onClick={onManageClick} className="fadaa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          🏆 Create a Challenge
        </button>
      )}
    </div>
  )

  // ── Active challenge ────────────────────────────
  const max    = Math.max(...leaderboard.map(e => e.amount), 1)
  const target = challenge.target_amount ?? max
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

  const displayBoard = !challenge.transparent && role === 'rep'
    ? (myEntry ? [myEntry] : [])
    : leaderboard.slice(0, 10)

  const top3 = leaderboard.slice(0, 3)

  return (
    <div className="fadaa-card" style={{
      marginBottom: 20,
      background: 'linear-gradient(135deg, rgba(79,142,247,0.07), rgba(124,58,237,0.07))',
      border: '1px solid rgba(79,142,247,0.18)',
      overflow: 'hidden',
    }}>

      {/* Congratulations overlay */}
      {congrats && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setCongrats(null)}>
          <div style={{ textAlign: 'center', padding: 40, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: 80 }}>{congrats.badge_emoji}</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 16 }}>Congratulations!</h2>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginTop: 8 }}>{congrats.title}</p>
            {congrats.cash_amount && (
              <p style={{ fontSize: 26, color: '#4ADE80', fontWeight: 700, marginTop: 12 }}>
                +{fmt(congrats.cash_amount)}
              </p>
            )}
            <p className="t-caption" style={{ marginTop: 24 }}>Tap anywhere to close</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{challenge.title}</h3>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              color: '#4ADE80', background: 'rgba(74,222,128,0.1)',
              padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(74,222,128,0.2)',
            }}>● LIVE</span>
          </div>
          {challenge.description && (
            <p className="t-caption" style={{ marginTop: 5, maxWidth: 480 }}>{challenge.description}</p>
          )}
          {challenge.target_amount && (
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--brand-primary)', fontWeight: 600 }}>
              Target: {fmt(challenge.target_amount)}
            </p>
          )}
        </div>
        {challenge.end_date && <Countdown endDate={challenge.end_date} />}
      </div>

      {/* Reward tiers row */}
      {rewards.length > 0 && (
        <div style={{
          padding: '12px 24px', display: 'flex', gap: 8, flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.12)',
        }}>
          {rewards.map(r => (
            <div key={r.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              background: `${r.badge_color}18`, border: `1px solid ${r.badge_color}35`,
            }}>
              <span style={{ fontSize: 14 }}>{r.badge_emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: r.badge_color }}>
                #{r.rank} — {r.title}
                {r.cash_amount ? ` · ${fmt(r.cash_amount)}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Podium (top 3) */}
      {top3.length >= 2 && (challenge.transparent || isPrivileged) && (
        <div style={{
          padding: '24px 24px 0',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12,
        }}>
          {[top3[1], top3[0], top3[2]].filter(Boolean).map(entry => {
            const isFirst = entry?.rank === 1
            const ht = isFirst ? 92 : 64
            return (
              <div key={entry?.rep_id} style={{ textAlign: 'center', width: 96 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px', background: isFirst ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(148,163,184,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {entry?.name.charAt(0).toUpperCase()}
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry?.name}
                </p>
                <div style={{
                  height: ht, borderRadius: '8px 8px 0 0',
                  background: isFirst
                    ? 'linear-gradient(180deg, rgba(245,158,11,0.5), rgba(217,119,6,0.2))'
                    : entry?.rank === 2
                    ? 'linear-gradient(180deg, rgba(148,163,184,0.3), rgba(148,163,184,0.08))'
                    : 'linear-gradient(180deg, rgba(180,123,88,0.3), rgba(180,123,88,0.08))',
                  border: isFirst ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(148,163,184,0.12)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                  paddingTop: 10, gap: 4,
                }}>
                  <span style={{ fontSize: isFirst ? 22 : 18 }}>
                    {entry?.rank === 1 ? '🥇' : entry?.rank === 2 ? '🥈' : '🥉'}
                  </span>
                  <span className="t-mono" style={{ fontSize: 11, fontWeight: 700, color: isFirst ? '#F59E0B' : 'var(--text-secondary)' }}>
                    {fmt(entry?.amount ?? 0)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Leaderboard rows */}
      <div style={{ padding: '20px 24px' }}>
        {displayBoard.length === 0 ? (
          <p className="t-caption" style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-faint)' }}>
            No data yet — won deals during the challenge period will appear here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayBoard.map(entry => {
              const pct    = target > 0 ? Math.min(100, (entry.amount / target) * 100) : 0
              const isMe   = entry.rep_id === userId
              const reward = rewards.find(r => r.rank === entry.rank)
              return (
                <div key={entry.rep_id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                    <span style={{ width: 26, fontSize: 14, textAlign: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>
                    <RepInitial name={entry.name} isMe={isMe} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 700 : 400, color: isMe ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                      {entry.name}{isMe ? ' (you)' : ''}
                    </span>
                    {reward && <span style={{ fontSize: 13 }} title={reward.title}>{reward.badge_emoji}</span>}
                    <span className="t-mono" style={{
                      fontSize: 13, fontWeight: 600, minWidth: 58, textAlign: 'right',
                      color: entry.amount > 0 ? (isMe ? 'var(--brand-primary)' : 'var(--text-primary)') : 'var(--text-faint)',
                    }}>
                      {fmt(entry.amount)}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginLeft: 64 }}>
                    <div style={{
                      height: '100%', borderRadius: 999, width: `${pct}%`,
                      background: isMe
                        ? 'linear-gradient(90deg, #4F8EF7, #7C3AED)'
                        : `rgba(148,163,184,${entry.rank <= 3 ? '0.3' : '0.18'})`,
                      transition: 'width 1s ease-out',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Claim Reward (reps) */}
        {role === 'rep' && myEntry && (() => {
          const myReward = rewards.find(r => r.rank === myEntry.rank)
          if (!myReward) return null
          const done = claimed.has(myReward.id)
          return (
            <div style={{
              marginTop: 20, padding: '14px 16px', borderRadius: 12,
              background: done ? 'rgba(100,116,139,0.07)' : 'rgba(79,142,247,0.08)',
              border: done ? '1px solid rgba(100,116,139,0.2)' : '1px solid rgba(79,142,247,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>{myReward.badge_emoji}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    You qualified: {myReward.title}
                  </p>
                  {myReward.cash_amount && (
                    <p style={{ fontSize: 12, color: '#4ADE80', fontWeight: 600 }}>
                      {fmt(myReward.cash_amount)} reward
                    </p>
                  )}
                </div>
              </div>
              <button
                disabled={done || claiming}
                onClick={() => claimReward(myReward, myEntry.amount)}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', flexShrink: 0,
                  cursor: done ? 'default' : 'pointer',
                  background: done ? 'rgba(100,116,139,0.2)' : 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
                  color: done ? 'var(--text-faint)' : '#fff',
                  fontSize: 13, fontWeight: 700, opacity: claiming ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {done ? '✓ Claimed' : claiming ? 'Claiming…' : '🎉 Claim Reward'}
              </button>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
