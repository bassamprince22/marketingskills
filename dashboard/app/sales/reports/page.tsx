'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { SalesShell } from '@/components/sales/SalesShell'
import { FadaaStatCard } from '@/components/sales/FadaaStatCard'
import { DailyReportForm } from '@/components/sales/DailyReportForm'
import { DailyReportCalendar } from '@/components/sales/DailyReportCalendar'

const CHART_COLORS = ['#4F8EF7', '#7C3AED', '#06B6D4', '#F59E0B', '#22C55E', '#EF4444', '#A78BFA', '#34D399']
const TODAY = new Date().toISOString().split('T')[0]
const CURRENT_MONTH = TODAY.slice(0, 7)

const SOURCE_LABELS: Record<string, string> = {
  meta: 'Meta Ads',
  referral: 'Referral',
  website: 'Website',
  outbound: 'Outbound',
  other: 'Other',
}

const SERVICE_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  software: 'Software',
  both: 'Both',
}

interface ReportsPermission {
  module: 'reports'
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_manage: boolean
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="fadaa-card">
      <div className="card-header">
        <div>
          <h3 className="t-section-title">{title}</h3>
          {subtitle && <p className="t-caption" style={{ marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function ChartEmpty({ label = 'No data yet' }: { label?: string }) {
  return (
    <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>◦</div>
      <p className="t-caption">{label}</p>
    </div>
  )
}

function FadaaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(8,12,24,0.96)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '10px 14px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {label && <p className="t-caption" style={{ marginBottom: 6 }}>{label}</p>}
      {payload.map((point: any, index: number) => (
        <p key={index} style={{ color: point.fill ?? point.color ?? 'var(--brand-primary)', fontSize: 13, fontWeight: 600 }}>
          {point.name}: {typeof point.value === 'number' && point.value >= 1000 ? `$${(point.value / 1000).toFixed(1)}k` : point.value}
        </p>
      ))}
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="fadaa-card skeleton" style={{ height: 110 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="fadaa-card skeleton" style={{ height: 260 }} />
        ))}
      </div>
    </div>
  )
}

function EmptyReportsState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📋</div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-sub">{subtitle}</p>
    </div>
  )
}

function TeamDayDetail({
  date,
  adminMode,
}: {
  date: string
  adminMode: boolean
}) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/sales/daily-reports?date=${date}`)
      .then((response) => response.json())
      .then((payload) => {
        setReports(payload.reports ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    setEditingReportId(null)
    load()
  }, [date])

  if (editingReportId) {
    return (
      <DailyReportForm
        reportId={editingReportId}
        adminMode
        onSubmitted={() => {
          setEditingReportId(null)
          load()
        }}
      />
    )
  }

  if (loading) return <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
  if (reports.length === 0) {
    return (
      <EmptyReportsState
        title="No reports for this date"
        subtitle={`No one has submitted a daily report for ${date} yet.`}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reports.map((report: any) => (
        <div key={report.id} className="fadaa-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {(report.sales_users?.name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="t-card-title">{report.sales_users?.name ?? 'Unknown'}</p>
                <p className="t-caption">{report.status === 'submitted' ? '✓ Submitted' : '◌ Draft'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: report.status === 'submitted' ? 'var(--brand-green-dim)' : 'var(--brand-amber-dim)',
                  color: report.status === 'submitted' ? 'var(--brand-green-text)' : 'var(--brand-amber-text)',
                }}
              >
                {report.status}
              </span>
              {adminMode && (
                <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => setEditingReportId(report.id)}>
                  Edit
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: 10 }}>
            {[
              { label: 'Leads', value: report.leads_total },
              { label: 'Qualified', value: report.leads_qualified },
              { label: 'Meetings', value: report.meetings_done },
              { label: 'Proposals', value: report.proposals_sent },
              { label: 'Won', value: report.won_today },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <p className="t-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
                <p className="t-caption" style={{ marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
          {report.highlights && (
            <p
              className="t-caption"
              style={{
                marginTop: 10,
                padding: '8px 12px',
                background: 'rgba(79,142,247,0.05)',
                borderRadius: 6,
                borderLeft: '2px solid var(--brand-primary)',
              }}
            >
              {report.highlights}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function DailyReportsTab({
  role,
  permission,
}: {
  role: string
  permission: ReportsPermission
}) {
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const canManageTeam = permission.can_manage
  const adminMode = role === 'admin'

  if (!canManageTeam) {
    return (
      <div style={{ maxWidth: 700 }}>
        <DailyReportForm date={TODAY} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <DailyReportCalendar onDaySelect={setSelectedDate} />
      <div>
        <p className="t-label" style={{ marginBottom: 12 }}>Reports for {selectedDate}</p>
        <TeamDayDetail date={selectedDate} adminMode={adminMode} />
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const [permission, setPermission] = useState<ReportsPermission | null>(null)
  const [permissionLoading, setPermissionLoading] = useState(true)
  const [tab, setTab] = useState<'analytics' | 'daily'>('daily')
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [period, setPeriod] = useState<'month' | 'quarter'>('month')
  const [anchorMonth, setAnchorMonth] = useState(CURRENT_MONTH)

  useEffect(() => {
    setPermissionLoading(true)
    fetch('/api/sales/permissions?effective=1&module=reports')
      .then((response) => response.json())
      .then((payload) => {
        setPermission(payload.permissions?.[0] ?? null)
        setPermissionLoading(false)
      })
      .catch(() => setPermissionLoading(false))
  }, [])

  const canView = Boolean(permission?.can_view)
  const canSeeAnalytics = role === 'admin' && Boolean(permission?.can_manage)

  useEffect(() => {
    if (canSeeAnalytics) {
      setTab('analytics')
    } else {
      setTab('daily')
    }
  }, [canSeeAnalytics])

  function loadAnalytics() {
    if (!canSeeAnalytics) return
    setAnalyticsLoading(true)
    const params = new URLSearchParams({
      period,
      anchor: `${anchorMonth}-01`,
    })
    fetch(`/api/sales/reports?${params.toString()}`)
      .then((response) => response.json())
      .then((payload) => {
        setAnalytics(payload)
        setAnalyticsLoading(false)
      })
      .catch(() => setAnalyticsLoading(false))
  }

  useEffect(() => {
    if (tab === 'analytics' && canSeeAnalytics) loadAnalytics()
  }, [tab, period, anchorMonth, canSeeAnalytics])

  const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 } as const
  const axisSecondary = { fill: 'var(--text-secondary)', fontSize: 11 } as const

  return (
    <SalesShell>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Reports</h1>
          <p className="t-caption">
            {tab === 'analytics' ? 'Admin summary generation by month or quarter' : 'Daily end-of-day reports'}
          </p>
        </div>
        {tab === 'analytics' && canSeeAnalytics && (
          <div className="filter-bar">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['month', 'quarter'] as const).map((entry) => (
                <button
                  key={entry}
                  className={`tab-underline${period === entry ? ' active' : ''}`}
                  onClick={() => setPeriod(entry)}
                >
                  {entry === 'month' ? 'Month' : 'Quarter'}
                </button>
              ))}
            </div>
            <input
              className="fadaa-input filter-select"
              type="month"
              value={anchorMonth}
              onChange={(event) => setAnchorMonth(event.target.value)}
              style={{ maxWidth: 170 }}
              aria-label="Anchor month"
            />
            <button className="fadaa-btn fadaa-btn-sm" onClick={loadAnalytics}>Generate</button>
          </div>
        )}
      </div>

      {permissionLoading ? (
        <ReportsSkeleton />
      ) : !canView ? (
        <EmptyReportsState title="Reports are disabled for this role" subtitle="Enable Reports view permission from the role-permissions screen to access this section." />
      ) : (
        <>
          <div className="tab-underline-bar" style={{ marginBottom: 24 }}>
            {canSeeAnalytics && (
              <button className={`tab-underline${tab === 'analytics' ? ' active' : ''}`} onClick={() => setTab('analytics')}>
                Analytics
              </button>
            )}
            <button className={`tab-underline${tab === 'daily' ? ' active' : ''}`} onClick={() => setTab('daily')}>
              Daily Reports
            </button>
          </div>

          {tab === 'daily' && permission && <DailyReportsTab role={role} permission={permission} />}

          {tab === 'analytics' && canSeeAnalytics && (
            analyticsLoading || !analytics ? (
              <ReportsSkeleton />
            ) : (() => {
              const { summary, bySource, byService, qualByRep, meetingsByRep, monthly, pipelineValue } = analytics
              const sourceData = Object.entries(bySource as Record<string, number>).map(([key, value]) => ({ name: SOURCE_LABELS[key] ?? key, value }))
              const serviceData = Object.entries(byService as Record<string, number>).map(([key, value]) => ({ name: SERVICE_LABELS[key] ?? key, value }))
              const pipelineData = Object.entries(pipelineValue as Record<string, number>)
                .map(([key, value]) => ({ name: key.replace(/_/g, ' '), value: Math.round(value) }))
                .sort((left, right) => right.value - left.value)
                .slice(0, 8)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <section>
                    <p className="t-label" style={{ marginBottom: 12 }}>Summary</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 12 }}>
                      <FadaaStatCard label="Total Leads" value={summary.total_leads} icon="◉" color="blue" delay={0} />
                      <FadaaStatCard label="Won Deals" value={summary.won} icon="★" color="green" delay={80} />
                      <FadaaStatCard label="Lost Deals" value={summary.lost} icon="✕" color="red" delay={160} />
                      <FadaaStatCard label="Win Rate" value={summary.winRate} icon="⬒" color="cyan" delay={240} suffix="%" />
                      <FadaaStatCard label="Total Meetings" value={summary.total_meetings} icon="◷" color="purple" delay={320} />
                      <FadaaStatCard label="Quotations Sent" value={summary.quotations_sent} icon="⎗" color="amber" delay={400} />
                      <FadaaStatCard label="Contracts Signed" value={summary.contracts_signed} icon="✓" color="green" delay={480} />
                      <FadaaStatCard label="Pipeline Value" value={Math.round(summary.total_pipeline_value / 1000)} icon="$" color="blue" delay={560} suffix="k" prefix="$" />
                    </div>
                  </section>

                  <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <ChartCard title="Leads by Source" subtitle="Breakdown of lead origins">
                      {sourceData.length === 0 ? <ChartEmpty /> : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} labelLine={false}>
                              {sourceData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<FadaaTooltip />} />
                            <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>

                    <ChartCard title="Leads by Service Type" subtitle="Marketing vs Software vs Both">
                      {serviceData.length === 0 ? <ChartEmpty /> : (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} labelLine={false}>
                              {serviceData.map((_, index) => <Cell key={index} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<FadaaTooltip />} />
                            <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>
                  </section>

                  <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <ChartCard title="Qualified Leads by Rep" subtitle="BANT-qualified deals per rep">
                      {(qualByRep as any[]).length === 0 ? <ChartEmpty label="No rep data yet" /> : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={qualByRep} layout="vertical" margin={{ left: 0, right: 8 }}>
                            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="rep_name" tick={axisSecondary} axisLine={false} tickLine={false} width={90} />
                            <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                            <Bar dataKey="count" name="Qualified" fill="#34D399" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>

                    <ChartCard title="Meetings by Rep" subtitle="Total and completed meetings">
                      {(meetingsByRep as any[]).length === 0 ? <ChartEmpty label="No rep data yet" /> : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={meetingsByRep} layout="vertical" margin={{ left: 0, right: 8 }}>
                            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="rep_name" tick={axisSecondary} axisLine={false} tickLine={false} width={90} />
                            <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                            <Bar dataKey="total" name="Total" fill="#4F8EF7" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="completed" name="Completed" fill="#34D399" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>
                  </section>

                  <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <ChartCard title="Monthly Performance" subtitle="Leads created and deals won per month">
                      {(monthly as any[]).length === 0 ? <ChartEmpty label="No monthly data yet" /> : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <XAxis dataKey="month" tick={axisStyle} axisLine={{ stroke: 'var(--border-subtle)' }} tickLine={false} />
                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                            <Bar dataKey="leads" name="Leads" fill="#4F8EF7" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="won" name="Won" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>

                    <ChartCard title="Pipeline Value by Stage" subtitle="Estimated deal value at each stage">
                      {pipelineData.length === 0 ? <ChartEmpty label="No pipeline data yet" /> : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={pipelineData} layout="vertical" margin={{ left: 0, right: 8 }}>
                            <XAxis
                              type="number"
                              tick={axisStyle}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                            />
                            <YAxis type="category" dataKey="name" tick={axisSecondary} axisLine={false} tickLine={false} width={110} />
                            <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                            <Bar dataKey="value" name="Value ($)" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>
                  </section>
                </div>
              )
            })()
          )}
        </>
      )}
    </SalesShell>
  )
}
