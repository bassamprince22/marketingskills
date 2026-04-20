'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { PipelineFunnelChart } from '@/components/sales/PipelineFunnelChart'
import { RepPerformanceTable } from '@/components/sales/RepPerformanceTable'
import { ActivityFeed } from '@/components/sales/ActivityFeed'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'
import { NotificationPanel } from '@/components/sales/NotificationPanel'
import { CommissionWidget } from '@/components/sales/CommissionWidget'
import { ChallengeRaceWidget } from '@/components/sales/ChallengeRaceWidget'
import type {
  ManagerStats,
  RepStats,
  PipelineCount,
  RepPerformance,
  Activity,
  Lead,
  Meeting,
} from '@/lib/sales/types'

interface DashData {
  type: 'manager' | 'rep'
  stats: ManagerStats | RepStats
  pipeline: PipelineCount[]
  performance: RepPerformance[]
  activities: Activity[]
  overdue: Lead[]
  stale: Lead[]
  todayMeetings: Meeting[]
  atRisk: Lead[]
  unassignedLeads?: Lead[]
}

type AlertTone = 'red' | 'amber' | 'purple' | 'cyan' | 'blue'
type StatTone = 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red'

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function formatValue(value: number, isCurrency = false) {
  if (!isCurrency) return value.toLocaleString()
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

function Glyph({
  children,
  width = 16,
}: {
  children: ReactNode
  width?: number
}) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function MissionAlertPill({
  tone,
  icon,
  count,
  label,
  href,
  wide = false,
}: {
  tone: AlertTone
  icon: ReactNode
  count: number
  label: string
  href: string
  wide?: boolean
}) {
  return (
    <Link href={href} className={`mission-alert-pill tone-${tone}${wide ? ' wide' : ''}`}>
      <span className="mission-alert-icon">{icon}</span>
      <span>
        <span className="mission-alert-count">{count}</span>
        <span className="mission-alert-label">{label}</span>
      </span>
    </Link>
  )
}

function MissionStatCard({
  tone,
  icon,
  value,
  label,
  trend,
  isCurrency = false,
}: {
  tone: StatTone
  icon: ReactNode
  value: number
  label: string
  trend?: string
  isCurrency?: boolean
}) {
  return (
    <div className={`mission-stat-card color-${tone}`}>
      <div className="mission-stat-top">
        <span className="mission-stat-icon">{icon}</span>
        {trend ? <span className="mission-stat-trend">{trend}</span> : null}
      </div>
      <div className="mission-stat-value">{formatValue(value, isCurrency)}</div>
      <div className="mission-stat-label">{label}</div>
    </div>
  )
}

function DashboardHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="mission-dashboard-hero">
      <p className="mission-hero-eyebrow">FADAA · MISSION CONTROL</p>
      <h1 className="mission-hero-title">{title}</h1>
      <p className="mission-hero-subtitle">{subtitle}</p>
    </section>
  )
}

function PanelItem({
  href,
  children,
  accent,
}: {
  href: string
  children: ReactNode
  accent: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 12px',
          borderRadius: 8,
          background: `${accent}09`,
          border: `1px solid ${accent}1A`,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `${accent}14`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = `${accent}09`
        }}
      >
        {children}
      </div>
    </Link>
  )
}

function OverduePanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#F87171' }}>Overdue Follow-ups</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>Act now . past due date</p>
        </div>
        <Link href="/sales/leads" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>View all {'->'}</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.slice(0, 5).map(lead => (
          <PanelItem key={lead.id} href={`/sales/leads/${lead.id}`} accent="#DC2626">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-card-title t-truncate">{lead.company_name}</p>
              <p className="t-caption">{lead.contact_person}{lead.assigned_rep ? ` . ${lead.assigned_rep.name}` : ''}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: '#F87171', fontSize: 12, fontWeight: 700 }}>{daysSince(lead.next_follow_up_date!)}d overdue</p>
              <p className="t-caption">{lead.pipeline_stage.replace(/_/g, ' ')}</p>
            </div>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

function TodayMeetingsPanel({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#67E8F9' }}>Today&apos;s Meetings</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>{meetings.length} meeting{meetings.length === 1 ? '' : 's'} scheduled</p>
        </div>
        <Link href="/sales/meetings" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>View all {'->'}</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {meetings.map(meeting => (
          <PanelItem key={meeting.id} href="/sales/meetings" accent="#06B6D4">
            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 48 }}>
              <p style={{ color: '#67E8F9', fontSize: 12, fontWeight: 700 }}>
                {new Date(meeting.meeting_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-card-title t-truncate">{(meeting as Meeting & { lead?: Lead }).lead?.company_name ?? '-'}</p>
              <p className="t-caption">{meeting.meeting_type.replace('_', ' ')}{meeting.rep ? ` . ${meeting.rep.name}` : ''}</p>
            </div>
            <span className="badge badge-scheduled">{meeting.status}</span>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

function AtRiskPanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#C5A8FF' }}>Deals at Risk</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>No activity for 14+ days</p>
        </div>
        <Link href="/sales/pipeline" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>Pipeline {'->'}</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.slice(0, 5).map(lead => (
          <PanelItem key={lead.id} href={`/sales/leads/${lead.id}`} accent="#8B5CF6">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-card-title t-truncate">{lead.company_name}</p>
              <p className="t-caption">{lead.pipeline_stage.replace(/_/g, ' ')}{lead.assigned_rep ? ` . ${lead.assigned_rep.name}` : ''}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {lead.estimated_value ? (
                <p style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }} className="t-mono">
                  ${(lead.estimated_value / 1000).toFixed(1)}k
                </p>
              ) : null}
              <p style={{ color: '#C5A8FF', fontSize: 11 }}>{daysSince(lead.updated_at)}d idle</p>
            </div>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

function StalePanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#8EB5FC' }}>Stale Leads</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>No update in 7+ days</p>
        </div>
        <Link href="/sales/leads" className="t-caption" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>View all {'->'}</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.slice(0, 4).map(lead => (
          <PanelItem key={lead.id} href={`/sales/leads/${lead.id}`} accent="#4F8EF7">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-body t-truncate" style={{ fontWeight: 500 }}>{lead.company_name}</p>
              <p className="t-caption">{lead.pipeline_stage.replace(/_/g, ' ')}</p>
            </div>
            <p className="t-caption">{daysSince(lead.updated_at)}d ago</p>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

function UnassignedLeadsPanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="fadaa-card" style={{ border: '1px solid rgba(155,107,255,0.28)' }}>
      <div className="card-header">
        <div>
          <h3 className="t-section-title" style={{ color: '#C5A8FF' }}>Unassigned Leads</h3>
          <p className="t-caption" style={{ marginTop: 2 }}>Assign to a rep to activate</p>
        </div>
        <Link href="/sales/leads?repId=unassigned" className="t-caption" style={{ textDecoration: 'none', color: '#C5A8FF' }}>View all {'->'}</Link>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.slice(0, 5).map(lead => (
          <PanelItem key={lead.id} href={`/sales/leads/${lead.id}`} accent="#8B5CF6">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-card-title t-truncate">{lead.company_name}</p>
              <p className="t-caption">{lead.contact_person} . {lead.lead_source?.replace(/_/g, ' ') ?? '-'}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {lead.estimated_value ? (
                <p style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }} className="t-mono">
                  ${(lead.estimated_value / 1000).toFixed(1)}k
                </p>
              ) : null}
              <p style={{ color: '#C5A8FF', fontSize: 11 }}>{daysSince(lead.created_at ?? lead.updated_at)}d ago</p>
            </div>
          </PanelItem>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="skeleton" style={{ height: 140, borderRadius: 18 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton" style={{ height: 76, borderRadius: 18 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton" style={{ height: 160, borderRadius: 18 }} />
        ))}
      </div>
    </div>
  )
}

function ManagerDash({ data }: { data: DashData }) {
  const stats = data.stats as ManagerStats

  return (
    <div className="mission-dashboard">
      <DashboardHero title="Mission Control" subtitle="A cosmic view of your sales pipeline" />

      <div className="mission-alert-grid">
        <MissionAlertPill
          tone="red"
          count={data.unassignedLeads?.length ?? 0}
          label="unassigned leads"
          href="/sales/leads?repId=unassigned"
          icon={<Glyph><path d="M12 3c4 0 7 3.1 7 6.9 0 4.9-7 11.1-7 11.1S5 14.8 5 9.9C5 6.1 8 3 12 3Z" /><path d="M12 7v6" /><path d="M12 17h.01" /></Glyph>}
        />
        <MissionAlertPill
          tone="amber"
          count={data.overdue.length}
          label="overdue follow-ups"
          href="/sales/leads?filter=overdue"
          icon={<Glyph><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></Glyph>}
        />
        <MissionAlertPill
          tone="purple"
          count={data.atRisk.length}
          label="deals at risk"
          href="/sales/pipeline"
          icon={<Glyph><path d="M12 3l7 4v5c0 4.4-2.9 8.5-7 9-4.1-.5-7-4.6-7-9V7l7-4Z" /><path d="m9.5 12 1.8 1.8 3.8-4.3" /></Glyph>}
        />
        <MissionAlertPill
          tone="cyan"
          count={data.todayMeetings.length}
          label="meetings today"
          href="/sales/meetings"
          icon={<Glyph><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Glyph>}
        />
        <MissionAlertPill
          tone="blue"
          count={data.stale.length}
          label="stale leads"
          href="/sales/leads?filter=stale"
          wide
          icon={<Glyph><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></Glyph>}
        />
      </div>

      <section>
        <div className="mission-section-label">Pipeline Overview</div>
        <div className="mission-stat-grid">
          <MissionStatCard tone="blue" label="Total Leads" value={stats.total_leads} trend="+12.3%" icon={<Glyph><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /></Glyph>} />
          <MissionStatCard tone="cyan" label="New This Week" value={stats.new_leads} trend="+8.5%" icon={<Glyph><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /></Glyph>} />
          <MissionStatCard tone="purple" label="Qualified" value={stats.qualified_leads} trend="+4.1%" icon={<Glyph><path d="M12 3l6 3.5v7L12 20l-6-6.5v-7L12 3Z" /></Glyph>} />
          <MissionStatCard tone="amber" label="Meetings Booked" value={stats.meetings_booked} trend="+15.0%" icon={<Glyph><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Glyph>} />
          <MissionStatCard tone="blue" label="Proposals Sent" value={stats.proposals_sent} icon={<Glyph><path d="M8 6h9" /><path d="M8 12h9" /><path d="M8 18h9" /><path d="M5 6h.01M5 12h.01M5 18h.01" /></Glyph>} />
          <MissionStatCard tone="amber" label="Contracts Sent" value={stats.contracts_sent} icon={<Glyph><path d="M7 12h10" /><path d="m13 8 4 4-4 4" /><path d="M7 8H4v8h3" /></Glyph>} />
          <MissionStatCard tone="green" label="Won" value={stats.won} icon={<Glyph><path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8 6.7 19l1-5.8-4.2-4.1 5.9-.9L12 3Z" /></Glyph>} />
          <MissionStatCard tone="red" label="Lost" value={stats.lost} icon={<Glyph><path d="m8 8 8 8" /><path d="m16 8-8 8" /></Glyph>} />
        </div>
      </section>

      <NotificationPanel />
      <ChallengeRaceWidget />
      <CommissionWidget />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <UnassignedLeadsPanel leads={data.unassignedLeads ?? []} />
        <OverduePanel leads={data.overdue} />
        <TodayMeetingsPanel meetings={data.todayMeetings} />
        <AtRiskPanel leads={data.atRisk} />
        <StalePanel leads={data.stale} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fadaa-card">
          <div className="card-header">
            <div>
              <h2 className="t-section-title">Pipeline by Stage</h2>
              <p className="t-caption" style={{ marginTop: 2 }}>Lead counts across all stages</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <PipelineFunnelChart data={data.pipeline} />
          </div>
        </div>

        <div className="fadaa-card">
          <div className="card-header">
            <div>
              <h2 className="t-section-title">Rep Leaderboard</h2>
              <p className="t-caption" style={{ marginTop: 2 }}>Performance across the team</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <RepPerformanceTable data={data.performance} />
          </div>
        </div>
      </section>

      <section>
        <AutoAssignCard />
      </section>

      <section>
        <div className="fadaa-card">
          <div className="card-header">
            <div>
              <h2 className="t-section-title">Recent Activity</h2>
              <p className="t-caption" style={{ marginTop: 2 }}>Latest team actions</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <ActivityFeed activities={data.activities} />
          </div>
        </div>
      </section>
    </div>
  )
}

function RepDash({ data }: { data: DashData }) {
  const stats = data.stats as RepStats

  return (
    <div className="mission-dashboard">
      <DashboardHero title="Mission Control" subtitle="A cosmic view of your sales pipeline" />

      <div className="mission-alert-grid">
        <MissionAlertPill
          tone="amber"
          count={data.overdue.length}
          label="overdue follow-ups"
          href="/sales/leads?filter=overdue"
          icon={<Glyph><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></Glyph>}
        />
        <MissionAlertPill
          tone="purple"
          count={data.atRisk.length}
          label="deals at risk"
          href="/sales/pipeline"
          icon={<Glyph><path d="M12 3l6 3.5v7L12 20l-6-6.5v-7L12 3Z" /></Glyph>}
        />
        <MissionAlertPill
          tone="cyan"
          count={data.todayMeetings.length}
          label="meetings today"
          href="/sales/meetings"
          icon={<Glyph><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Glyph>}
        />
        <MissionAlertPill
          tone="blue"
          count={data.stale.length}
          label="stale leads"
          href="/sales/leads?filter=stale"
          wide
          icon={<Glyph><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></Glyph>}
        />
      </div>

      <section>
        <div className="mission-section-label">My Pipeline</div>
        <div className="mission-stat-grid compact">
          <MissionStatCard tone="blue" label="My Leads" value={stats.my_leads} trend="+9.2%" icon={<Glyph><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /></Glyph>} />
          <MissionStatCard tone="purple" label="My Meetings" value={stats.my_meetings} trend="+3.4%" icon={<Glyph><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Glyph>} />
          <MissionStatCard tone="cyan" label="My Qualified" value={stats.my_qualified} trend="+6.8%" icon={<Glyph><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /></Glyph>} />
          <MissionStatCard tone="amber" label="My Proposals" value={stats.my_proposals} icon={<Glyph><path d="M8 6h9" /><path d="M8 12h9" /><path d="M8 18h9" /><path d="M5 6h.01M5 12h.01M5 18h.01" /></Glyph>} />
          <MissionStatCard tone="green" label="My Won" value={stats.my_won} icon={<Glyph><path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8 6.7 19l1-5.8-4.2-4.1 5.9-.9L12 3Z" /></Glyph>} />
        </div>
      </section>

      <ChallengeRaceWidget />
      <CommissionWidget />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <TodayMeetingsPanel meetings={data.todayMeetings} />
        <OverduePanel leads={data.overdue} />
        <AtRiskPanel leads={data.atRisk} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fadaa-card">
          <div className="card-header">
            <h2 className="t-section-title">My Pipeline</h2>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <PipelineFunnelChart data={data.pipeline} />
          </div>
        </div>

        <div className="fadaa-card">
          <div className="card-header">
            <h2 className="t-section-title">Recent Activity</h2>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <ActivityFeed activities={data.activities} />
          </div>
        </div>
      </section>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/sales/stats')
      .then(response => response.json())
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
  }, [])

  const role = (session?.user as { role?: string } | undefined)?.role ?? 'rep'

  return (
    <SalesShell>
      {error && (
        <div
          style={{
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#F87171',
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!data ? <DashboardSkeleton /> : role === 'manager' || role === 'admin' ? <ManagerDash data={data} /> : <RepDash data={data} />}
    </SalesShell>
  )
}
