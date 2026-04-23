'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { ChallengeRaceWidget } from '@/components/sales/ChallengeRaceWidget'
import { ChallengeAdminPanel } from '@/components/sales/ChallengeAdminPanel'

type Tab = 'race' | 'history' | 'manage'

interface ChallengeRow {
  id:    string
  title: string
  description:  string | null
  target_amount: number | null
  start_date:   string
  end_date:     string | null
  is_active:    boolean
  sales_challenge_rewards?: Array<{
    id: string; rank: number; title: string
    badge_emoji: string; cash_amount: number | null
  }>
}

interface LbEntry { rep_id: string; name: string; amount: number; rank: number }

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function PastChallengeCard({ c }: { c: ChallengeRow }) {
  const [expanded, setExpanded] = useState(false)
  const [lb,       setLb]       = useState<LbEntry[]>([])
  const [lbLoad,   setLbLoad]   = useState(false)

  async function toggle() {
    if (!expanded && lb.length === 0) {
      setLbLoad(true)
      const d = await fetch(`/api/sales/challenges/${c.id}/leaderboard`).then(r => r.json())
      setLb(d.leaderboard ?? [])
      setLbLoad(false)
    }
    setExpanded(e => !e)
  }

  const totalPrizes = (c.sales_challenge_rewards ?? []).reduce((s, r) => s + (r.cash_amount ?? 0), 0)
  const topRewards  = (c.sales_challenge_rewards ?? []).slice(0, 3)

  return (
    <div className="fadaa-card" style={{ overflow: 'hidden', padding: 0 }}>
      <button
        onClick={toggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 20px', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>🏆 {c.title}</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', background: 'rgba(100,116,139,0.12)', padding: '2px 7px', borderRadius: 999 }}>ENDED</span>
            </div>
            <p className="t-caption" style={{ marginTop: 3 }}>
              {c.start_date}{c.end_date ? ` → ${c.end_date}` : ''}
              {c.target_amount ? ` · Target: ${fmt(c.target_amount)}` : ''}
              {totalPrizes > 0 ? ` · ${fmt(totalPrizes)} in prizes` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ display: 'flex' }}>
              {topRewards.map((r, i) => (
                <span key={r.id} style={{ fontSize: 18, marginLeft: i > 0 ? -4 : 0 }}>{r.badge_emoji}</span>
              ))}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 20px 18px' }}>
          <p className="t-label" style={{ marginBottom: 10 }}>Final Standings</p>
          {lbLoad ? (
            [1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 28, borderRadius: 6, marginBottom: 8 }} />
            ))
          ) : lb.length === 0 ? (
            <p className="t-caption" style={{ color: 'var(--text-faint)' }}>No results recorded for this challenge.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {lb.slice(0, 10).map(e => (
                <div key={e.rep_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ width: 26, fontSize: 15, textAlign: 'center', flexShrink: 0 }}>
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: e.rank <= 3 ? 'linear-gradient(135deg, #4F8EF7, #7C3AED)' : 'rgba(100,116,139,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: e.rank <= 3 ? '#fff' : 'var(--text-muted)',
                  }}>
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{e.name}</span>
                  <span className="t-mono" style={{ fontSize: 13, color: e.amount > 0 ? '#4ADE80' : 'var(--text-faint)', fontWeight: e.amount > 0 ? 700 : 400 }}>
                    {fmt(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ChallengesPage() {
  const { data: session } = useSession()
  const role         = (session?.user as { role?: string })?.role ?? 'rep'
  const isPrivileged = role === 'manager' || role === 'admin'

  const [tab,         setTab]        = useState<Tab>('race')
  const [challenges,  setChallenges] = useState<ChallengeRow[]>([])
  const [histLoad,    setHistLoad]   = useState(false)
  const [histFetched, setHistFetched]= useState(false)

  const fetchChallenges = useCallback(() => {
    if (histFetched) return
    setHistLoad(true)
    fetch('/api/sales/challenges')
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges ?? []); setHistLoad(false); setHistFetched(true) })
      .catch(() => setHistLoad(false))
  }, [histFetched])

  useEffect(() => {
    if (tab === 'history' || tab === 'manage') fetchChallenges()
  }, [tab, fetchChallenges])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'race',    label: '🏁 Live Race' },
    { key: 'history', label: '📊 History' },
    ...(isPrivileged ? [{ key: 'manage' as Tab, label: '⚙ Manage' }] : []),
  ]

  const pastChallenges = challenges.filter(c => !c.is_active)

  return (
    <SalesShell>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-header-left">
          <h1 className="t-page-title">Challenges</h1>
          <p className="t-caption">
            {isPrivileged ? 'Manage and monitor sales competitions' : 'Compete and win rewards'}
          </p>
        </div>
        {isPrivileged && (
          <button className="fadaa-btn fadaa-btn-sm" onClick={() => setTab('manage')}>
            + New Challenge
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="tab-underline-bar" style={{ marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`tab-underline${tab === t.key ? ' active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Live Race tab */}
      {tab === 'race' && (
        <ChallengeRaceWidget
          onManageClick={isPrivileged ? () => setTab('manage') : undefined}
        />
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {histLoad ? (
            [1, 2, 3].map(i => (
              <div key={i} className="skeleton fadaa-card" style={{ height: 72 }} />
            ))
          ) : pastChallenges.length === 0 ? (
            <div className="fadaa-card">
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-title">No past challenges yet</p>
                <p className="empty-state-desc">
                  Completed and deactivated challenges will show final standings here.
                </p>
              </div>
            </div>
          ) : (
            pastChallenges.map(c => <PastChallengeCard key={c.id} c={c} />)
          )}
        </div>
      )}

      {/* Manage tab — privileged only */}
      {tab === 'manage' && isPrivileged && <ChallengeAdminPanel />}
    </SalesShell>
  )
}
