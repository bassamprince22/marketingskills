'use client'

import { useEffect, useState, useCallback } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import { StageBadge } from '@/components/sales/StageBadge'
import Link from 'next/link'
import type { Lead } from '@/lib/sales/types'
import { SERVICE_LABELS } from '@/lib/sales/types'

function QualificationModal({ leadId, onSaved, onClose }: { leadId: string; onSaved: () => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    need_score: 3, budget_confirmed: false, decision_maker: false,
    timeline: '', service_fit_score: 3, qualification_notes: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/sales/qualifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, ...form }),
    })
    if (res.ok) { onSaved(); onClose() }
    else setSaving(false)
  }

  const label = (l: string) => (
    <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{l}</label>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div className="fadaa-card" style={{ padding: 32, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 16 }}>✦ BANT Qualification</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Need Score */}
          <div>
            {label('Need Score (1-5)')}
            <p style={{ color: '#64748B', fontSize: 11, marginBottom: 8 }}>How strong is the prospect's need for your services?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, need_score: n }))}
                  style={{
                    width: 40, height: 40, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: form.need_score >= n ? 'rgba(79,142,247,0.2)' : '#0F1629',
                    border: `1px solid ${form.need_score >= n ? '#4F8EF7' : '#1E2D4A'}`,
                    color: form.need_score >= n ? '#4F8EF7' : '#64748B',
                  }}
                >{n}</button>
              ))}
            </div>
          </div>

          {/* Service Fit */}
          <div>
            {label('Service Fit Score (1-5)')}
            <p style={{ color: '#64748B', fontSize: 11, marginBottom: 8 }}>How well do your services fit their requirements?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, service_fit_score: n }))}
                  style={{
                    width: 40, height: 40, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: form.service_fit_score >= n ? 'rgba(124,58,237,0.2)' : '#0F1629',
                    border: `1px solid ${form.service_fit_score >= n ? '#7C3AED' : '#1E2D4A'}`,
                    color: form.service_fit_score >= n ? '#A78BFA' : '#64748B',
                  }}
                >{n}</button>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 8, border: '1px solid #1E2D4A', background: form.budget_confirmed ? 'rgba(74,222,128,0.08)' : 'transparent' }}>
              <input
                type="checkbox"
                checked={form.budget_confirmed}
                onChange={e => setForm(f => ({ ...f, budget_confirmed: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: '#4ADE80' }}
              />
              <div>
                <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>Budget Confirmed</p>
                <p style={{ color: '#64748B', fontSize: 11 }}>They have the funds</p>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 8, border: '1px solid #1E2D4A', background: form.decision_maker ? 'rgba(74,222,128,0.08)' : 'transparent' }}>
              <input
                type="checkbox"
                checked={form.decision_maker}
                onChange={e => setForm(f => ({ ...f, decision_maker: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: '#4ADE80' }}
              />
              <div>
                <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>Decision Maker</p>
                <p style={{ color: '#64748B', fontSize: 11 }}>Speaking to the right person</p>
              </div>
            </label>
          </div>

          <div>
            {label('Timeline')}
            <input className="fadaa-input" value={form.timeline} onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))} placeholder="e.g. Q2 2026, ASAP, 3 months" />
          </div>

          <div>
            {label('Qualification Notes')}
            <textarea className="fadaa-input" value={form.qualification_notes} onChange={e => setForm(f => ({ ...f, qualification_notes: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="Any notes about this qualification…" />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="fadaa-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="fadaa-btn">{saving ? 'Saving…' : '✦ Qualify Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function QualifiedPage() {
  const [leads,       setLeads]   = useState<Lead[]>([])
  const [allLeads,    setAllLeads] = useState<Lead[]>([])
  const [loading,     setLoading] = useState(true)
  const [qualifying,  setQual]    = useState<string | null>(null)
  const [filterSvc,   setFilterSvc] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/sales/qualifications' + (filterSvc ? `?serviceType=${filterSvc}` : '')).then(r => r.json()),
      fetch('/api/sales/leads?limit=200').then(r => r.json()),
    ]).then(([q, l]) => {
      setLeads(q.leads ?? [])
      setAllLeads((l.leads ?? []).filter((ld: Lead) => !ld.is_qualified))
      setLoading(false)
    })
  }, [filterSvc])

  useEffect(() => { load() }, [load])

  return (
    <SalesShell>
      {qualifying && (
        <QualificationModal leadId={qualifying} onSaved={load} onClose={() => setQual(null)} />
      )}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>✦ Qualified Leads</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{leads.length} qualified · {allLeads.length} ready to qualify</p>
        </div>
        <select className="fadaa-input" style={{ maxWidth: 160 }} value={filterSvc} onChange={e => setFilterSvc(e.target.value)}>
          <option value="">All Services</option>
          <option value="marketing">Marketing</option>
          <option value="software">Software</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Leads ready to qualify */}
      {allLeads.length > 0 && (
        <div className="fadaa-card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ color: '#FCD34D', fontSize: 13, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            ⟿ Awaiting Qualification ({allLeads.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allLeads.slice(0, 8).map(lead => (
              <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1E2D4A20' }}>
                <div>
                  <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 500 }}>{lead.company_name}</p>
                  <p style={{ color: '#64748B', fontSize: 11 }}>{lead.contact_person} · {SERVICE_LABELS[lead.service_type]}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <StageBadge stage={lead.pipeline_stage} size="sm" />
                  <button className="fadaa-btn" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => setQual(lead.id)}>
                    Qualify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Qualified leads */}
      <h2 style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>✦ Qualified ({leads.length})</h2>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {[1,2,3].map(i => <div key={i} className="fadaa-card" style={{ height: 100 }} />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="fadaa-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
          No qualified leads yet. Use the qualify button above to start.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
          {leads.map(lead => (
            <Link key={lead.id} href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
              <div className="fadaa-card" style={{ padding: 20, borderLeft: '3px solid #34D399' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14 }}>{lead.company_name}</p>
                    <p style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>{lead.contact_person}</p>
                  </div>
                  <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', fontSize: 11, padding: '3px 10px', borderRadius: 999 }}>✦ Qualified</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <span className={`service-${lead.service_type}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>
                    {SERVICE_LABELS[lead.service_type]}
                  </span>
                  {lead.estimated_value && (
                    <span style={{ color: '#4ADE80', fontSize: 12, fontWeight: 600 }}>
                      ${(lead.estimated_value / 1000).toFixed(1)}k
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SalesShell>
  )
}
