'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'
import type { Meeting, Lead } from '@/lib/sales/types'
import { MEETING_TYPE_LABELS } from '@/lib/sales/types'

function MeetingForm({
  leadId,
  onSaved,
  onCancel,
}: {
  leadId?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    lead_id:          leadId ?? '',
    meeting_date:     '',
    meeting_type:     'discovery',
    status:           'scheduled',
    notes:            '',
    outcome:          '',
    next_action:      '',
    next_action_date: '',
  })

  useEffect(() => {
    if (!leadId) {
      fetch('/api/sales/leads?limit=200')
        .then(r => r.json())
        .then(d => setLeads(d.leads ?? []))
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

  const label = (l: string) => (
    <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{l}</label>
  )

  return (
    <div className="fadaa-card" style={{ padding: 28, maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 16, marginBottom: 24 }}>◷ Log Meeting</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {!leadId && (
          <div>
            {label('Lead *')}
            <select className="fadaa-input" value={form.lead_id} onChange={set('lead_id')} required>
              <option value="">— Select a lead —</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} · {l.contact_person}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            {label('Meeting Date & Time *')}
            <input className="fadaa-input" type="datetime-local" value={form.meeting_date} onChange={set('meeting_date')} required />
          </div>
          <div>
            {label('Meeting Type')}
            <select className="fadaa-input" value={form.meeting_type} onChange={set('meeting_type')}>
              {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            {label('Status')}
            <select className="fadaa-input" value={form.status} onChange={set('status')}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div>
            {label('Next Action Date')}
            <input className="fadaa-input" type="date" value={form.next_action_date} onChange={set('next_action_date')} />
          </div>
        </div>
        <div>
          {label('Meeting Notes')}
          <textarea className="fadaa-input" value={form.notes} onChange={set('notes')} rows={3} placeholder="What was discussed?" style={{ resize: 'vertical' }} />
        </div>
        <div>
          {label('Outcome')}
          <input className="fadaa-input" value={form.outcome} onChange={set('outcome')} placeholder="e.g. Client interested, sending proposal" />
        </div>
        <div>
          {label('Next Action')}
          <input className="fadaa-input" value={form.next_action} onChange={set('next_action')} placeholder="e.g. Send proposal by Friday" />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="fadaa-btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={saving} className="fadaa-btn">{saving ? 'Saving…' : 'Save Meeting'}</button>
        </div>
      </form>
    </div>
  )
}

export default function MeetingsPage() {
  const sp     = useSearchParams()
  const leadId = sp.get('leadId') ?? undefined

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading]   = useState(true)
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
        <MeetingForm
          leadId={leadId}
          onSaved={() => { setShowForm(false); load() }}
          onCancel={() => setShowForm(false)}
        />
      </SalesShell>
    )
  }

  return (
    <SalesShell>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>◷ Meetings</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{meetings.length} meetings logged</p>
        </div>
        <button className="fadaa-btn" onClick={() => setShowForm(true)}>+ Log Meeting</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="fadaa-card" style={{ height: 80 }} />)}
        </div>
      ) : meetings.length === 0 ? (
        <div className="fadaa-card" style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>◷</p>
          <p>No meetings logged yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meetings.map(m => (
            <div key={m.id} className="fadaa-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14 }}>
                      {m.lead?.company_name ?? 'Unknown Lead'}
                    </p>
                    <span style={{ color: '#64748B', fontSize: 12 }}>·</span>
                    <span style={{ color: '#94A3B8', fontSize: 12 }}>
                      {MEETING_TYPE_LABELS[m.meeting_type]}
                    </span>
                  </div>
                  <p style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                    {new Date(m.meeting_date).toLocaleString()} · {m.rep?.name}
                  </p>
                  {m.notes && <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>📝 {m.notes}</p>}
                  {m.outcome && <p style={{ color: '#34D399', fontSize: 13, marginTop: 4 }}>✓ {m.outcome}</p>}
                  {m.next_action && <p style={{ color: '#FCD34D', fontSize: 13, marginTop: 4 }}>→ {m.next_action}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <span style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999,
                    background: m.status === 'completed' ? 'rgba(74,222,128,0.1)' : m.status === 'cancelled' || m.status === 'no_show' ? 'rgba(239,68,68,0.1)' : 'rgba(79,142,247,0.1)',
                    color:      m.status === 'completed' ? '#4ADE80'              : m.status === 'cancelled' || m.status === 'no_show' ? '#F87171'              : '#60A5FA',
                  }}>
                    {m.status}
                  </span>
                  {m.status === 'scheduled' && (
                    <button
                      onClick={() => updateStatus(m.id, 'completed')}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)', cursor: 'pointer' }}
                    >
                      Mark Done
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
