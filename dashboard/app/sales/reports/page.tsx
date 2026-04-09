'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { SalesShell } from '@/components/sales/SalesShell'
import { FadaaStatCard } from '@/components/sales/FadaaStatCard'

const COLORS = ['#4F8EF7','#7C3AED','#06B6D4','#F59E0B','#22C55E','#EF4444','#A78BFA','#34D399']

const SOURCE_LABELS: Record<string, string> = {
  meta: 'Meta Ads', referral: 'Referral', website: 'Website', outbound: 'Outbound', other: 'Other',
}
const SERVICE_LABELS: Record<string, string> = {
  marketing: 'Marketing', software: 'Software', both: 'Both',
}

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="fadaa-card" style={{ padding: 24 }}>
    <h3 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {title}
    </h3>
    {children}
  </div>
)

const FadaaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#131B2E', border: '1px solid #1E2D4A', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill ?? p.color ?? '#4F8EF7', fontSize: 13, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')

  function load() {
    setLoading(true)
    const sp = new URLSearchParams()
    if (from) sp.set('from', from)
    if (to)   sp.set('to', to)
    fetch(`/api/sales/reports?${sp}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  if (loading || !data) {
    return (
      <SalesShell>
        <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>▦ Reports</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fadaa-card" style={{ height: 110 }} />
          ))}
        </div>
      </SalesShell>
    )
  }

  const { summary, bySource, byService, qualByRep, meetingsByRep, monthly, pipelineValue } = data

  // Transform objects → chart arrays
  const sourceData    = Object.entries(bySource as Record<string, number>).map(([k, v]) => ({ name: SOURCE_LABELS[k] ?? k, value: v }))
  const serviceData   = Object.entries(byService as Record<string, number>).map(([k, v]) => ({ name: SERVICE_LABELS[k] ?? k, value: v }))
  const pipelineData  = Object.entries(pipelineValue as Record<string, number>)
    .map(([k, v]) => ({ name: k.replace('_', ' '), value: Math.round(v) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return (
    <SalesShell>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>▦ Reports</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Sales performance analytics</p>
        </div>
        {/* Date filter */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="fadaa-input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
          <span style={{ color: '#64748B', fontSize: 13 }}>to</span>
          <input className="fadaa-input" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ maxWidth: 160 }} />
          <button className="fadaa-btn" onClick={load}>Apply</button>
          {(from || to) && (
            <button className="fadaa-btn-ghost" onClick={() => { setFrom(''); setTo(''); setTimeout(load, 0) }}>Clear</button>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 14 }}>
          <FadaaStatCard label="Total Leads"       value={summary.total_leads}          icon="◎" color="blue"   delay={0}   />
          <FadaaStatCard label="Won Deals"         value={summary.won}                  icon="★" color="green"  delay={80}  />
          <FadaaStatCard label="Lost Deals"        value={summary.lost}                 icon="✗" color="red"    delay={160} />
          <FadaaStatCard label="Win Rate %"        value={summary.winRate}              icon="⬡" color="cyan"   delay={240} suffix="%" />
          <FadaaStatCard label="Total Meetings"    value={summary.total_meetings}       icon="◷" color="purple" delay={320} />
          <FadaaStatCard label="Quotations Sent"   value={summary.quotations_sent}      icon="⎗" color="amber"  delay={400} />
          <FadaaStatCard label="Contracts Signed"  value={summary.contracts_signed}     icon="✓" color="green"  delay={480} />
          <FadaaStatCard label="Pipeline Value"    value={Math.round(summary.total_pipeline_value / 1000)} icon="$" color="blue" delay={560} suffix="k" prefix="$" />
        </div>
      </section>

      {/* Row 1: Leads by Source + Leads by Service */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ChartCard title="Leads by Source">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<FadaaTooltip />} />
              <Legend wrapperStyle={{ color: '#64748B', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leads by Service Type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {serviceData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<FadaaTooltip />} />
              <Legend wrapperStyle={{ color: '#64748B', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Row 2: Qualified by rep + Meetings by rep */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ChartCard title="Qualified Leads by Rep">
          {(qualByRep as any[]).length === 0 ? (
            <p style={{ color: '#64748B', fontSize: 13 }}>No rep data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={qualByRep} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="rep_name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.06)' }} />
                <Bar dataKey="count" name="Qualified" fill="#34D399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Meetings by Rep">
          {(meetingsByRep as any[]).length === 0 ? (
            <p style={{ color: '#64748B', fontSize: 13 }}>No rep data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={meetingsByRep} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="rep_name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.06)' }} />
                <Bar dataKey="total"     name="Total"     fill="#4F8EF7" radius={[0, 0, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#34D399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Row 3: Monthly performance + Pipeline value by stage */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ChartCard title="Monthly Performance">
          {(monthly as any[]).length === 0 ? (
            <p style={{ color: '#64748B', fontSize: 13 }}>No monthly data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={{ stroke: '#1E2D4A' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.06)' }} />
                <Bar dataKey="leads" name="Leads" fill="#4F8EF7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="won"   name="Won"   fill="#4ADE80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Pipeline Value by Stage ($)">
          {pipelineData.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: 13 }}>No pipeline data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<FadaaTooltip />} cursor={{ fill: 'rgba(79,142,247,0.06)' }} />
                <Bar dataKey="value" name="Value ($)" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Win / Loss summary */}
      <section>
        <div className="fadaa-card" style={{ padding: 24 }}>
          <h3 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Win / Loss Summary
          </h3>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#64748B', fontSize: 12 }}>Won</p>
              <p style={{ color: '#4ADE80', fontSize: 28, fontWeight: 700 }}>{summary.won}</p>
            </div>
            <div>
              <p style={{ color: '#64748B', fontSize: 12 }}>Lost</p>
              <p style={{ color: '#F87171', fontSize: 28, fontWeight: 700 }}>{summary.lost}</p>
            </div>
            <div>
              <p style={{ color: '#64748B', fontSize: 12 }}>Win Rate</p>
              <p style={{ color: '#4F8EF7', fontSize: 28, fontWeight: 700 }}>{summary.winRate}%</p>
            </div>
            <div>
              <p style={{ color: '#64748B', fontSize: 12 }}>Total Deals Closed</p>
              <p style={{ color: '#E2E8F0', fontSize: 28, fontWeight: 700 }}>{summary.won + summary.lost}</p>
            </div>
          </div>
          {/* Win/loss bar */}
          {(summary.won + summary.lost) > 0 && (
            <div style={{ marginTop: 16, height: 10, borderRadius: 999, background: '#0F1629', overflow: 'hidden' }}>
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
      </section>
    </SalesShell>
  )
}
