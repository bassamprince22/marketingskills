'use client'

import type { RepPerformance } from '@/lib/sales/types'

interface Props { data: RepPerformance[] }

const AVATAR_PALETTE = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EC4899','#14B8A6','#EF4444']

function avatarColor(name: string) {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
}

function Avatar({ name }: { name: string }) {
  const color = avatarColor(name)
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: `${color}22`, border: `2px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h12v7a6 6 0 0 1-12 0V3Z" stroke="#F59E0B" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M6 6H2a3 3 0 0 0 3 3" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18 6h4a3 3 0 0 1-3 3" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 16v3" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8 22h8" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export function CrewLeaderboard({ data }: Props) {
  const sorted  = [...data].sort((a, b) => b.pipeline - a.pipeline)
  const maxPipe = Math.max(...sorted.map(r => r.pipeline), 1)

  return (
    <div
      className="fadaa-card"
      style={{
        background: 'linear-gradient(160deg, rgba(10,12,30,0.98) 0%, rgba(14,18,40,0.98) 100%)',
        border: '1px solid rgba(99,102,241,0.15)',
      }}
    >
      <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 4 }}>
            Rep Performance
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Crew Leaderboard</h2>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          This month <span style={{ fontSize: 9 }}>▾</span>
        </div>
      </div>

      <div style={{ padding: '8px 0' }}>
        {sorted.length === 0 ? (
          <p style={{ padding: '24px 20px', color: 'var(--text-faint)', fontSize: 13, textAlign: 'center' }}>No rep data yet</p>
        ) : sorted.map((rep, i) => {
          const color     = avatarColor(rep.rep_name)
          const pipeVal   = rep.pipeline >= 1000 ? `$${Math.round(rep.pipeline / 1000)}k` : `$${rep.pipeline}`
          const barPct    = Math.round((rep.pipeline / maxPipe) * 100)

          return (
            <div
              key={rep.rep_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 20px',
                borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              {/* Rank */}
              <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {i === 0
                  ? <TrophyIcon />
                  : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)' }}>#{i + 1}</span>
                }
              </div>

              <Avatar name={rep.rep_name} />

              {/* Name + stats */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rep.rep_name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{rep.leads} leads</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{rep.meetings} mtgs</span>
                  <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600 }}>{rep.won} won</span>
                </div>
              </div>

              {/* Value + bar */}
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', fontFamily: 'var(--font-mono, monospace)', marginBottom: 5 }}>
                  {pipeVal}
                </p>
                <div style={{ width: 70, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${barPct}%`,
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${color}CC, ${color})`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
