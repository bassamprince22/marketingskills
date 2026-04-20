'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { PipelineFunnelChart } from '@/components/sales/PipelineFunnelChart'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'
import { NotificationPanel } from '@/components/sales/NotificationPanel'
import { CommissionWidget } from '@/components/sales/CommissionWidget'
import { ChallengeRaceWidget } from '@/components/sales/ChallengeRaceWidget'
import { ClosedRevenueChart } from '@/components/sales/ClosedRevenueChart'
import { CrewLeaderboard } from '@/components/sales/CrewLeaderboard'
import { TodaysOrbit } from '@/components/sales/TodaysOrbit'
import { SignalStream } from '@/components/sales/SignalStream'
import type {
  ManagerStats,
  RepStats,
  PipelineCount,
  RepPerformance,
  Activity,
  Lead,
  Meeting,
} from '@/lib/sales/types'

interface RevenueData { months: { month: string; value: number }[]; total: number; trend: number }
interface WidgetConfig  { id: string; label: string; visible: boolean; order: number }

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

function formatValue(value: number | undefined | null, isCurrency = false) {
  const v = value ?? 0
  if (!isCurrency) return v.toLocaleString()
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v}`
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

const STAGE_COLORS: Record<string, string> = {
  new_lead:           '#9CA3AF',
  contacted:          '#60A5FA',
  discovery:          '#818CF8',
  meeting_scheduled:  '#A78BFA',
  meeting_completed:  '#22D3EE',
  qualified:          '#4ADE80',
  proposal_sent:      '#38BDF8',
  negotiation:        '#FB923C',
  contract_sent:      '#FBBF24',
  won:                '#34D399',
  lost:               '#F87171',
}

const STAGE_DISPLAY: Record<string, string> = {
  new_lead:           'New Lead',
  contacted:          'Contacted',
  discovery:          'Discovery',
  meeting_scheduled:  'Meeting Booked',
  meeting_completed:  'Meeting Done',
  qualified:          'Qualified',
  proposal_sent:      'Proposal Sent',
  negotiation:        'Negotiation',
  contract_sent:      'Contract Sent',
  won:                'Won',
  lost:               'Lost',
}

function PipelineConstellationWidget({ pipeline }: { pipeline: PipelineCount[] }) {
  const total = pipeline.reduce((s, p) => s + (p.value ?? 0), 0)
  const totalFmt = total >= 1000000
    ? `$${(total / 1000000).toFixed(1)}M`
    : total >= 1000
    ? `$${Math.round(total / 1000)}k`
    : `$${total}`

  return (
    <div
      className="fadaa-card"
      style={{
        background: 'linear-gradient(135deg, rgba(15,15,30,0.95) 0%, rgba(20,18,42,0.95) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 4 }}>
            Pipeline
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
            Your constellation &middot;{' '}
            <span style={{ color: '#4ADE80' }} className="t-mono">{totalFmt}</span>
          </h2>
        </div>
        <Link
          href="/sales/pipeline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 16px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
        >
          Open board
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          padding: '16px 20px',
          gap: 0,
          scrollbarWidth: 'none',
        }}
      >
        {pipeline.map((p, i) => {
          const color = STAGE_COLORS[p.stage] ?? '#6366F1'
          const label = STAGE_DISPLAY[p.stage] ?? p.stage.replace(/_/g, ' ')
          const val = p.value ?? 0
          const valFmt = val >= 1000 ? `$${Math.round(val / 1000)}k` : val > 0 ? `$${val}` : '—'
          return (
            <div
              key={p.stage}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 90,
                padding: '0 8px',
                borderRight: i < pipeline.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                {p.count}
              </span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 6px ${color}88`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap', marginTop: 2 }}>
                {label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono, monospace)' }}>
                {valFmt}
              </span>
            </div>
          )
        })}
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

type WVisibleFn = (id: string) => boolean

function ManagerDash({ data, revenue, wVisible }: { data: DashData; revenue: RevenueData | null; wVisible: WVisibleFn }) {
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

      {wVisible('stat_cards') && <section>
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
      </section>}

      {wVisible('pipeline_constellation') && <PipelineConstellationWidget pipeline={data.pipeline} />}

      {wVisible('notifications') && <NotificationPanel />}
      {wVisible('challenges')    && <ChallengeRaceWidget />}
      {wVisible('commissions')   && <CommissionWidget />}

      {(wVisible('panel_unassigned') || wVisible('panel_overdue') || wVisible('panel_at_risk') || wVisible('panel_stale')) && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {wVisible('panel_unassigned') && <UnassignedLeadsPanel leads={data.unassignedLeads ?? []} />}
          {wVisible('panel_overdue')    && <OverduePanel leads={data.overdue} />}
          {wVisible('panel_at_risk')    && <AtRiskPanel leads={data.atRisk} />}
          {wVisible('panel_stale')      && <StalePanel leads={data.stale} />}
        </section>
      )}

      {(wVisible('revenue_chart') || wVisible('todays_orbit')) && (
        <section style={{ display: 'grid', gridTemplateColumns: wVisible('revenue_chart') && wVisible('todays_orbit') ? '1.6fr 1fr' : '1fr', gap: 16 }}>
          {wVisible('revenue_chart') && (revenue
            ? <ClosedRevenueChart months={revenue.months} total={revenue.total} trend={revenue.trend} />
            : <div className="skeleton fadaa-card" style={{ height: 320 }} />
          )}
          {wVisible('todays_orbit') && <TodaysOrbit meetings={data.todayMeetings} />}
        </section>
      )}

      {(wVisible('crew_leaderboard') || wVisible('signal_stream')) && (
        <section style={{ display: 'grid', gridTemplateColumns: wVisible('crew_leaderboard') && wVisible('signal_stream') ? '1.6fr 1fr' : '1fr', gap: 16 }}>
          {wVisible('crew_leaderboard') && <CrewLeaderboard data={data.performance} />}
          {wVisible('signal_stream')    && <SignalStream activities={data.activities} />}
        </section>
      )}

      {wVisible('auto_assign') && <section><AutoAssignCard /></section>}
    </div>
  )
}

function RepDash({ data, revenue, wVisible }: { data: DashData; revenue: RevenueData | null; wVisible: WVisibleFn }) {
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

      {wVisible('pipeline_constellation') && <PipelineConstellationWidget pipeline={data.pipeline} />}

      {wVisible('challenges')  && <ChallengeRaceWidget />}
      {wVisible('commissions') && <CommissionWidget />}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <TodayMeetingsPanel meetings={data.todayMeetings} />
        <OverduePanel leads={data.overdue} />
        <AtRiskPanel leads={data.atRisk} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {revenue ? (
          <ClosedRevenueChart months={revenue.months} total={revenue.total} trend={revenue.trend} />
        ) : (
          <div className="skeleton fadaa-card" style={{ height: 320 }} />
        )}
        <TodaysOrbit meetings={data.todayMeetings} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="fadaa-card">
          <div className="card-header">
            <h2 className="t-section-title">My Pipeline</h2>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <PipelineFunnelChart data={data.pipeline} />
          </div>
        </div>
        <SignalStream activities={data.activities} />
      </section>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data,          setData]          = useState<DashData | null>(null)
  const [revenue,       setRevenue]       = useState<RevenueData | null>(null)
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[] | null>(null)
  const [error,         setError]         = useState('')

  useEffect(() => {
    fetch('/api/sales/stats')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
    fetch('/api/sales/revenue')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setRevenue(d))
      .catch(() => {})
    fetch('/api/sales/dashboard-widgets')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setWidgetConfigs(d.widgets))
      .catch(() => {})
  }, [])

  // Helper: check visibility (defaults to true if config not loaded yet)
  const wVisible = (id: string) => {
    if (!widgetConfigs) return true
    const w = widgetConfigs.find(x => x.id === id)
    return w ? w.visible : true
  }

  // Ordered widget IDs for sections that can be reordered
  const wOrder = (ids: string[]) => {
    if (!widgetConfigs) return ids
    return [...ids].sort((a, b) => {
      const oa = widgetConfigs.find(x => x.id === a)?.order ?? 999
      const ob = widgetConfigs.find(x => x.id === b)?.order ?? 999
      return oa - ob
    })
  }

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

      {!data ? <DashboardSkeleton /> : role === 'manager' || role === 'admin' ? <ManagerDash data={data} revenue={revenue} wVisible={wVisible} /> : <RepDash data={data} revenue={revenue} wVisible={wVisible} />}
    </SalesShell>
  )
}
