'use client'

import type { RepPerformance } from '@/lib/sales/types'

interface Props { data: RepPerformance[] }

export function RepPerformanceTable({ data }: Props) {
  if (!data.length) {
    return <p style={{ color: '#64748B', fontSize: 13 }}>No rep data yet</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1E2D4A' }}>
            {['Rep', 'Leads', 'Meetings', 'Won', 'Lost', 'Pipeline'].map(h => (
              <th
                key={h}
                style={{
                  padding: '8px 12px',
                  textAlign: h === 'Rep' ? 'left' : 'center',
                  color: '#64748B',
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr
              key={r.rep_id}
              style={{
                borderBottom: '1px solid #1E2D4A20',
                background: i % 2 === 0 ? 'transparent' : 'rgba(30,45,74,0.2)',
              }}
            >
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {r.rep_name.charAt(0)}
                  </div>
                  <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{r.rep_name}</span>
                </div>
              </td>
              <td style={{ textAlign: 'center', color: '#94A3B8', padding: '10px 12px' }}>{r.leads}</td>
              <td style={{ textAlign: 'center', color: '#94A3B8', padding: '10px 12px' }}>{r.meetings}</td>
              <td style={{ textAlign: 'center', color: '#4ADE80', fontWeight: 600, padding: '10px 12px' }}>{r.won}</td>
              <td style={{ textAlign: 'center', color: '#F87171', padding: '10px 12px' }}>{r.lost}</td>
              <td style={{ textAlign: 'center', color: '#38BDF8', padding: '10px 12px' }}>
                {r.pipeline >= 1000
                  ? `$${(r.pipeline / 1000).toFixed(1)}k`
                  : `$${r.pipeline}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
