'use client'

import { useEffect, useState, useRef } from 'react'
import type { Lead } from '@/lib/sales/types'
import { SERVICE_LABELS } from '@/lib/sales/types'

interface Props {
  lead: Lead
  onClose: () => void
}

type View = 'loading' | 'no-template' | 'uploading' | 'form' | 'generating'

// ── Smart field mapping ───────────────────────────────────────────────────────
// Normalise a placeholder name then map to a lead field value
function smartValue(placeholder: string, lead: Lead): string {
  const p = placeholder.toLowerCase().replace(/[\s_\-]+/g, '')

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const map: Record<string, string | null | undefined> = {
    // Client identity
    clientname:     lead.contact_person,
    contactperson:  lead.contact_person,
    contactname:    lead.contact_person,
    name:           lead.contact_person,
    fullname:       lead.contact_person,
    client:         lead.contact_person,

    // Company
    company:        lead.company_name,
    companyname:    lead.company_name,
    clientcompany:  lead.company_name,
    businessname:   lead.company_name,
    organization:   lead.company_name,

    // Contact
    phone:          lead.phone,
    mobile:         lead.phone,
    telephone:      lead.phone,
    phonenumber:    lead.phone,
    email:          lead.email,
    emailaddress:   lead.email,

    // Service
    service:        SERVICE_LABELS[lead.service_type] ?? lead.service_type,
    servicetype:    SERVICE_LABELS[lead.service_type] ?? lead.service_type,
    services:       SERVICE_LABELS[lead.service_type] ?? lead.service_type,
    package:        lead.marketing_package ?? SERVICE_LABELS[lead.service_type],
    marketingpackage: lead.marketing_package,

    // Financial
    price:          lead.estimated_value != null ? String(lead.estimated_value) : lead.budget_range,
    amount:         lead.estimated_value != null ? String(lead.estimated_value) : lead.budget_range,
    value:          lead.estimated_value != null ? String(lead.estimated_value) : lead.budget_range,
    totalamount:    lead.estimated_value != null ? String(lead.estimated_value) : lead.budget_range,
    contractvalue:  lead.estimated_value != null ? String(lead.estimated_value) : lead.budget_range,
    budget:         lead.budget_range,

    // Deal
    dealtype:       lead.deal_type === 'retainer' ? 'Monthly Retainer' : lead.deal_type === 'one_time' ? 'One-time Project' : '',
    contracttype:   lead.deal_type === 'retainer' ? 'Monthly Retainer' : lead.deal_type === 'one_time' ? 'One-time Project' : '',

    // Dates
    date:           today,
    contractdate:   today,
    today:          today,
    startdate:      today,
    signdate:       today,
    agreementdate:  today,
    closedate:      lead.expected_close_date ?? today,
    expectedclose:  lead.expected_close_date ?? '',

    // Scope
    notes:          lead.notes,
    scope:          lead.software_scope_notes ?? lead.notes,
    scopenotes:     lead.software_scope_notes,
    projectscope:   lead.software_scope_notes,
  }

  return map[p] ?? ''
}

// Whether a field was auto-mapped (has a value from smart mapping)
function wasAutoMapped(placeholder: string, lead: Lead): boolean {
  return smartValue(placeholder, lead) !== ''
}

// Human-readable label from placeholder name
function labelFor(p: string) {
  return p.replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ContractModal({ lead, onClose }: Props) {
  const [view,         setView]         = useState<View>('loading')
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [fields,       setFields]       = useState<Record<string, string>>({})
  const [error,        setError]        = useState('')
  const [uploadError,  setUploadError]  = useState('')
  const fileInputRef   = useRef<HTMLInputElement>(null)

  // Load template & placeholders on open
  useEffect(() => {
    fetch('/api/sales/contracts/template')
      .then(r => r.json())
      .then(d => {
        if (!d.hasTemplate) { setView('no-template'); return }
        initForm(d.placeholders)
      })
      .catch(() => setView('no-template'))
  }, [lead])

  function initForm(tags: string[]) {
    const initial: Record<string, string> = {}
    for (const t of tags) initial[t] = smartValue(t, lead)
    setPlaceholders(tags)
    setFields(initial)
    setView('form')
  }

  async function handleTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setView('uploading')
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    const res  = await fetch('/api/sales/contracts/template', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setUploadError(data.error ?? 'Upload failed'); setView('no-template'); return }
    initForm(data.placeholders)
  }

  async function generate() {
    setView('generating')
    setError('')
    try {
      const filename = `Contract_${lead.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`
      const res = await fetch('/api/sales/contracts/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields, filename }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Generation failed')
        setView('form')
        return
      }
      // Trigger browser download
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename + '.docx'
      a.click()
      URL.revokeObjectURL(url)
      setView('form')
    } catch {
      setError('Request failed')
      setView('form')
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields(f => ({ ...f, [k]: e.target.value }))

  // Overlay + modal wrapper
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 14,
        width: '100%', maxWidth: 640, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 60px rgba(79,142,247,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #1E2D4A', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 700 }}>📄 Generate Contract</h2>
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>{lead.company_name} · {lead.contact_person}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Loading */}
          {view === 'loading' && (
            <p style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: 40 }}>Loading template…</p>
          )}

          {/* Uploading */}
          {view === 'uploading' && (
            <p style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: 40 }}>Uploading template…</p>
          )}

          {/* No template */}
          {view === 'no-template' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📂</p>
              <p style={{ color: '#E2E8F0', fontWeight: 600, marginBottom: 8 }}>No contract template uploaded yet</p>
              <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                Upload your .docx template once. Use <code style={{ color: '#60A5FA', background: 'rgba(79,142,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{'{placeholder}'}</code> syntax for fields (e.g. <code style={{ color: '#60A5FA', background: 'rgba(79,142,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{'{client_name}'}</code>, <code style={{ color: '#60A5FA', background: 'rgba(79,142,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{'{price}'}</code>).
              </p>
              {uploadError && (
                <p style={{ color: '#F87171', fontSize: 13, marginBottom: 14 }}>✕ {uploadError}</p>
              )}
              <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleTemplateUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="fadaa-btn"
                style={{ fontSize: 13 }}
              >
                ↑ Upload .docx Template
              </button>
            </div>
          )}

          {/* Form */}
          {(view === 'form' || view === 'generating') && (
            <div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                  <span style={{ color: '#64748B', fontSize: 12 }}>Auto-filled from lead</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                  <span style={{ color: '#64748B', fontSize: 12 }}>Needs manual input</span>
                </div>
              </div>

              {placeholders.length === 0 ? (
                <div style={{ padding: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ color: '#FCD34D', fontSize: 13 }}>⚠ No placeholders detected in the template.</p>
                  <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 6 }}>Make sure your .docx uses <code style={{ color: '#60A5FA' }}>{'{placeholder}'}</code> syntax. The contract will still generate with no substitutions.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {placeholders.map(p => {
                    const auto  = wasAutoMapped(p, lead)
                    const isLong = (fields[p] ?? '').length > 80 || p.toLowerCase().includes('note') || p.toLowerCase().includes('scope')
                    return (
                      <div key={p}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                            background: auto ? '#4ADE80' : '#F59E0B',
                          }} />
                          <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            {labelFor(p)}
                          </label>
                          <code style={{ color: '#475569', fontSize: 10 }}>{'{' + p + '}'}</code>
                        </div>
                        {isLong ? (
                          <textarea
                            value={fields[p] ?? ''}
                            onChange={set(p)}
                            rows={3}
                            className="fadaa-input"
                            style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={fields[p] ?? ''}
                            onChange={set(p)}
                            className="fadaa-input"
                            style={{ width: '100%', fontSize: 13 }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {error && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                  <p style={{ color: '#F87171', fontSize: 13 }}>✕ {error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(view === 'form' || view === 'generating') && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #1E2D4A', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleTemplateUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748B', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
              >
                ↑ Replace Template
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} className="fadaa-btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
              <button
                onClick={generate}
                disabled={view === 'generating'}
                className="fadaa-btn"
                style={{ fontSize: 13, minWidth: 160 }}
              >
                {view === 'generating' ? '⟳ Generating…' : '⬇ Generate & Download'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
