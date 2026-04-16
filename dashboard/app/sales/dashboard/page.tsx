'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { FadaaStatCard } from '@/components/sales/FadaaStatCard'
import { PipelineFunnelChart } from '@/components/sales/PipelineFunnelChart'
import { RepPerformanceTable } from '@/components/sales/RepPerformanceTable'
import { ActivityFeed } from '@/components/sales/ActivityFeed'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'
import type {
  ManagerStats, RepStats, PipelineCount, RepPerformance, Activity,
} from '@/lib/sales/types'

interface DashData {
  type:        'manager' | 'rep'
  stats:       ManagerStats | RepStats
  pipeline:    PipelineCount[]
  performance: RepPerformance[]
  activities:  Activity[]
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 700 }}>{title}</h2>
      {sub && <p style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData]   = useState<DashData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/sales/stats')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
  }, [])

  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const name = session?.user?.name ?? '—'

  return (
    <SalesShell>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 24, fontWeight: 700 }}>
            {role === 'manager' || role === 'admin' ? '⬡ Mission Control' : '◎ My Cockpit'}
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Welcome back, {name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <a
          href="/sales/leads/new"
          className="fadaa-btn"
          style={{ textDecoration: 'none' }}
        >
          + New Lead
        </a>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#F87171', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {!data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="fadaa-card" style={{ height: 120, background: '#0F1629', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : data.type === 'manager' ? (
        <ManagerDash data={data} />
      ) : (
        <RepDash data={data} />
      )}
    </SalesShell>
  )
}

// ─── Manager Dashboard ────────────────────────────

function ManagerDash({ data }: { data: DashData }) {
  const s = data.stats as ManagerStats

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Stat grid */}
      <section>
        <SectionHeader title="Fleet Overview" sub="Real-time pipeline snapshot" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <FadaaStatCard label="Total Leads"     value={s.total_leads}     icon="◎" color="blue"   delay={0}   />
          <FadaaStatCard label="New This Week"   value={s.new_leads}       icon="✦" color="cyan"   delay={80}  />
          <FadaaStatCard label="Qualified"       value={s.qualified_leads} icon="⬡" color="purple" delay={160} />
          <FadaaStatCard label="Meetings Booked" value={s.meetings_booked} icon="◷" color="amber"  delay={240} />
          <FadaaStatCard label="Meetings Done"   value={s.meetings_done}   icon="✓" color="cyan"   delay={320} />
          <FadaaStatCard label="Proposals Sent"  value={s.proposals_sent}  icon="⎗" color="blue"   delay={400} />
          <FadaaStatCard label="Contracts Sent"  value={s.contracts_sent}  icon="⟿" color="amber"  delay={480} />
          <FadaaStatCard label="Won Deals"       value={s.won}             icon="★" color="green"  delay={560} />
          <FadaaStatCard label="Lost Deals"      value={s.lost}            icon="✗" color="red"    delay={640} />
        </div>
      </section>

      {/* Charts + table row */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <SectionHeader title="Pipeline by Stage" sub="Lead counts across all stages" />
          <PipelineFunnelChart data={data.pipeline} />
          {/* Stage legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 12 }}>
            {data.pipeline.map(p => (
              <span key={p.stage} style={{ fontSize: 11, color: '#64748B' }}>
                {p.stage.replace('_', ' ')}: {p.count}
              </span>
            ))}
          </div>
        </div>

        <div className="fadaa-card" style={{ padding: 24 }}>
          <SectionHeader title="Rep Leaderboard" sub="Performance across the team" />
          <RepPerformanceTable data={data.performance} />
        </div>
      </section>

      {/* Auto-assignment settings */}
      <section>
        <AutoAssignCard />
      </section>

      {/* Activity feed */}
      <section>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <SectionHeader title="Recent Activity" sub="Latest team actions" />
          <ActivityFeed activities={data.activities} />
        </div>
      </section>
    </div>
  )
}

// ─── Rep Dashboard ────────────────────────────────

function RepDash({ data }: { data: DashData }) {
  const s = data.stats as RepStats

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Stat grid */}
      <section>
        <SectionHeader title="My Orbit" sub="Your personal pipeline snapshot" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <FadaaStatCard label="My Leads"     value={s.my_leads}     icon="◎" color="blue"   delay={0}   />
          <FadaaStatCard label="My Meetings"  value={s.my_meetings}  icon="◷" color="purple" delay={80}  />
          <FadaaStatCard label="My Qualified" value={s.my_qualified} icon="✦" color="cyan"   delay={160} />
          <FadaaStatCard label="My Proposals" value={s.my_proposals} icon="⎗" color="amber"  delay={240} />
          <FadaaStatCard label="My Won"       value={s.my_won}       icon="★" color="green"  delay={320} />
        </div>
      </section>

      {/* Pipeline + activity */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <SectionHeader title="My Pipeline" sub="Your stage distribution" />
          <PipelineFunnelChart data={data.pipeline} />
        </div>

        <div className="fadaa-card" style={{ padding: 24 }}>
          <SectionHeader title="My Activity" sub="Your recent actions" />
          <ActivityFeed activities={data.activities} />
        </div>
      </section>
    </div>
  )
}
