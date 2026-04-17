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

function SectionHeading({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="card-header" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color, fontSize: 14 }}>{icon}</span>
        <h3 className="t-label" style={{ color, letterSpacing: '0.08em' }}>{label}</h3>
      </div>
    </div>
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
        estimated_value:     form.estimated_value ? parseFloat(form.estimated_value) : null,
        next_follow_up_date: form.next_follow_up_date  || null,
        expected_close_date: form.expected_close_date  || null,
        assigned_rep_id:     form.assigned_rep_id      || null,
      }
      const url    = mode === 'edit' ? `/api/sales/leads/${leadId}` : '/api/sales/leads'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.push(`/sales/leads/${data.lead.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
          borderRadius: 10, padding: '12px 16px', color: '#F87171',
          marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        }}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Section: Contact */}
      <div className="fadaa-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <SectionHeading icon="◎" label="Contact Information" color="var(--brand-primary)" />
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label">Company Name <span style={{ color: '#F87171' }}>*</span></label>
            <input className="fadaa-input" value={form.company_name} onChange={set('company_name')} required placeholder="Acme Corp" />
          </div>
          <div className="form-field">
            <label className="form-label">Contact Person <span style={{ color: '#F87171' }}>*</span></label>
            <input className="fadaa-input" value={form.contact_person} onChange={set('contact_person')} required placeholder="John Smith" />
          </div>
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input className="fadaa-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="fadaa-input" type="email" value={form.email} onChange={set('email')} placeholder="john@acme.com" />
          </div>
        </div>
      </div>

      {/* Section: Lead Info */}
      <div className="fadaa-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <SectionHeading icon="✦" label="Lead Details" color="var(--brand-secondary)" />
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label">Service Type <span style={{ color: '#F87171' }}>*</span></label>
            <select className="fadaa-input" value={form.service_type} onChange={set('service_type')} required>
              <option value="marketing">Marketing Services</option>
              <option value="software">Software Services</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Lead Source <span style={{ color: '#F87171' }}>*</span></label>
            <select className="fadaa-input" value={form.lead_source} onChange={set('lead_source')} required>
              <option value="meta">Meta Ads</option>
              <option value="referral">Referral</option>
              <option value="website">Website</option>
              <option value="outbound">Outbound</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Pipeline Stage</label>
            <select className="fadaa-input" value={form.pipeline_stage} onChange={set('pipeline_stage')}>
              {PIPELINE_STAGES.map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Priority</label>
            <select className="fadaa-input" value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Budget Range</label>
            <input className="fadaa-input" value={form.budget_range} onChange={set('budget_range')} placeholder="e.g. $5k – $10k" />
          </div>
          <div className="form-field">
            <label className="form-label">Estimated Value ($)</label>
            <input className="fadaa-input" type="number" value={form.estimated_value} onChange={set('estimated_value')} placeholder="5000" min={0} />
          </div>
          <div className="form-field">
            <label className="form-label">Next Follow-up Date</label>
            <input className="fadaa-input" type="date" value={form.next_follow_up_date} onChange={set('next_follow_up_date')} />
          </div>
          <div className="form-field">
            <label className="form-label">Expected Close Date</label>
            <input className="fadaa-input" type="date" value={form.expected_close_date} onChange={set('expected_close_date')} />
          </div>
        </div>

        {(role === 'manager' || role === 'admin') && (
          <div className="form-field" style={{ marginTop: 20 }}>
            <label className="form-label">Assign to Rep</label>
            <select className="fadaa-input" value={form.assigned_rep_id} onChange={set('assigned_rep_id')}>
              <option value="">— Unassigned —</option>
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Section: Service Details */}
      <div className="fadaa-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <SectionHeading icon="⟿" label="Service Details" color="var(--brand-cyan)" />
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label">Deal Type</label>
            <select className="fadaa-input" value={form.deal_type} onChange={set('deal_type')}>
              <option value="one_time">One-time Project</option>
              <option value="retainer">Monthly Retainer</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Marketing Package</label>
            <input className="fadaa-input" value={form.marketing_package} onChange={set('marketing_package')} placeholder="e.g. Social Media Growth, Full Funnel" />
          </div>
        </div>
        <div className="form-field" style={{ marginTop: 20 }}>
          <label className="form-label">Software Scope Notes</label>
          <textarea
            className="fadaa-input"
            value={form.software_scope_notes}
            onChange={set('software_scope_notes')}
            rows={3}
            placeholder="Describe the software project scope, tech stack, features…"
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-field" style={{ marginTop: 20 }}>
          <label className="form-label">Notes</label>
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
          <div className="form-field" style={{ marginTop: 20 }}>
            <label className="form-label" style={{ color: '#F87171' }}>Lost Reason</label>
            <input className="fadaa-input" value={form.lost_reason} onChange={set('lost_reason')} placeholder="Why was this lead lost?" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" className="fadaa-btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="fadaa-btn" style={{ minWidth: 140, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving ? (
            <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</>
          ) : (
            mode === 'edit' ? 'Save Changes' : 'Create Lead'
          )}
        </button>
      </div>
    </form>
  )
}
