'use client'

import { useEffect, useState } from 'react'

interface Stats {
  leads_total: number
  leads_qualified: number
  leads_waiting: number
  meetings_done: number
  proposals_sent: number
  contracts_generated: number
  won_today: number
}

interface Report extends Stats {
  id?: string
  user_id?: string
  report_date: string
  highlights: string
  challenges: string
  next_day_plan: string
  custom_notes: string
  status: 'draft' | 'submitted'
  sales_users?: { name?: string | null } | null
}

const TODAY = new Date().toISOString().split('T')[0]

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="t-label">{label}</label>
      <input
        type="number"
        min={0}
        className="fadaa-input"
        style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, padding: '10px 8px' }}
        value={value}
        onChange={(event) => onChange(Math.max(0, parseInt(event.target.value) || 0))}
      />
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="t-label">{label}</label>
      <textarea
        className="fadaa-input"
        rows={3}
        placeholder={placeholder}
        style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.6 }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function emptyReport(date: string): Report {
  return {
    report_date: date,
    leads_total: 0,
    leads_qualified: 0,
    leads_waiting: 0,
    meetings_done: 0,
    proposals_sent: 0,
    contracts_generated: 0,
    won_today: 0,
    highlights: '',
    challenges: '',
    next_day_plan: '',
    custom_notes: '',
    status: 'draft',
  }
}

export function DailyReportForm({
  date = TODAY,
  reportId,
  adminMode = false,
  onSubmitted,
}: {
  date?: string
  reportId?: string
  adminMode?: boolean
  onSubmitted?: () => void
}) {
  const [report, setReport] = useState<Report>(emptyReport(date))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  useEffect(() => {
    setLoading(true)
    setReport(emptyReport(date))

    if (reportId) {
      fetch(`/api/sales/daily-reports/${reportId}`)
        .then((response) => response.json())
        .then((payload) => {
          if (payload.report) setReport(payload.report)
          setLoading(false)
        })
        .catch(() => setLoading(false))
      return
    }

    fetch(`/api/sales/daily-reports?from=${date}&to=${date}`)
      .then((response) => response.json())
      .then((payload) => {
        const existing = payload.reports?.find((entry: Report) => entry.report_date === date)
        if (existing) {
          setReport(existing)
          setLoading(false)
          return
        }

        if (!adminMode && date === TODAY) {
          fetch('/api/sales/daily-reports/today-stats')
            .then((response) => response.json())
            .then((stats) => setReport((prev) => ({ ...prev, ...stats })))
            .catch(() => {})
            .finally(() => setLoading(false))
          return
        }

        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [adminMode, date, reportId])

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  function update<K extends keyof Report>(key: K, value: Report[K]) {
    setReport((prev) => ({ ...prev, [key]: value }))
  }

  async function save(status: 'draft' | 'submitted') {
    setSaving(true)
    const method = report.id ? 'PATCH' : 'POST'
    const url = report.id ? `/api/sales/daily-reports/${report.id}` : '/api/sales/daily-reports'
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...report, status }),
    })
    const payload = await response.json()
    setSaving(false)
    if (!response.ok) {
      flash(payload.error ?? 'Save failed', 'err')
      return
    }
    setReport(payload.report)
    flash(status === 'submitted' ? 'Report submitted!' : 'Draft saved', 'ok')
    if (status === 'submitted') onSubmitted?.()
  }

  async function exportDocx() {
    if (!report.id) {
      flash('Save the report first', 'err')
      return
    }
    const response = await fetch(`/api/sales/daily-reports/${report.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' }),
    })
    if (!response.ok) {
      flash('Export failed', 'err')
      return
    }
    const blob = await response.blob()
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(blob)
    anchor.download = `daily-report-${report.report_date}.docx`
    anchor.click()
  }

  function shareWhatsApp() {
    const lines = [
      `*Daily Report — ${report.report_date}*`,
      '',
      `Leads: ${report.leads_total} total | ${report.leads_qualified} qualified | ${report.leads_waiting} waiting`,
      `Meetings: ${report.meetings_done} done | Proposals: ${report.proposals_sent} | Won: ${report.won_today}`,
      report.highlights ? `\n*Highlights:*\n${report.highlights}` : '',
      report.challenges ? `\n*Challenges:*\n${report.challenges}` : '',
      report.next_day_plan ? `\n*Tomorrow:*\n${report.next_day_plan}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank')
  }

  const isSubmitted = report.status === 'submitted'

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map((key) => (
          <div key={key} className="skeleton" style={{ height: 60, borderRadius: 8 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="fadaa-card" style={{ padding: '24px' }}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h3 className="t-section-title">
            Daily Report — {report.report_date}
            {adminMode && report.sales_users?.name ? ` · ${report.sales_users.name}` : ''}
          </h3>
          <p className="t-caption" style={{ marginTop: 3 }}>
            {isSubmitted ? 'Report submitted ✓' : adminMode ? 'Editing an existing team report' : 'Fill in your end-of-day numbers and notes'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg && (
            <span
              style={{
                fontSize: 12,
                color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)',
                fontWeight: 500,
              }}
            >
              {msgType === 'ok' ? '✓' : '⚠'} {msg}
            </span>
          )}
          {isSubmitted && (
            <>
              <button onClick={exportDocx} className="fadaa-btn fadaa-btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                ↓ DOCX
              </button>
              <button onClick={() => window.print()} className="fadaa-btn fadaa-btn-sm">
                ↓ PDF
              </button>
              <button
                onClick={shareWhatsApp}
                className="fadaa-btn fadaa-btn-sm"
                style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' }}
              >
                WhatsApp
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, marginBottom: 20 }}>
        <NumField label="Total Leads" value={report.leads_total} onChange={(value) => update('leads_total', value)} />
        <NumField label="Qualified" value={report.leads_qualified} onChange={(value) => update('leads_qualified', value)} />
        <NumField label="Waiting" value={report.leads_waiting} onChange={(value) => update('leads_waiting', value)} />
        <NumField label="Meetings Done" value={report.meetings_done} onChange={(value) => update('meetings_done', value)} />
        <NumField label="Proposals Sent" value={report.proposals_sent} onChange={(value) => update('proposals_sent', value)} />
        <NumField label="Contracts" value={report.contracts_generated} onChange={(value) => update('contracts_generated', value)} />
        <NumField label="Won Today" value={report.won_today} onChange={(value) => update('won_today', value)} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextArea
          label="Highlights"
          value={report.highlights}
          onChange={(value) => update('highlights', value)}
          placeholder="What went well today?"
        />
        <TextArea
          label="Challenges"
          value={report.challenges}
          onChange={(value) => update('challenges', value)}
          placeholder="What obstacles did you face?"
        />
        <TextArea
          label="Tomorrow's Plan"
          value={report.next_day_plan}
          onChange={(value) => update('next_day_plan', value)}
          placeholder="What are your priorities for tomorrow?"
        />
        <TextArea
          label="Additional Notes"
          value={report.custom_notes}
          onChange={(value) => update('custom_notes', value)}
          placeholder="Anything else to flag?"
        />
      </div>

      {!isSubmitted && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => save('draft')}
            disabled={saving}
            className="fadaa-btn fadaa-btn-sm"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving ? (
              <>
                <span className="spinner spinner-sm" /> Saving…
              </>
            ) : (
              'Save Draft'
            )}
          </button>
          <button onClick={() => save('submitted')} disabled={saving} className="fadaa-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving ? (
              <>
                <span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      )}

      {isSubmitted && !saving && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => update('status', 'draft')}
            className="fadaa-btn fadaa-btn-sm"
            style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
          >
            Edit Report
          </button>
        </div>
      )}
    </div>
  )
}
