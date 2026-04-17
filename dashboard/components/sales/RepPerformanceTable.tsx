'use client'

import type { RepPerformance } from '@/lib/sales/types'

interface Props { data: RepPerformance[] }

export function RepPerformanceTable({ data }: Props) {
  if (!data.length) {
    return <p className="t-caption">No rep data yet</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="fadaa-table">
        <thead>
          <tr>
            {['Rep', 'Leads', 'Meetings', 'Won', 'Lost', 'Pipeline'].map(h => (
              <th key={h} style={{ textAlign: h === 'Rep' ? 'left' : 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.rep_id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar avatar-sm">{r.rep_name.charAt(0)}</div>
                  <span className="t-body" style={{ fontWeight: 500 }}>{r.rep_name}</span>
                </div>
              </td>
              <td style={{ textAlign: 'center' }} className="t-caption">{r.leads}</td>
              <td style={{ textAlign: 'center' }} className="t-caption">{r.meetings}</td>
              <td style={{ textAlign: 'center', color: '#4ADE80', fontWeight: 600 }}>{r.won}</td>
              <td style={{ textAlign: 'center', color: '#F87171' }}>{r.lost}</td>
              <td className="t-mono" style={{ textAlign: 'center', color: '#38BDF8', fontSize: 12 }}>
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
