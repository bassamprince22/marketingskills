'use client'

import { useEffect, useState, useCallback } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import { StageBadge } from '@/components/sales/StageBadge'
import Link from 'next/link'
import type { Lead } from '@/lib/sales/types'
import { SERVICE_LABELS } from '@/lib/sales/types'

function ScoreButton({ value, active, color, onClick }: { value: number; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 38, height: 38, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        background: active ? `${color}22` : 'var(--surface-base)',
        border: `1px solid ${active ? color : 'var(--border-subtle)'}`,
        color: active ? color : 'var(--text-muted)',
        transition: 'all 0.15s',
      }}
    >
      {value}
    </button>
  )
}

function CheckBox({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      padding: '12px 14px', borderRadius: 10,
      border: `1px solid ${checked ? 'rgba(74,222,128,0.3)' : 'var(--border-subtle)'}`,
      background: checked ? 'rgba(74,222,128,0.06)' : 'transparent',
      transition: 'all 0.15s',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: '#4ADE80' }}
      />
      <div>
        <p className="t-card-title">{label}</p>
        <p className="t-caption" style={{ marginTop: 2 }}>{desc}</p>
      </div>
    </label>
  )
}

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

  return (
    <div className="fadaa-overlay">
      <div className="fadaa-modal" style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 className="t-section-title">✦ BANT Qualification</h2>
            <p className="t-caption" style={{ marginTop: 3 }}>Score this lead across key qualification criteria</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Need Score */}
          <div className="form-field">
            <label className="form-label">Need Score (1–5)</label>
            <p className="t-caption" style={{ marginBottom: 8 }}>How strong is the prospect's need for your services?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <ScoreButton key={n} value={n} active={form.need_score >= n} color="var(--brand-primary)" onClick={() => setForm(f => ({ ...f, need_score: n }))} />
              ))}
            </div>
          </div>

          {/* Service Fit */}
          <div className="form-field">
            <label className="form-label">Service Fit Score (1–5)</label>
            <p className="t-caption" style={{ marginBottom: 8 }}>How well do your services match their requirements?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <ScoreButton key={n} value={n} active={form.service_fit_score >= n} color="var(--brand-secondary)" onClick={() => setForm(f => ({ ...f, service_fit_score: n }))} />
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <CheckBox checked={form.budget_confirmed} onChange={v => setForm(f => ({ ...f, budget_confirmed: v }))} label="Budget Confirmed" desc="They have the funds" />
            <CheckBox checked={form.decision_maker}   onChange={v => setForm(f => ({ ...f, decision_maker: v }))}   label="Decision Maker"   desc="Speaking to the right person" />
          </div>

          <div className="form-field">
            <label className="form-label">Timeline</label>
            <input className="fadaa-input" value={form.timeline} onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))} placeholder="e.g. Q2 2026, ASAP, 3 months" />
          </div>

          <div className="form-field">
            <label className="form-label">Qualification Notes</label>
            <textarea className="fadaa-input" value={form.qualification_notes} onChange={e => setForm(f => ({ ...f, qualification_notes: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="Any notes about this qualification…" />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="fadaa-btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="fadaa-btn"
              style={{ minWidth: 140, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {saving ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</> : '✦ Qualify Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function QualifiedPage() {
  const [leads,      setLeads]   = useState<Lead[]>([])
  const [allLeads,   setAllLeads] = useState<Lead[]>([])
  const [loading,    setLoading] = useState(true)
  const [qualifying, setQual]    = useState<string | null>(null)
  const [filterSvc,  setFilterSvc] = useState('')

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

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Qualified Leads</h1>
          <p className="t-caption">{leads.length} qualified · {allLeads.length} ready to qualify</p>
        </div>
        <div className="filter-bar">
          <select className="filter-select" value={filterSvc} onChange={e => setFilterSvc(e.target.value)} aria-label="Filter by service">
            <option value="">All Services</option>
            <option value="marketing">Marketing</option>
            <option value="software">Software</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      {/* Awaiting qualification */}
      {allLeads.length > 0 && (
        <div className="fadaa-card" style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h3 className="t-label" style={{ color: '#FCD34D' }}>⟿ Awaiting Qualification</h3>
            <span className="badge badge-amber">{allLeads.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allLeads.slice(0, 8).map((lead, i) => (
              <div
                key={lead.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 4px',
                  borderBottom: i < Math.min(allLeads.length, 8) - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div>
                  <p className="t-card-title">{lead.company_name}</p>
                  <p className="t-caption" style={{ marginTop: 2 }}>{lead.contact_person} · {SERVICE_LABELS[lead.service_type]}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <StageBadge stage={lead.pipeline_stage} size="sm" />
                  <button className="fadaa-btn fadaa-btn-sm" onClick={() => setQual(lead.id)}>
                    Qualify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Qualified leads grid */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 className="t-section-title">✦ Qualified</h2>
        <span className="badge badge-green">{leads.length}</span>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="fadaa-card skeleton" style={{ height: 110 }} />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="fadaa-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <p className="empty-state-title">No qualified leads yet</p>
            <p className="empty-state-desc">Use the Qualify button above to BANT-qualify your leads.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
          {leads.map(lead => (
            <Link key={lead.id} href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
              <div
                className="fadaa-card"
                style={{ padding: 20, borderLeft: '3px solid #34D399', transition: 'transform 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = '' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p className="t-card-title">{lead.company_name}</p>
                    <p className="t-caption" style={{ marginTop: 3 }}>{lead.contact_person}</p>
                  </div>
                  <span className="badge badge-green">✦ Qualified</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`badge service-${lead.service_type}`}>{SERVICE_LABELS[lead.service_type]}</span>
                  {lead.estimated_value && (
                    <span className="t-mono" style={{ color: '#4ADE80', fontSize: 12, fontWeight: 600 }}>
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
