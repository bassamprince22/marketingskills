'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

const SOURCE_LABELS: Record<string, string> = {
  meta: 'Meta', referral: 'Referral', website: 'Website', outbound: 'Outbound', other: 'Other',
}

interface KPI {
  source:  string
  spend:   number
  revenue: number
  roi:     number | null
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill ?? p.color }}>
          {p.name}: {typeof p.value === 'number' ? `$${p.value >= 1000 ? (p.value/1000).toFixed(1) + 'k' : p.value.toFixed(0)}` : p.value}
        </p>
      ))}
    </div>
  )
}

export function MarketingROIChart({ data }: { data: KPI[] }) {
  const chartData = data
    .filter(k => k.spend > 0 || k.revenue > 0)
    .map(k => ({ name: SOURCE_LABELS[k.source] ?? k.source, Spend: Math.round(k.spend), Revenue: Math.round(k.revenue), roi: k.roi }))

  if (chartData.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>▦</div>
        <p className="t-caption">No spend data yet — enter costs in the CPL tab</p>
      </div>
    )
  }

  const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 }

  // Summary row
  const totalSpend   = data.reduce((s, k) => s + k.spend,   0)
  const totalRevenue = data.reduce((s, k) => s + k.revenue, 0)
  const blendedROI   = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend * 100) : null

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p className="t-caption">Total Invested</p>
          <p className="t-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-red-text)' }}>
            ${totalSpend >= 1000 ? (totalSpend/1000).toFixed(1) + 'k' : totalSpend.toFixed(0)}
          </p>
        </div>
        <div>
          <p className="t-caption">Revenue Generated</p>
          <p className="t-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-green-text)' }}>
            ${totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(1) + 'k' : totalRevenue.toFixed(0)}
          </p>
        </div>
        <div>
          <p className="t-caption">Blended ROI</p>
          <p className="t-mono" style={{ fontSize: 20, fontWeight: 700, color: (blendedROI ?? 0) >= 0 ? 'var(--brand-green-text)' : 'var(--brand-red-text)' }}>
            {blendedROI !== null ? `${blendedROI.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="30%">
          <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
          <Bar dataKey="Spend"   fill="#EF4444" radius={[4,4,0,0]} opacity={0.85} />
          <Bar dataKey="Revenue" fill="#22C55E" radius={[4,4,0,0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
