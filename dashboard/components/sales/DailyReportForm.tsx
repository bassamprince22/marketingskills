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
  report_date: string
  highlights: string
  challenges: string
  next_day_plan: string
  custom_notes: string
  status: 'draft' | 'submitted'
}

const TODAY = new Date().toISOString().split('T')[0]

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="t-label">{label}</label>
      <input
        type="number" min={0}
        className="fadaa-input"
        style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, padding: '10px 8px' }}
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="t-label">{label}</label>
      <textarea
        className="fadaa-input"
        rows={3}
        placeholder={placeholder}
        style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.6 }}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export function DailyReportForm({ date = TODAY, onSubmitted }: { date?: string; onSubmitted?: () => void }) {
  const [report, setReport] = useState<Report>({
    report_date: date,
    leads_total: 0, leads_qualified: 0, leads_waiting: 0,
    meetings_done: 0, proposals_sent: 0, contracts_generated: 0, won_today: 0,
    highlights: '', challenges: '', next_day_plan: '', custom_notes: '',
    status: 'draft',
  })
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgType,  setMsgType]  = useState<'ok' | 'err'>('ok')

  useEffect(() => {
    setLoading(true)
    // Load existing report for this date
    fetch(`/api/sales/daily-reports?from=${date}&to=${date}`)
      .then(r => r.json())
      .then(d => {
        const existing = d.reports?.find((r: Report) => r.report_date === date)
        if (existing) setReport(existing)
        else {
          // Auto-fill numbers
          fetch('/api/sales/daily-reports/today-stats')
            .then(r => r.json())
            .then(stats => setReport(prev => ({ ...prev, ...stats })))
            .catch(() => {})
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [date])

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  function update<K extends keyof Report>(k: K, v: Report[K]) {
    setReport(prev => ({ ...prev, [k]: v }))
  }

  async function save(status: 'draft' | 'submitted') {
    setSaving(true)
    const method = report.id ? 'PATCH' : 'POST'
    const url    = report.id ? `/api/sales/daily-reports/${report.id}` : '/api/sales/daily-reports'
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...report, status }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { flash(d.error ?? 'Save failed', 'err'); return }
    setReport(d.report)
    if (status === 'submitted') {
      flash('Report submitted!', 'ok')
      onSubmitted?.()
    } else {
      flash('Draft saved', 'ok')
    }
  }

  async function exportDocx() {
    if (!report.id) { flash('Save the report first', 'err'); return }
    const res  = await fetch(`/api/sales/daily-reports/${report.id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' }),
    })
    if (!res.ok) { flash('Export failed', 'err'); return }
    const blob = await res.blob()
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `daily-report-${report.report_date}.docx`
    a.click()
  }

  function shareWhatsApp() {
    const lines = [
      `*Daily Report — ${report.report_date}*`,
      ``,
      `Leads: ${report.leads_total} total | ${report.leads_qualified} qualified | ${report.leads_waiting} waiting`,
      `Meetings: ${report.meetings_done} done | Proposals: ${report.proposals_sent} | Won: ${report.won_today}`,
      report.highlights   ? `\n*Highlights:*\n${report.highlights}` : '',
      report.challenges   ? `\n*Challenges:*\n${report.challenges}` : '',
      report.next_day_plan ? `\n*Tomorrow:*\n${report.next_day_plan}` : '',
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank')
  }

  const isSubmitted = report.status === 'submitted'

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
      </div>
    )
  }

  return (
    <div className="fadaa-card" style={{ padding: '24px' }}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h3 className="t-section-title">Daily Report — {report.report_date}</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>
            {isSubmitted ? 'Report submitted ✓' : 'Fill in your end-of-day numbers and notes'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg && (
            <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)', fontWeight: 500 }}>
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
              <button onClick={shareWhatsApp} className="fadaa-btn fadaa-btn-sm" style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' }}>
                WhatsApp
              </button>
            </>
          )}
        </div>
      </div>

      {/* Number grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, marginBottom: 20 }}>
        <NumField label="Total Leads"    value={report.leads_total}         onChange={v => update('leads_total', v)} />
        <NumField label="Qualified"      value={report.leads_qualified}     onChange={v => update('leads_qualified', v)} />
        <NumField label="Waiting"        value={report.leads_waiting}       onChange={v => update('leads_waiting', v)} />
        <NumField label="Meetings Done"  value={report.meetings_done}       onChange={v => update('meetings_done', v)} />
        <NumField label="Proposals Sent" value={report.proposals_sent}      onChange={v => update('proposals_sent', v)} />
        <NumField label="Contracts"      value={report.contracts_generated} onChange={v => update('contracts_generated', v)} />
        <NumField label="Won Today"      value={report.won_today}           onChange={v => update('won_today', v)} />
      </div>

      {/* Narrative fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextArea
          label="Highlights"
          value={report.highlights}
          onChange={v => update('highlights', v)}
          placeholder="What went well today?"
        />
        <TextArea
          label="Challenges"
          value={report.challenges}
          onChange={v => update('challenges', v)}
          placeholder="What obstacles did you face?"
        />
        <TextArea
          label="Tomorrow's Plan"
          value={report.next_day_plan}
          onChange={v => update('next_day_plan', v)}
          placeholder="What are your priorities for tomorrow?"
        />
        <TextArea
          label="Additional Notes"
          value={report.custom_notes}
          onChange={v => update('custom_notes', v)}
          placeholder="Anything else to flag?"
        />
      </div>

      {!isSubmitted && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => save('draft')}
            disabled={saving}
            className="fadaa-btn fadaa-btn-sm"
            style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : 'Save Draft'}
          </button>
          <button
            onClick={() => save('submitted')}
            disabled={saving}
            className="fadaa-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saving ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</> : 'Submit Report'}
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
