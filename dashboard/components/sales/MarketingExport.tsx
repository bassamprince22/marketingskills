'use client'

import { useState } from 'react'

const SOURCES = ['', 'meta', 'referral', 'website', 'outbound', 'other']
const STAGES  = ['', 'new_lead', 'contacted', 'discovery', 'meeting_scheduled', 'meeting_completed',
  'qualified', 'proposal_sent', 'negotiation', 'contract_sent', 'won', 'lost']
const SOURCE_LABELS: Record<string, string> = {
  '': 'All Sources', meta: 'Meta Ads', referral: 'Referral', website: 'Website', outbound: 'Outbound', other: 'Other',
}
const STAGE_LABELS: Record<string, string> = {
  '': 'All Stages', new_lead: 'New Lead', contacted: 'Contacted', discovery: 'Discovery',
  meeting_scheduled: 'Meeting Scheduled', meeting_completed: 'Meeting Completed',
  qualified: 'Qualified', proposal_sent: 'Proposal Sent', negotiation: 'Negotiation',
  contract_sent: 'Contract Sent', won: 'Won', lost: 'Lost',
}

export function MarketingExport() {
  const [type,       setType]       = useState<'qualified' | 'meetings' | 'pipeline'>('qualified')
  const [from,       setFrom]       = useState('')
  const [to,         setTo]         = useState('')
  const [source,     setSource]     = useState('')
  const [stage,      setStage]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState('')
  const [msgType,    setMsgType]    = useState<'ok'|'err'>('ok')

  function flash(text: string, type: 'ok'|'err') { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 4000) }

  async function download() {
    setLoading(true)
    const body = { type, from: from || undefined, to: to || undefined, source: source || undefined, stage: stage || undefined }
    const res  = await fetch('/api/sales/marketing/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)

    if (!res.ok) { flash('Export failed', 'err'); return }
    const blob = await res.blob()
    if (blob.size < 10) { flash('No data matches the selected filters', 'err'); return }

    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `fadaa-${type}-${Date.now()}.csv`
    a.click()
    flash(`Downloaded ${type} export`, 'ok')
  }

  return (
    <div>
      <p className="t-label" style={{ marginBottom: 12 }}>Export Options</p>

      {/* Export type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['qualified', 'Qualified Leads'], ['meetings', 'Meetings'], ['pipeline', 'Pipeline Snapshot']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setType(val)}
            className={type === val ? 'fadaa-btn fadaa-btn-sm' : 'fadaa-btn-ghost fadaa-btn-sm'}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div>
          <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>From Date</label>
          <input className="fadaa-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>To Date</label>
          <input className="fadaa-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Source</label>
          <select className="fadaa-input" value={source} onChange={e => setSource(e.target.value)}>
            {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
          </select>
        </div>
        {type === 'pipeline' && (
          <div>
            <label className="t-label" style={{ marginBottom: 4, display: 'block' }}>Stage</label>
            <select className="fadaa-input" value={stage} onChange={e => setStage(e.target.value)}>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={download}
          disabled={loading}
          className="fadaa-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {loading
            ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Exporting…</>
            : '↓ Download CSV'
          }
        </button>
        {msg && (
          <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)', fontWeight: 500 }}>
            {msgType === 'ok' ? '✓' : '⚠'} {msg}
          </span>
        )}
      </div>
    </div>
  )
}
