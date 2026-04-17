'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { FadaaStatCard } from '@/components/sales/FadaaStatCard'
import { PipelineFunnelChart } from '@/components/sales/PipelineFunnelChart'
import { RepPerformanceTable } from '@/components/sales/RepPerformanceTable'
import { ActivityFeed } from '@/components/sales/ActivityFeed'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'
import { NotificationPanel } from '@/components/sales/NotificationPanel'
import type { ManagerStats, RepStats, PipelineCount, RepPerformance, Activity, Lead, Meeting } from '@/lib/sales/types'

interface DashData {
  type:          'manager' | 'rep'
  stats:         ManagerStats | RepStats
  pipeline:      PipelineCount[]
  performance:   RepPerformance[]
  activities:    Activity[]
  overdue:       Lead[]
  stale:         Lead[]
  todayMeetings: Meeting[]
  atRisk:        Lead[]
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function daysOverdue(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

// ─── Alert Banner ─────────────────────────────────
function AlertBanner({ overdue, stale, atRisk, todayMeetings }: {
  overdue: Lead[]; stale: Lead[]; atRisk: Lead[]; todayMeetings: Meeting[]
}) {
  const alerts = [
    overdue.length      > 0 && { color: '#F87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   icon: '⚠', count: overdue.length,      label: 'overdue follow-up', labelPlural: 'overdue follow-ups', href: '/sales/leads?filter=overdue' },
    atRisk.length       > 0 && { color: '#FCD34D', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: '◈', count: atRisk.length,        label: 'deal at risk',      labelPlural: 'deals at risk',      href: '/sales/pipeline' },
    stale.length        > 0 && { color: '#94A3B8', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', icon: '◌', count: stale.length,         label: 'stale lead',        labelPlural: 'stale leads',        href: '/sales/leads?filter=stale' },
    todayMeetings.length> 0 && { color: '#34D399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  icon: '◷', count: todayMeetings.length, label: 'meeting today',    labelPlural: 'meetings today',     href: '/sales/meetings' },
  ].filter(Boolean) as { color: string; bg: string; border: string; icon: string; count: number; label: string; labelPlural: string; href: string }[]

  if (alerts.length === 0) {
    return (
      <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#34D399', fontSize: 16 }}>✦</span>
        <span style={{ color: '#34D399', fontSize: 13, fontWeight: 500 }}>All clear — no overdue follow-ups or at-risk deals</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
      {alerts.map((a, i) => (
        <Link key={i} href={a.href} style={{ textDecoration: 'none', flex: '1 1 180px', minWidth: 160 }}>
          <div style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'opacity 0.15s' }}>
            <span style={{ color: a.color, fontSize: 20, lineHeight: 1 }}>{a.icon}</span>
            <div>
              <p style={{ color: a.color, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{a.count}</p>
              <p style={{ color: a.color, fontSize: 11, opacity: 0.8, marginTop: 2 }}>{a.count === 1 ? a.label : a.labelPlural}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ─── Overdue Panel ────────────────────────────────
function OverduePanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ color: '#F87171', fontSize: 14, fontWeight: 700 }}>⚠ Overdue Follow-ups</h3>
          <p style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>These leads needed action — act now</p>
        </div>
        <Link href="/sales/leads" style={{ color: '#64748B', fontSize: 11, textDecoration: 'none' }}>View all →</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {leads.slice(0, 5).map(l => (
          <Link key={l.id} href={`/sales/leads/${l.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.1)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</p>
                <p style={{ color: '#94A3B8', fontSize: 11 }}>{l.contact_person}{l.assigned_rep ? ` · ${l.assigned_rep.name}` : ''}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ color: '#F87171', fontSize: 12, fontWeight: 700 }}>{daysOverdue(l.next_follow_up_date!)}d overdue</p>
                <p style={{ color: '#64748B', fontSize: 10 }}>{l.pipeline_stage.replace('_', ' ')}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Today's Meetings Panel ───────────────────────
function TodayMeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) return null
  return (
    <div className="fadaa-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ color: '#34D399', fontSize: 14, fontWeight: 700 }}>◷ Today&apos;s Meetings</h3>
          <p style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        <Link href="/sales/meetings" style={{ color: '#64748B', fontSize: 11, textDecoration: 'none' }}>View all →</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {meetings.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(52,211,153,0.05)', borderRadius: 8, border: '1px solid rgba(52,211,153,0.1)' }}>
            <div style={{ textAlign: 'center', flexShrink: 0, width: 44 }}>
              <p style={{ color: '#34D399', fontSize: 13, fontWeight: 700 }}>
                {new Date(m.meeting_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(m as any).lead?.company_name ?? '—'}
              </p>
              <p style={{ color: '#94A3B8', fontSize: 11 }}>{m.meeting_type.replace('_', ' ')}{m.rep ? ` · ${m.rep.name}` : ''}</p>
            </div>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'rgba(79,142,247,0.1)', color: '#60A5FA', flexShrink: 0 }}>
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── At Risk Panel ────────────────────────────────
function AtRiskPanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ color: '#FCD34D', fontSize: 14, fontWeight: 700 }}>◈ Deals at Risk</h3>
          <p style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>No activity for 14+ days</p>
        </div>
        <Link href="/sales/pipeline" style={{ color: '#64748B', fontSize: 11, textDecoration: 'none' }}>Pipeline →</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {leads.slice(0, 5).map(l => (
          <Link key={l.id} href={`/sales/leads/${l.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(245,158,11,0.05)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.1)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</p>
                <p style={{ color: '#94A3B8', fontSize: 11 }}>{l.pipeline_stage.replace(/_/g, ' ')}{l.assigned_rep ? ` · ${l.assigned_rep.name}` : ''}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {l.estimated_value ? <p style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }}>${(l.estimated_value/1000).toFixed(1)}k</p> : null}
                <p style={{ color: '#FCD34D', fontSize: 11 }}>{daysSince(l.updated_at)}d idle</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Stale Leads Panel ────────────────────────────
function StalePanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ color: '#94A3B8', fontSize: 14, fontWeight: 700 }}>◌ Stale Leads</h3>
          <p style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>No update in 7+ days</p>
        </div>
        <Link href="/sales/leads" style={{ color: '#64748B', fontSize: 11, textDecoration: 'none' }}>View all →</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {leads.slice(0, 4).map(l => (
          <Link key={l.id} href={`/sales/leads/${l.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(100,116,139,0.05)', borderRadius: 8, border: '1px solid rgba(100,116,139,0.12)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.company_name}</p>
                <p style={{ color: '#64748B', fontSize: 11 }}>{l.pipeline_stage.replace(/_/g, ' ')}</p>
              </div>
              <p style={{ color: '#64748B', fontSize: 11, flexShrink: 0 }}>{daysSince(l.updated_at)}d ago</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Manager Dashboard ────────────────────────────
function ManagerDash({ data }: { data: DashData }) {
  const s = data.stats as ManagerStats

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Live notification panel */}
      <NotificationPanel />

      {/* Action Alert Banners */}
      <AlertBanner overdue={data.overdue} stale={data.stale} atRisk={data.atRisk} todayMeetings={data.todayMeetings} />

      {/* Stat grid */}
      <section>
        <h2 style={{ color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pipeline Overview</h2>
        <div className="sales-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <FadaaStatCard label="Total Leads"     value={s.total_leads}     icon="◎" color="blue"   delay={0}   />
          <FadaaStatCard label="New This Week"   value={s.new_leads}       icon="✦" color="cyan"   delay={60}  />
          <FadaaStatCard label="Qualified"       value={s.qualified_leads} icon="⬡" color="purple" delay={120} />
          <FadaaStatCard label="Meetings Booked" value={s.meetings_booked} icon="◷" color="amber"  delay={180} />
          <FadaaStatCard label="Proposals Sent"  value={s.proposals_sent}  icon="⎗" color="blue"   delay={240} />
          <FadaaStatCard label="Contracts Sent"  value={s.contracts_sent}  icon="⟿" color="amber"  delay={300} />
          <FadaaStatCard label="Won"             value={s.won}             icon="★" color="green"  delay={360} />
          <FadaaStatCard label="Lost"            value={s.lost}            icon="✗" color="red"    delay={420} />
        </div>
      </section>

      {/* Action panels row */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <OverduePanel     leads={data.overdue} />
        <TodayMeetingsPanel meetings={data.todayMeetings} />
        <AtRiskPanel      leads={data.atRisk} />
        <StalePanel       leads={data.stale} />
      </section>

      {/* Charts row */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Pipeline by Stage</h2>
          <p style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>Lead counts across all stages</p>
          <PipelineFunnelChart data={data.pipeline} />
        </div>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Rep Leaderboard</h2>
          <p style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>Performance across the team</p>
          <RepPerformanceTable data={data.performance} />
        </div>
      </section>

      {/* Auto-assignment settings */}
      <section>
        <AutoAssignCard />
      </section>

      {/* Activity */}
      <section>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Recent Activity</h2>
          <p style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>Latest team actions</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Action Alerts */}
      <AlertBanner overdue={data.overdue} stale={data.stale} atRisk={data.atRisk} todayMeetings={data.todayMeetings} />

      {/* My Stats */}
      <section>
        <h2 style={{ color: '#64748B', fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>My Pipeline</h2>
        <div className="sales-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          <FadaaStatCard label="My Leads"     value={s.my_leads}     icon="◎" color="blue"   delay={0}   />
          <FadaaStatCard label="My Meetings"  value={s.my_meetings}  icon="◷" color="purple" delay={60}  />
          <FadaaStatCard label="My Qualified" value={s.my_qualified} icon="✦" color="cyan"   delay={120} />
          <FadaaStatCard label="My Proposals" value={s.my_proposals} icon="⎗" color="amber"  delay={180} />
          <FadaaStatCard label="My Won"       value={s.my_won}       icon="★" color="green"  delay={240} />
        </div>
      </section>

      {/* Today + Overdue */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <TodayMeetingsPanel meetings={data.todayMeetings} />
        <OverduePanel     leads={data.overdue} />
        <AtRiskPanel      leads={data.atRisk} />
      </section>

      {/* Pipeline + Activity */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>My Pipeline</h2>
          <PipelineFunnelChart data={data.pipeline} />
        </div>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h2>
          <ActivityFeed activities={data.activities} />
        </div>
      </section>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────
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
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>
            {role === 'manager' || role === 'admin' ? '⬡ Mission Control' : '◎ My Cockpit'}
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            {name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none' }}>+ New Lead</Link>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#F87171', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {!data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="fadaa-card" style={{ height: 100 }} />
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
