'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PipelineCount } from '@/lib/sales/types'
import { STAGE_LABELS } from '@/lib/sales/types'

const STAGE_COLORS = [
  '#4F8EF7', '#818CF8', '#A78BFA', '#7C3AED',
  '#22D3EE', '#34D399', '#38BDF8', '#FCD34D',
  '#FDBA74', '#4ADE80', '#F87171',
]

interface Props { data: PipelineCount[] }

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: PipelineCount }[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(8,12,24,0.96)', border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '10px 14px',
      backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{STAGE_LABELS[d.stage]}</p>
      <p style={{ color: 'var(--brand-primary)', fontSize: 12 }}>{d.count} leads</p>
      {d.value > 0 && (
        <p style={{ color: '#4ADE80', fontSize: 12, marginTop: 2 }}>${(d.value / 1000).toFixed(1)}k value</p>
      )}
    </div>
  )
}

export function PipelineFunnelChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => {
    const ORDER = [
      'new_lead','contacted','discovery','meeting_scheduled','meeting_completed',
      'qualified','proposal_sent','negotiation','contract_sent','won','lost',
    ]
    return ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage)
  })

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="stage"
          tick={false}
          axisLine={{ stroke: 'var(--border-subtle)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,142,247,0.06)' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
