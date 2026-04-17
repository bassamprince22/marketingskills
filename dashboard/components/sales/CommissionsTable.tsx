'use client'

import { useEffect, useState } from 'react'

interface Commission {
  id: string
  deal_value: number
  commission_pct: number
  commission_amount: number
  status: 'pending' | 'approved' | 'paid'
  created_at: string
  sales_leads?: { id: string; company_name: string; contact_person: string }
  sales_users?: { id: string; name: string }
  sales_services?: { id: string; name: string; commission_pct: number }
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:  { bg: 'var(--brand-amber-dim)',  text: 'var(--brand-amber-text)' },
  approved: { bg: 'rgba(79,142,247,0.12)',   text: 'var(--brand-blue-text)' },
  paid:     { bg: 'var(--brand-green-dim)',  text: 'var(--brand-green-text)' },
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

export function CommissionsTable({ role }: { role: string }) {
  const isPrivileged = role === 'manager' || role === 'admin'
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [totals,      setTotals]      = useState({ total: 0, pending: 0, paid: 0 })
  const [loading,     setLoading]     = useState(true)
  const [updating,    setUpdating]    = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')

  function load() {
    const sp = filterStatus ? `?status=${filterStatus}` : ''
    fetch(`/api/sales/commissions${sp}`)
      .then(r => r.json())
      .then(d => {
        setCommissions(d.commissions ?? [])
        setTotals(d.totals ?? { total: 0, pending: 0, paid: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus]) // eslint-disable-line

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch(`/api/sales/commissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(null)
    load()
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
    </div>
  )

  return (
    <div>
      {/* Totals row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'Total Earned', value: totals.pending + totals.paid, color: 'var(--text-primary)' },
          { label: 'Pending',      value: totals.pending,               color: 'var(--brand-amber-text)' },
          { label: 'Paid',         value: totals.paid,                  color: 'var(--brand-green-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
            <p className="t-caption">{label}</p>
            <p className="t-mono" style={{ fontSize: 22, fontWeight: 700, color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['', 'pending', 'approved', 'paid'].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setFilterStatus(s)}
            className={filterStatus === s ? 'fadaa-btn fadaa-btn-sm' : 'fadaa-btn-ghost fadaa-btn-sm'}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {commissions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💰</div>
          <p className="empty-state-title">No commissions yet</p>
          <p className="empty-state-sub">Commissions are automatically created when a lead is marked as Won</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {[
                  isPrivileged && 'Rep',
                  'Lead', 'Service', 'Deal Value', 'Commission', 'Status', isPrivileged && 'Actions',
                ].filter(Boolean).map(h => (
                  <th key={h as string} className="t-label" style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissions.map(c => {
                const sc = STATUS_COLOR[c.status]
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {isPrivileged && (
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{c.sales_users?.name ?? '—'}</td>
                    )}
                    <td style={{ padding: '10px 12px' }}>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.sales_leads?.company_name ?? '—'}</p>
                      <p className="t-caption">{c.sales_leads?.contact_person}</p>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{c.sales_services?.name ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="t-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(c.deal_value)}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="t-mono" style={{ color: 'var(--brand-green-text)', fontWeight: 700 }}>{fmt(c.commission_amount)}</span>
                      <span className="t-caption" style={{ marginLeft: 4 }}>{c.commission_pct}%</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>
                        {c.status}
                      </span>
                    </td>
                    {isPrivileged && (
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {c.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(c.id, 'approved')}
                              disabled={updating === c.id}
                              className="fadaa-btn fadaa-btn-sm"
                              style={{ fontSize: 11 }}
                            >
                              Approve
                            </button>
                          )}
                          {c.status === 'approved' && (
                            <button
                              onClick={() => updateStatus(c.id, 'paid')}
                              disabled={updating === c.id}
                              className="fadaa-btn fadaa-btn-sm"
                              style={{ fontSize: 11, background: 'var(--brand-green)', borderColor: 'var(--brand-green)' }}
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
