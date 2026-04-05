'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

interface ContentTypeChartProps {
  data: Array<{ type: string; count: number }>
}

const COLORS: Record<string, string> = {
  video: '#6366f1',
  carousel: '#8b5cf6',
  linkedin_article: '#a78bfa',
  linkedin_post: '#c4b5fd',
  twitter_thread: '#7c3aed',
}

export function ContentTypeChart({ data }: ContentTypeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={COLORS[entry.type] ?? '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
