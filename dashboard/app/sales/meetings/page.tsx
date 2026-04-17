'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'
import type { Meeting, Lead } from '@/lib/sales/types'
import { MEETING_TYPE_LABELS } from '@/lib/sales/types'

function FormLabel({ children }: { children: React.ReactNode }) {
  return <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>{children}</label>
}

function MeetingForm({ leadId, onSaved, onCancel }: {
  leadId?: string; onSaved: () => void; onCancel: () => void
}) {
  const [leads,  setLeads]  = useState<Lead[]>([])
  const [saving, setSaving] = useState(false)
  const [form,   setForm]   = useState({
    lead_id: leadId ?? '', meeting_date: '', meeting_type: 'discovery',
    status: 'scheduled', notes: '', outcome: '', next_action: '', next_action_date: '',
  })

  useEffect(() => {
    if (!leadId) {
      fetch('/api/sales/leads?limit=200').then(r => r.json()).then(d => setLeads(d.leads ?? []))
    }
  }, [leadId])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/sales/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { onSaved() } else { setSaving(false) }
  }

  return (
    <div className="fadaa-card" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="t-section-title">Log Meeting</h2>
        <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!leadId && (
            <div className="form-field">
              <FormLabel>Lead *</FormLabel>
              <select className="fadaa-input" value={form.lead_id} onChange={set('lead_id')} required>
                <option value="">— Select a lead —</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} · {l.contact_person}</option>)}
              </select>
            </div>
          )}
          <div className="form-grid-2">
            <div className="form-field">
              <FormLabel>Date & Time *</FormLabel>
              <input className="fadaa-input" type="datetime-local" value={form.meeting_date} onChange={set('meeting_date')} required />
            </div>
            <div className="form-field">
              <FormLabel>Meeting Type</FormLabel>
              <select className="fadaa-input" value={form.meeting_type} onChange={set('meeting_type')}>
                {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-field">
              <FormLabel>Status</FormLabel>
              <select className="fadaa-input" value={form.status} onChange={set('status')}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            <div className="form-field">
              <FormLabel>Next Action Date</FormLabel>
              <input className="fadaa-input" type="date" value={form.next_action_date} onChange={set('next_action_date')} />
            </div>
          </div>
          <div className="form-field">
            <FormLabel>Meeting Notes</FormLabel>
            <textarea className="fadaa-input" value={form.notes} onChange={set('notes')} rows={3} placeholder="What was discussed?" style={{ resize: 'vertical' }} />
          </div>
          <div className="form-field">
            <FormLabel>Outcome</FormLabel>
            <input className="fadaa-input" value={form.outcome} onChange={set('outcome')} placeholder="e.g. Client interested, sending proposal" />
          </div>
          <div className="form-field">
            <FormLabel>Next Action</FormLabel>
            <input className="fadaa-input" value={form.next_action} onChange={set('next_action')} placeholder="e.g. Send proposal by Friday" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="fadaa-btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" disabled={saving} className="fadaa-btn" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving ? <><span className="spinner spinner-sm" /> Saving…</> : 'Save Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'completed' ? 'badge-completed'
    : status === 'cancelled' ? 'badge-cancelled'
    : status === 'no_show'   ? 'badge-no_show'
    : 'badge-scheduled'
  return <span className={`badge ${cls}`}>{status.replace('_', ' ')}</span>
}

function MeetingsContent() {
  const sp     = useSearchParams()
  const leadId = sp.get('leadId') ?? undefined

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(!!leadId)

  const load = useCallback(() => {
    setLoading(true)
    const query = leadId ? `?leadId=${leadId}` : ''
    fetch(`/api/sales/meetings${query}`)
      .then(r => r.json())
      .then(d => { setMeetings(d.meetings ?? []); setLoading(false) })
  }, [leadId])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/sales/meetings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  if (showForm) {
    return (
      <SalesShell>
        <Link_back onClick={() => setShowForm(false)} />
        <MeetingForm leadId={leadId} onSaved={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      </SalesShell>
    )
  }

  return (
    <SalesShell>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Meetings</h1>
          <p className="t-caption">{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} logged</p>
        </div>
        <button className="fadaa-btn" onClick={() => setShowForm(true)}>+ Log Meeting</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fadaa-card skeleton" style={{ height: 90 }} />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="fadaa-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <p className="empty-state-title">No meetings logged yet</p>
            <p className="empty-state-desc">Log your first meeting to start tracking your sales conversations.</p>
            <button className="fadaa-btn" onClick={() => setShowForm(true)}>+ Log Meeting</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meetings.map(m => (
            <div key={m.id} className="fadaa-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <p className="t-card-title">{m.lead?.company_name ?? 'Unknown Lead'}</p>
                    <span className="t-caption">·</span>
                    <span className="t-caption">{MEETING_TYPE_LABELS[m.meeting_type]}</span>
                  </div>
                  <p className="t-caption">
                    {new Date(m.meeting_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {m.rep?.name ? ` · ${m.rep.name}` : ''}
                  </p>
                  {m.notes      && <p className="t-body" style={{ marginTop: 8 }}>📝 {m.notes}</p>}
                  {m.outcome    && <p style={{ color: '#4ADE80', fontSize: 13, marginTop: 6 }}>✓ {m.outcome}</p>}
                  {m.next_action && <p style={{ color: '#F59E0B', fontSize: 13, marginTop: 4 }}>→ {m.next_action}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                  <StatusBadge status={m.status} />
                  {m.status === 'scheduled' && (
                    <button
                      onClick={() => updateStatus(m.id, 'completed')}
                      className="badge badge-completed"
                      style={{ cursor: 'pointer', border: 'none', transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      ✓ Mark Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SalesShell>
  )
}

function Link_back({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ color: 'var(--text-muted)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, transition: 'color 0.15s', padding: 0 }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
    >
      ← All Meetings
    </button>
  )
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<SalesShell><div className="t-caption" style={{ padding: 40 }}>Loading…</div></SalesShell>}>
      <MeetingsContent />
    </Suspense>
  )
}
