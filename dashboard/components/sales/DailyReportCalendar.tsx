'use client'

import { useEffect, useState } from 'react'

interface ReportSummary {
  id: string
  report_date: string
  status: 'draft' | 'submitted'
  user_id: string
  sales_users?: { id: string; name: string; avatar_url?: string }
}

interface Rep {
  id: string
  name: string
  avatar_url?: string
}

function pad(n: number) { return String(n).padStart(2, '0') }

function monthKey(y: number, m: number) { return `${y}-${pad(m + 1)}` }

export function DailyReportCalendar({ onDaySelect }: { onDaySelect?: (date: string) => void }) {
  const today = new Date()
  const [year,    setYear]    = useState(today.getFullYear())
  const [month,   setMonth]   = useState(today.getMonth())
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [reps,    setReps]    = useState<Rep[]>([])
  const [selRep,  setSelRep]  = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const from = `${year}-${pad(month + 1)}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to   = `${year}-${pad(month + 1)}-${pad(lastDay)}`

    fetch(`/api/sales/daily-reports?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        setReports(d.reports ?? [])
        setReps(d.reps ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year, month])

  // Build calendar grid
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function repColor(submitted: boolean, hasDraft: boolean) {
    if (submitted) return 'var(--brand-green-dim)'
    if (hasDraft)  return 'var(--brand-amber-dim)'
    return 'transparent'
  }

  function dayReports(day: number) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
    return reports.filter(r => r.report_date === dateStr && (selRep === 'all' || r.user_id === selRep))
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className="t-section-title">{MONTH_NAMES[month]} {year}</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={prevMonth} className="fadaa-btn fadaa-btn-sm" style={{ padding: '4px 10px' }}>‹</button>
            <button onClick={nextMonth} className="fadaa-btn fadaa-btn-sm" style={{ padding: '4px 10px' }}>›</button>
          </div>
        </div>
        <select
          className="fadaa-input"
          style={{ width: 'auto', minWidth: 140, fontSize: 12 }}
          value={selRep}
          onChange={e => setSelRep(e.target.value)}
        >
          <option value="all">All Reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {[
          { color: 'var(--brand-green-dim)', border: 'var(--brand-green-glow)', label: 'Submitted' },
          { color: 'var(--brand-amber-dim)', border: 'var(--brand-amber-glow)', label: 'Draft' },
          { color: 'rgba(255,255,255,0.03)', border: 'var(--border-subtle)', label: 'Not submitted' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: `1px solid ${l.border}` }} />
            <span className="t-caption">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="t-label" style={{ textAlign: 'center', padding: '4px 0', fontSize: 10 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1
          const dayReps = dayReports(day)
          const submitted = dayReps.filter(r => r.status === 'submitted')
          const draft     = dayReps.filter(r => r.status === 'draft')
          const isToday   = year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
          const dateStr   = `${year}-${pad(month + 1)}-${pad(day)}`

          return (
            <div
              key={day}
              onClick={() => onDaySelect?.(dateStr)}
              style={{
                minHeight: 64,
                borderRadius: 8,
                border: isToday ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                background: submitted.length > 0
                  ? 'var(--brand-green-dim)'
                  : draft.length > 0
                  ? 'var(--brand-amber-dim)'
                  : 'rgba(255,255,255,0.02)',
                padding: '6px 6px 4px',
                cursor: onDaySelect ? 'pointer' : 'default',
                transition: 'opacity 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.8'; (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.98)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.transform = '' }}
            >
              <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>{day}</span>
              {loading ? null : (
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {submitted.length > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--brand-green-text)', fontWeight: 600 }}>
                      ✓ {submitted.length} submitted
                    </span>
                  )}
                  {draft.length > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--brand-amber-text)', fontWeight: 600 }}>
                      ◎ {draft.length} draft
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
