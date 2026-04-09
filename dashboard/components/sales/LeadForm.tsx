'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { Lead, SalesUser } from '@/lib/sales/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/lib/sales/types'

interface Props {
  initial?: Partial<Lead>
  mode:     'create' | 'edit'
  leadId?:  string
}

const FIELD = {
  label: (l: string) => (
    <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
      {l}
    </label>
  )
}

export function LeadForm({ initial = {}, mode, leadId }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'

  const [reps, setReps]     = useState<SalesUser[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState({
    company_name:         initial.company_name         ?? '',
    contact_person:       initial.contact_person       ?? '',
    phone:                initial.phone                ?? '',
    email:                initial.email                ?? '',
    service_type:         initial.service_type         ?? 'marketing',
    lead_source:          initial.lead_source          ?? 'other',
    budget_range:         initial.budget_range         ?? '',
    pipeline_stage:       initial.pipeline_stage       ?? 'new_lead',
    assigned_rep_id:      initial.assigned_rep_id      ?? '',
    notes:                initial.notes                ?? '',
    next_follow_up_date:  initial.next_follow_up_date  ?? '',
    deal_type:            initial.deal_type            ?? 'one_time',
    estimated_value:      initial.estimated_value?.toString() ?? '',
    priority:             initial.priority             ?? 'medium',
    expected_close_date:  initial.expected_close_date  ?? '',
    marketing_package:    initial.marketing_package    ?? '',
    software_scope_notes: initial.software_scope_notes ?? '',
    lost_reason:          initial.lost_reason          ?? '',
  })

  useEffect(() => {
    if (role === 'manager' || role === 'admin') {
      fetch('/api/sales/users?role=rep')
        .then(r => r.json())
        .then(d => setReps(d.users ?? []))
    }
  }, [role])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        next_follow_up_date:  form.next_follow_up_date  || null,
        expected_close_date:  form.expected_close_date  || null,
        assigned_rep_id:      form.assigned_rep_id      || null,
      }
      const url = mode === 'edit' ? `/api/sales/leads/${leadId}` : '/api/sales/leads'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.push(`/sales/leads/${data.lead.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#F87171', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Section: Contact */}
      <div className="fadaa-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: '#4F8EF7', fontSize: 13, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          ◎ Contact Information
        </h3>
        <div style={gridStyle}>
          <div>
            {FIELD.label('Company Name *')}
            <input className="fadaa-input" value={form.company_name} onChange={set('company_name')} required placeholder="Acme Corp" />
          </div>
          <div>
            {FIELD.label('Contact Person *')}
            <input className="fadaa-input" value={form.contact_person} onChange={set('contact_person')} required placeholder="John Smith" />
          </div>
          <div>
            {FIELD.label('Phone')}
            <input className="fadaa-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
          </div>
          <div>
            {FIELD.label('Email')}
            <input className="fadaa-input" type="email" value={form.email} onChange={set('email')} placeholder="john@acme.com" />
          </div>
        </div>
      </div>

      {/* Section: Lead Info */}
      <div className="fadaa-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: '#A78BFA', fontSize: 13, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          ✦ Lead Details
        </h3>
        <div style={gridStyle}>
          <div>
            {FIELD.label('Service Type *')}
            <select className="fadaa-input" value={form.service_type} onChange={set('service_type')} required>
              <option value="marketing">Marketing Services</option>
              <option value="software">Software Services</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            {FIELD.label('Lead Source *')}
            <select className="fadaa-input" value={form.lead_source} onChange={set('lead_source')} required>
              <option value="meta">Meta Ads</option>
              <option value="referral">Referral</option>
              <option value="website">Website</option>
              <option value="outbound">Outbound</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            {FIELD.label('Pipeline Stage')}
            <select className="fadaa-input" value={form.pipeline_stage} onChange={set('pipeline_stage')}>
              {PIPELINE_STAGES.map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            {FIELD.label('Priority')}
            <select className="fadaa-input" value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            {FIELD.label('Budget Range')}
            <input className="fadaa-input" value={form.budget_range} onChange={set('budget_range')} placeholder="e.g. $5k - $10k" />
          </div>
          <div>
            {FIELD.label('Estimated Value ($)')}
            <input className="fadaa-input" type="number" value={form.estimated_value} onChange={set('estimated_value')} placeholder="5000" min={0} />
          </div>
          <div>
            {FIELD.label('Next Follow-up Date')}
            <input className="fadaa-input" type="date" value={form.next_follow_up_date} onChange={set('next_follow_up_date')} />
          </div>
          <div>
            {FIELD.label('Expected Close Date')}
            <input className="fadaa-input" type="date" value={form.expected_close_date} onChange={set('expected_close_date')} />
          </div>
        </div>

        {/* Manager-only: assign rep */}
        {(role === 'manager' || role === 'admin') && (
          <div style={{ marginTop: 20 }}>
            {FIELD.label('Assign to Rep')}
            <select className="fadaa-input" value={form.assigned_rep_id} onChange={set('assigned_rep_id')}>
              <option value="">— Unassigned —</option>
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Section: Service specifics */}
      <div className="fadaa-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: '#22D3EE', fontSize: 13, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          ⟿ Service Details
        </h3>
        <div style={gridStyle}>
          <div>
            {FIELD.label('Deal Type')}
            <select className="fadaa-input" value={form.deal_type} onChange={set('deal_type')}>
              <option value="one_time">One-time Project</option>
              <option value="retainer">Monthly Retainer</option>
            </select>
          </div>
          <div>
            {FIELD.label('Marketing Package')}
            <input className="fadaa-input" value={form.marketing_package} onChange={set('marketing_package')} placeholder="e.g. Social Media Growth, Full Funnel" />
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          {FIELD.label('Software Scope Notes')}
          <textarea
            className="fadaa-input"
            value={form.software_scope_notes}
            onChange={set('software_scope_notes')}
            rows={3}
            placeholder="Describe the software project scope, tech stack, features…"
            style={{ resize: 'vertical' }}
          />
        </div>
        <div style={{ marginTop: 20 }}>
          {FIELD.label('Notes')}
          <textarea
            className="fadaa-input"
            value={form.notes}
            onChange={set('notes')}
            rows={4}
            placeholder="Any additional notes about this lead…"
            style={{ resize: 'vertical' }}
          />
        </div>
        {form.pipeline_stage === 'lost' && (
          <div style={{ marginTop: 20 }}>
            {FIELD.label('Lost Reason')}
            <input className="fadaa-input" value={form.lost_reason} onChange={set('lost_reason')} placeholder="Why was this lead lost?" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button type="button" className="fadaa-btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="fadaa-btn">
          {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Lead'}
        </button>
      </div>
    </form>
  )
}
