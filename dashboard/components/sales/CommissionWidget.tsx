'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { readSettings } from '@/lib/sales/autoAssign'

interface Totals {
  total:   number
  pending: number
  paid:    number
}

function fmt(v: number) {
  if (v >= 1000000) return `$${(v/1000000).toFixed(1)}M`
  if (v >= 1000)    return `$${(v/1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

export function CommissionWidget() {
  const { data: session } = useSession()
  const role   = (session?.user as { role?: string })?.role ?? 'rep'
  const [totals,  setTotals]  = useState<Totals | null>(null)
  const [target,  setTarget]  = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/sales/commissions').then(r => r.json()),
      fetch('/api/sales/settings').then(r => r.json()),
    ]).then(([cd, sd]) => {
      setTotals(cd.totals ?? null)
      setTarget(sd.settings?.commission?.team_target ?? 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="skeleton fadaa-card" style={{ height: 96 }} />
  if (!totals) return null

  const earned    = totals.pending + totals.paid
  const pct       = target > 0 ? Math.min(100, (earned / target) * 100) : 0

  return (
    <div className="fadaa-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="t-section-title">{role === 'rep' ? 'My Commission' : 'Team Commission'}</h3>
        <a href="/sales/commissions" style={{ fontSize: 11, color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}>View all →</a>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: target > 0 ? 12 : 0 }}>
        <div>
          <p className="t-caption">Pending</p>
          <p className="t-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-amber-text)' }}>{fmt(totals.pending)}</p>
        </div>
        <div>
          <p className="t-caption">Paid</p>
          <p className="t-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-green-text)' }}>{fmt(totals.paid)}</p>
        </div>
        <div>
          <p className="t-caption">Total Earned</p>
          <p className="t-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(earned)}</p>
        </div>
      </div>

      {target > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="t-caption">Team Target</span>
            <span className="t-caption">{fmt(earned)} / {fmt(target)} ({pct.toFixed(0)}%)</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
              borderRadius: 999, transition: 'width 0.8s ease-out',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
