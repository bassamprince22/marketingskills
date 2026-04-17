'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { SalesShell } from '@/components/sales/SalesShell'
import { FadaaStatCard } from '@/components/sales/FadaaStatCard'
import { DailyReportForm } from '@/components/sales/DailyReportForm'
import { DailyReportCalendar } from '@/components/sales/DailyReportCalendar'

/* Chart palette — maps to CSS token hues */
const CHART_COLORS = ['#4F8EF7','#7C3AED','#06B6D4','#F59E0B','#22C55E','#EF4444','#A78BFA','#34D399']

const SOURCE_LABELS: Record<string, string> = {
  meta: 'Meta Ads', referral: 'Referral', website: 'Website', outbound: 'Outbound', other: 'Other',
}
const SERVICE_LABELS: Record<string, string> = {
  marketing: 'Marketing', software: 'Software', both: 'Both',
}

/* ── Shared chart card ────────────────────────────────────────────────── */
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

/* ── Chart empty state ────────────────────────────────────────────────── */
function ChartEmpty({ label = 'No data yet' }: { label?: string }) {
  return (
    <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>▦</div>
      <p className="t-caption">{label}</p>
    </div>
  )
}

/* ── Recharts tooltip ─────────────────────────────────────────────────── */
function FadaaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(8,12,24,0.96)', border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(8px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {label && <p className="t-caption" style={{ marginBottom: 6 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill ?? p.color ?? 'var(--brand-primary)', fontSize: 13, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.value >= 1000
            ? `$${(p.value / 1000).toFixed(1)}k`
            : p.value}
        </p>
      ))}
    </div>
  )
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
function ReportsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="fadaa-card skeleton" style={{ height: 110 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="fadaa-card skeleton" style={{ height: 260 }} />)}
      </div>
    </div>
  )
}

const TODAY = new Date().toISOString().split('T')[0]

function DailyReportsTab({ role }: { role: string }) {
  const [selDate, setSelDate] = useState(TODAY)
  const isPrivileged = role === 'manager' || role === 'admin'

  if (!isPrivileged) {
    return (
      <div style={{ maxWidth: 700 }}>
        <DailyReportForm date={selDate} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <DailyReportCalendar onDaySelect={setSelDate} />
      {selDate && (
        <div>
          <p className="t-label" style={{ marginBottom: 12 }}>Reports for {selDate}</p>
          <ManagerDayDetail date={selDate} />
        </div>
      )}
    </div>
  )
}

function ManagerDayDetail({ date }: { date: string }) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sales/daily-reports?date=${date}`)
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [date])

  if (loading) return <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
  if (reports.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">📋</div>
      <p className="empty-state-title">No reports for this date</p>
      <p className="empty-state-sub">Reps haven't submitted reports for {date}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reports.map((r: any) => (
        <div key={r.id} className="fadaa-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 700,
              }}>
                {(r.sales_users?.name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="t-card-title">{r.sales_users?.name ?? 'Unknown'}</p>
                <p className="t-caption">{r.status === 'submitted' ? '✓ Submitted' : '◎ Draft'}</p>
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: r.status === 'submitted' ? 'var(--brand-green-dim)' : 'var(--brand-amber-dim)',
              color: r.status === 'submitted' ? 'var(--brand-green-text)' : 'var(--brand-amber-text)',
            }}>
              {r.status}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: 10 }}>
            {[
              { label: 'Leads', value: r.leads_total },
              { label: 'Qualified', value: r.leads_qualified },
              { label: 'Meetings', value: r.meetings_done },
              { label: 'Proposals', value: r.proposals_sent },
              { label: 'Won', value: r.won_today },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <p className="t-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
                <p className="t-caption" style={{ marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
          {r.highlights && <p className="t-caption" style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(79,142,247,0.05)', borderRadius: 6, borderLeft: '2px solid var(--brand-primary)' }}>{r.highlights}</p>}
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const isPrivileged = role === 'manager' || role === 'admin'

  const [tab,     setTab]     = useState<'analytics' | 'daily'>('analytics')
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')

  // Reps default to daily reports tab
  useEffect(() => { if (!isPrivileged) setTab('daily') }, [isPrivileged])

  function load() {
    setLoading(true)
    const sp = new URLSearchParams()
    if (from) sp.set('from', from)
    if (to)   sp.set('to',   to)
    fetch(`/api/sales/reports?${sp}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }

  useEffect(() => { if (tab === 'analytics') load() }, [tab]) // eslint-disable-line

  const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 } as const
  const axisSecondary = { fill: 'var(--text-secondary)', fontSize: 11 } as const

  return (
    <SalesShell>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Reports</h1>
          <p className="t-caption">
            {tab === 'analytics' ? 'Sales performance analytics' : 'Daily end-of-day reports'}
          </p>
        </div>
        {tab === 'analytics' && isPrivileged && (
        <div className="filter-bar">
          <input className="fadaa-input filter-select" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 160 }} aria-label="From date" />
          <span className="t-caption">to</span>
          <input className="fadaa-input filter-select" type="date" value={to}   onChange={e => setTo(e.target.value)}   style={{ maxWidth: 160 }} aria-label="To date" />
          <button className="fadaa-btn fadaa-btn-sm" onClick={load}>Apply</button>
          {(from || to) && (
            <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => { setFrom(''); setTo(''); setTimeout(load, 0) }}>Clear</button>
          )}
        </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="tab-underline-bar" style={{ marginBottom: 24 }}>
        {isPrivileged && (
          <button className={`tab-underline${tab === 'analytics' ? ' active' : ''}`} onClick={() => setTab('analytics')}>
            Analytics
          </button>
        )}
        <button className={`tab-underline${tab === 'daily' ? ' active' : ''}`} onClick={() => setTab('daily')}>
          Daily Reports
        </button>
      </div>

      {tab === 'daily' && <DailyReportsTab role={role} />}

      {tab === 'analytics' && (loading || !data ? <ReportsSkeleton /> : (() => {
        const { summary, bySource, byService, qualByRep, meetingsByRep, monthly, pipelineValue } = data
        const sourceData   = Object.entries(bySource   as Record<string, number>).map(([k, v]) => ({ name: SOURCE_LABELS[k]  ?? k, value: v }))
        const serviceData  = Object.entries(byService  as Record<string, number>).map(([k, v]) => ({ name: SERVICE_LABELS[k] ?? k, value: v }))
        const pipelineData = Object.entries(pipelineValue as Record<string, number>)
          .map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: Math.round(v) }))
          .sort((a, b) => b.value - a.value).slice(0, 8)

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Summary stats */}
            <section>
              <p className="t-label" style={{ marginBottom: 12 }}>Summary</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 12 }}>
                <FadaaStatCard label="Total Leads"      value={summary.total_leads}     icon="◎" color="blue"   delay={0}   />
                <FadaaStatCard label="Won Deals"        value={summary.won}              icon="★" color="green"  delay={80}  />
                <FadaaStatCard label="Lost Deals"       value={summary.lost}             icon="✗" color="red"    delay={160} />
                <FadaaStatCard label="Win Rate"         value={summary.winRate}          icon="⬡" color="cyan"   delay={240} suffix="%" />
                <FadaaStatCard label="Total Meetings"   value={summary.total_meetings}   icon="◷" color="purple" delay={320} />
                <FadaaStatCard label="Quotations Sent"  value={summary.quotations_sent}  icon="⎗" color="amber"  delay={400} />
                <FadaaStatCard label="Contracts Signed" value={summary.contracts_signed} icon="✓" color="green"  delay={480} />
                <FadaaStatCard label="Pipeline Value"   value={Math.round(summary.total_pipeline_value / 1000)} icon="$" color="blue" delay={560} suffix="k" prefix="$" />
              </div>
            </section>

            {/* Charts row 1 */}
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ChartCard title="Leads by Source" subtitle="Breakdown of lead origins">
                {sourceData.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} labelLine={false}>
                        {sourceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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
                        {serviceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<FadaaTooltip />} />
                      <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </section>

            {/* Charts row 2 */}
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
                      <Bar dataKey="total"     name="Total"     fill="#4F8EF7" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#34D399" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </section>

            {/* Charts row 3 */}
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ChartCard title="Monthly Performance" subtitle="Leads created and deals won per month">
                {(monthly as any[]).length === 0 ? <ChartEmpty label="No monthly data yet" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={axisStyle} axisLine={{ stroke: 'var(--border-subtle)' }} tickLine={false} />
                      <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                      <Bar dataKey="leads" name="Leads" fill="#4F8EF7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="won"   name="Won"   fill="#4ADE80" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Pipeline Value by Stage" subtitle="Estimated deal value at each stage">
                {pipelineData.length === 0 ? <ChartEmpty label="No pipeline data yet" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pipelineData} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false}
                        tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                      <YAxis type="category" dataKey="name" tick={axisSecondary} axisLine={false} tickLine={false} width={110} />
                      <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                      <Bar dataKey="value" name="Value ($)" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </section>

            {/* Win/Loss summary */}
            <section>
              <div className="fadaa-card">
                <div className="card-header">
                  <h3 className="t-section-title">Win / Loss Summary</h3>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', marginBottom: 20 }}>
                    {[
                      { label: 'Won',          value: summary.won,                   color: '#4ADE80' },
                      { label: 'Lost',         value: summary.lost,                  color: '#F87171' },
                      { label: 'Win Rate',     value: `${summary.winRate}%`,         color: '#7CB9FC' },
                      { label: 'Total Closed', value: summary.won + summary.lost,    color: 'var(--text-primary)' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="t-caption" style={{ marginBottom: 4 }}>{label}</p>
                        <p className="t-mono" style={{ color, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {(summary.won + summary.lost) > 0 && (
                    <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${summary.winRate}%`,
                        background: 'linear-gradient(90deg, #4ADE80, #22C55E)',
                        borderRadius: 999,
                        transition: 'width 1s ease-out',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )
      })())}
    </SalesShell>
  )
}
