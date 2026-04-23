'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface MonthPoint { month: string; value: number }

interface Props {
  months: MonthPoint[]
  total:  number
  trend:  number
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div style={{
      background: 'rgba(8,12,28,0.95)', border: '1px solid rgba(129,140,248,0.3)',
      borderRadius: 8, padding: '8px 12px',
    }}>
      <p style={{ color: '#94A3B8', fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#A78BFA', fontSize: 14, fontWeight: 700 }}>
        {val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${val}`}
      </p>
    </div>
  )
}

export function ClosedRevenueChart({ months, total, trend }: Props) {
  const [range, setRange] = useState<3 | 6 | 12>(12)

  const displayData = months.slice(-range)
  const totalFmt    = total >= 1000000 ? `$${(total / 1000000).toFixed(1)}M` : total >= 1000 ? `$${Math.round(total / 1000)}k` : `$${total}`
  const trendAbs    = Math.abs(trend).toFixed(1)
  const trendPos    = trend >= 0

  return (
    <div
      className="fadaa-card"
      style={{
        background: 'linear-gradient(160deg, rgba(10,12,30,0.98) 0%, rgba(18,14,40,0.98) 100%)',
        border: '1px solid rgba(129,140,248,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 6 }}>
            Closed Revenue
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-0.02em' }}>
              {totalFmt}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
              background: trendPos ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              color: trendPos ? '#4ADE80' : '#F87171',
              border: `1px solid ${trendPos ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            }}>
              {trendPos ? '+' : '-'}{trendAbs}%
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>Last {range} months · YTD</p>
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
          {([12, 6, 3] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: range === r ? 'rgba(139,92,246,0.25)' : 'transparent',
                border: range === r ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                color: range === r ? '#A78BFA' : 'var(--text-faint)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 220, marginTop: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#818CF8" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
              <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#818CF8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748B', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(139,92,246,0.3)', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#revLineGrad)"
              strokeWidth={2.5}
              fill="url(#revAreaGrad)"
              dot={{ fill: '#818CF8', stroke: '#818CF8', r: 3, strokeWidth: 0 }}
              activeDot={{ fill: '#A78BFA', stroke: 'rgba(167,139,250,0.4)', r: 5, strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
