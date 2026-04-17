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
import { CommissionWidget } from '@/components/sales/CommissionWidget'
import { ChallengeRaceWidget } from '@/components/sales/ChallengeRaceWidget'
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

/* ── Alert Banner ─────────────────────────────────────────────────────── */
function AlertBanner({ overdue, stale, atRisk, todayMeetings }: {
  overdue: Lead[]; stale: Lead[]; atRisk: Lead[]; todayMeetings: Meeting[]
}) {
  const alerts = [
    overdue.length       > 0 && { cls: 'badge-red',    icon: '⚠', count: overdue.length,       label: 'overdue follow-up',  labelP: 'overdue follow-ups', href: '/sales/leads?filter=overdue',  accent: '#F87171', bg: 'rgba(220,38,38,0.07)',   border: 'rgba(220,38,38,0.18)' },
    atRisk.length        > 0 && { cls: 'badge-amber',  icon: '◈', count: atRisk.length,         label: 'deal at risk',        labelP: 'deals at risk',      href: '/sales/pipeline',              accent: '#F59E0B', bg: 'rgba(217,119,6,0.07)',   border: 'rgba(217,119,6,0.18)' },
    stale.length         > 0 && { cls: 'badge-slate',  icon: '◌', count: stale.length,          label: 'stale lead',          labelP: 'stale leads',        href: '/sales/leads?filter=stale',    accent: '#A8B8CC', bg: 'rgba(100,116,139,0.07)', border: 'rgba(100,116,139,0.15)' },
    todayMeetings.length > 0 && { cls: 'badge-green',  icon: '◷', count: todayMeetings.length,  label: 'meeting today',       labelP: 'meetings today',     href: '/sales/meetings',              accent: '#4ADE80', bg: 'rgba(22,163,74,0.07)',   border: 'rgba(22,163,74,0.18)' },
  ].filter(Boolean) as { cls: string; icon: string; count: number; label: string; labelP: string; href: string; accent: string; bg: string; border: string }[]

  if (alerts.length === 0) {
    return (
      <div style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.18)', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#4ADE80', fontSize: 16 }}>✦</span>
        <span style={{ color: '#4ADE80', fontSize: 13, fontWeight: 500 }}>All clear — no overdue follow-ups or at-risk deals</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
      {alerts.map((a, i) => (
        <Link key={i} href={a.href} style={{ textDecoration: 'none', flex: '1 1 160px', minWidth: 140 }}>
          <div style={{
            background: a.bg, border: `1px solid ${a.border}`, borderRadius: 10,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px rgba(0,0,0,0.3)` }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}
          >
            <span style={{ color: a.accent, fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{a.icon}</span>
            <div>
              <p style={{ color: a.accent, fontSize: 22, fontWeight: 700, lineHeight: 1 }} className="t-mono">{a.count}</p>
              <p style={{ color: a.accent, fontSize: 11, opacity: 0.8, marginTop: 2 }}>{a.count === 1 ? a.label : a.labelP}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ── Action panel row item ─────────────────────────────────────────────── */
function PanelItem({ href, children, accent }: { href: string; children: React.ReactNode; accent: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 12px', borderRadius: 8,
        background: `${accent}09`, border: `1px solid ${accent}1A`,
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = `${accent}14`)}
        onMouseLeave={e => (e.currentTarget.style.background = `${accent}09`)}
      >
        {children}
      </div>
    </Link>
  )
}

/* ── Overdue Panel ────────────────────────────────────────────────────── */
function OverduePanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#F87171' }}>⚠ Overdue Follow-ups</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>Act now — past due date</p>
        </div>
        <Link href="/sales/leads" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>View all →</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.slice(0, 5).map(l => (
          <PanelItem key={l.id} href={`/sales/leads/${l.id}`} accent="#DC2626">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-card-title t-truncate">{l.company_name}</p>
              <p className="t-caption">{l.contact_person}{l.assigned_rep ? ` · ${l.assigned_rep.name}` : ''}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: '#F87171', fontSize: 12, fontWeight: 700 }}>{daysSince(l.next_follow_up_date!)}d overdue</p>
              <p className="t-caption">{l.pipeline_stage.replace(/_/g, ' ')}</p>
            </div>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

/* ── Today's Meetings ─────────────────────────────────────────────────── */
function TodayMeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#4ADE80' }}>◷ Today&apos;s Meetings</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        <Link href="/sales/meetings" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>View all →</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {meetings.map(m => (
          <PanelItem key={m.id} href={`/sales/meetings`} accent="#16A34A">
            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 48 }}>
              <p style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }}>
                {new Date(m.meeting_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-card-title t-truncate">{(m as any).lead?.company_name ?? '—'}</p>
              <p className="t-caption">{m.meeting_type.replace('_', ' ')}{m.rep ? ` · ${m.rep.name}` : ''}</p>
            </div>
            <span className="badge badge-scheduled">{m.status}</span>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

/* ── At Risk Panel ────────────────────────────────────────────────────── */
function AtRiskPanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#F59E0B' }}>◈ Deals at Risk</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>No activity for 14+ days</p>
        </div>
        <Link href="/sales/pipeline" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>Pipeline →</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.slice(0, 5).map(l => (
          <PanelItem key={l.id} href={`/sales/leads/${l.id}`} accent="#D97706">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-card-title t-truncate">{l.company_name}</p>
              <p className="t-caption">{l.pipeline_stage.replace(/_/g, ' ')}{l.assigned_rep ? ` · ${l.assigned_rep.name}` : ''}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {l.estimated_value ? <p style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }} className="t-mono">${(l.estimated_value / 1000).toFixed(1)}k</p> : null}
              <p style={{ color: '#F59E0B', fontSize: 11 }}>{daysSince(l.updated_at)}d idle</p>
            </div>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

/* ── Stale Leads Panel ────────────────────────────────────────────────── */
function StalePanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title">◌ Stale Leads</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>No update in 7+ days</p>
        </div>
        <Link href="/sales/leads" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>View all →</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.slice(0, 4).map(l => (
          <PanelItem key={l.id} href={`/sales/leads/${l.id}`} accent="#64748B">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-body t-truncate" style={{ fontWeight: 500 }}>{l.company_name}</p>
              <p className="t-caption">{l.pipeline_stage.replace(/_/g, ' ')}</p>
            </div>
            <p className="t-caption">{daysSince(l.updated_at)}d ago</p>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

/* ── Skeleton loader ──────────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="fadaa-card skeleton" style={{ height: 100 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fadaa-card skeleton" style={{ height: 220 }} />
        <div className="fadaa-card skeleton" style={{ height: 220 }} />
      </div>
    </div>
  )
}

/* ── Manager Dashboard ────────────────────────────────────────────────── */
function ManagerDash({ data }: { data: DashData }) {
  const s = data.stats as ManagerStats
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <NotificationPanel />

      <ChallengeRaceWidget />

      <AlertBanner overdue={data.overdue} stale={data.stale} atRisk={data.atRisk} todayMeetings={data.todayMeetings} />

      <section>
        <p className="t-label" style={{ marginBottom: 12 }}>Pipeline Overview</p>
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

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <OverduePanel      leads={data.overdue} />
        <TodayMeetingsPanel meetings={data.todayMeetings} />
        <AtRiskPanel       leads={data.atRisk} />
        <StalePanel        leads={data.stale} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fadaa-card">
          <div className="card-header">
            <div>
              <h2 className="t-section-title">Pipeline by Stage</h2>
              <p className="t-caption" style={{ marginTop: 2 }}>Lead counts across all stages</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}><PipelineFunnelChart data={data.pipeline} /></div>
        </div>
        <div className="fadaa-card">
          <div className="card-header">
            <div>
              <h2 className="t-section-title">Rep Leaderboard</h2>
              <p className="t-caption" style={{ marginTop: 2 }}>Performance across the team</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}><RepPerformanceTable data={data.performance} /></div>
        </div>
      </section>

      <section><AutoAssignCard /></section>

      <section>
        <div className="fadaa-card">
          <div className="card-header">
            <div>
              <h2 className="t-section-title">Recent Activity</h2>
              <p className="t-caption" style={{ marginTop: 2 }}>Latest team actions</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}><ActivityFeed activities={data.activities} /></div>
        </div>
      </section>
    </div>
  )
}

/* ── Rep Dashboard ────────────────────────────────────────────────────── */
function RepDash({ data }: { data: DashData }) {
  const s = data.stats as RepStats
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <ChallengeRaceWidget />

      <AlertBanner overdue={data.overdue} stale={data.stale} atRisk={data.atRisk} todayMeetings={data.todayMeetings} />

      <CommissionWidget />

      <section>
        <p className="t-label" style={{ marginBottom: 12 }}>My Pipeline</p>
        <div className="sales-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          <FadaaStatCard label="My Leads"     value={s.my_leads}     icon="◎" color="blue"   delay={0}   />
          <FadaaStatCard label="My Meetings"  value={s.my_meetings}  icon="◷" color="purple" delay={60}  />
          <FadaaStatCard label="My Qualified" value={s.my_qualified} icon="✦" color="cyan"   delay={120} />
          <FadaaStatCard label="My Proposals" value={s.my_proposals} icon="⎗" color="amber"  delay={180} />
          <FadaaStatCard label="My Won"       value={s.my_won}       icon="★" color="green"  delay={240} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <TodayMeetingsPanel meetings={data.todayMeetings} />
        <OverduePanel      leads={data.overdue} />
        <AtRiskPanel       leads={data.atRisk} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fadaa-card">
          <div className="card-header">
            <h2 className="t-section-title">My Pipeline</h2>
          </div>
          <div style={{ padding: '16px 20px' }}><PipelineFunnelChart data={data.pipeline} /></div>
        </div>
        <div className="fadaa-card">
          <div className="card-header">
            <h2 className="t-section-title">Recent Activity</h2>
          </div>
          <div style={{ padding: '16px 20px' }}><ActivityFeed activities={data.activities} /></div>
        </div>
      </section>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
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
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">
            {role === 'manager' || role === 'admin' ? 'Mission Control' : 'My Cockpit'}
          </h1>
          <p className="t-caption">
            {name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none' }}>+ New Lead</Link>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: '12px 16px', color: '#F87171', marginBottom: 24, fontSize: 13 }}>
          {error}
        </div>
      )}

      {!data ? <DashboardSkeleton /> : data.type === 'manager' ? <ManagerDash data={data} /> : <RepDash data={data} />}
    </SalesShell>
  )
}
