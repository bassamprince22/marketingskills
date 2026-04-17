'use client'

import { useEffect, useState } from 'react'

const SOURCES = ['meta', 'referral', 'website', 'outbound', 'other']
const SOURCE_LABELS: Record<string, string> = {
  meta: 'Meta Ads', referral: 'Referral', website: 'Website', outbound: 'Outbound', other: 'Other',
}

function fmtCurrency(v: number | null) {
  if (v === null) return '—'
  if (v >= 1000) return `$${(v/1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function fmtPct(v: number | null) {
  if (v === null) return '—'
  return `${v.toFixed(1)}%`
}

interface KPI {
  source:             string
  spend:              number
  leads:              number
  qualified:          number
  meetings:           number
  won:                number
  revenue:            number
  cpl:                number | null
  cost_per_qualified: number | null
  cost_per_meeting:   number | null
  cost_per_won:       number | null
  roi:                number | null
}

interface CostEntry {
  source: string
  month:  string
  spend:  number
  notes?: string | null
}

function getLastMonths(n: number): string[] {
  const months: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < n; i++) {
    months.unshift(d.toISOString().slice(0, 7))
    d.setMonth(d.getMonth() - 1)
  }
  return months
}

export function MarketingCPLTable({ from, to }: { from?: string; to?: string }) {
  const [kpis,    setKpis]    = useState<KPI[]>([])
  const [costs,   setCosts]   = useState<CostEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const months = getLastMonths(3)

  function load() {
    setLoading(true)
    const sp = new URLSearchParams()
    if (from) sp.set('from', from)
    if (to)   sp.set('to', to)
    fetch(`/api/sales/marketing?${sp}`)
      .then(r => r.json())
      .then(d => { setKpis(d.kpis ?? []); setCosts(d.costs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [from, to]) // eslint-disable-line

  function getSpend(source: string, month: string): number {
    return costs.find(c => c.source === source && c.month.startsWith(month))?.spend ?? 0
  }

  async function updateSpend(source: string, month: string, spend: number) {
    const key = `${source}-${month}`
    setSaving(key)
    await fetch('/api/sales/marketing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, month: month + '-01', spend }),
    })
    setSaving(null)
    load()
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
    </div>
  )

  return (
    <div>
      {/* Spend table */}
      <div style={{ marginBottom: 24 }}>
        <p className="t-label" style={{ marginBottom: 10 }}>Campaign Spend by Source (last 3 months)</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th className="t-label" style={{ textAlign: 'left', padding: '8px 12px' }}>Source</th>
                {months.map(m => <th key={m} className="t-label" style={{ textAlign: 'center', padding: '8px 12px' }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {SOURCES.map(src => (
                <tr key={src} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{SOURCE_LABELS[src]}</td>
                  {months.map(m => {
                    const key = `${src}-${m}`
                    return (
                      <td key={m} style={{ padding: '6px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>$</span>
                          <input
                            className="fadaa-input"
                            type="number"
                            min={0}
                            style={{ width: 80, textAlign: 'center', fontSize: 12 }}
                            defaultValue={getSpend(src, m)}
                            onBlur={e => {
                              const v = parseFloat(e.target.value) || 0
                              if (v !== getSpend(src, m)) updateSpend(src, m, v)
                            }}
                          />
                          {saving === key && <span className="spinner spinner-sm" />}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI cards */}
      <p className="t-label" style={{ marginBottom: 10 }}>Performance KPIs by Source</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {['Source', 'Spend', 'Leads', 'Qualified', 'Meetings', 'Won', 'Revenue', 'CPL', 'Cost/Qual', 'Cost/Won', 'ROI'].map(h => (
                <th key={h} className="t-label" style={{ textAlign: h === 'Source' ? 'left' : 'center', padding: '8px 10px', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kpis.filter(k => k.leads > 0 || k.spend > 0).map(k => (
              <tr key={k.source} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '9px 10px', fontWeight: 500, color: 'var(--text-secondary)' }}>{SOURCE_LABELS[k.source]}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--brand-red-text)' }}>{fmtCurrency(k.spend)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>{k.leads}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>{k.qualified}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>{k.meetings}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--brand-green-text)', fontWeight: 600 }}>{k.won}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--brand-green-text)' }}>{fmtCurrency(k.revenue)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--brand-amber-text)' }}>{fmtCurrency(k.cpl)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>{fmtCurrency(k.cost_per_qualified)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>{fmtCurrency(k.cost_per_won)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'center', color: (k.roi ?? 0) >= 0 ? 'var(--brand-green-text)' : 'var(--brand-red-text)', fontWeight: 700 }}>
                  {fmtPct(k.roi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
