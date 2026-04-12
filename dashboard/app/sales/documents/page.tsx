'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'
import type { Document as Doc, Lead } from '@/lib/sales/types'
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS } from '@/lib/sales/types'

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft:    { bg: 'rgba(79,142,247,0.1)',   text: '#60A5FA' },
  sent:     { bg: 'rgba(245,158,11,0.1)',   text: '#FCD34D' },
  signed:   { bg: 'rgba(74,222,128,0.1)',   text: '#4ADE80' },
  rejected: { bg: 'rgba(239,68,68,0.1)',    text: '#F87171' },
  expired:  { bg: 'rgba(100,116,139,0.1)',  text: '#64748B' },
}

function UploadForm({ leadId: defaultLeadId, onSaved, onCancel }: { leadId?: string; onSaved: () => void; onCancel: () => void }) {
  const [leads, setLeads]     = useState<Lead[]>([])
  const [uploading, setUpl]   = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    lead_id: defaultLeadId ?? '',
    doc_type: 'quotation',
    version: 'v1',
    status: 'draft',
    notes: '',
  })
  const [file, setFile]       = useState<File | null>(null)

  useEffect(() => {
    if (!defaultLeadId) {
      fetch('/api/sales/leads?limit=200').then(r => r.json()).then(d => setLeads(d.leads ?? []))
    }
  }, [defaultLeadId])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file)       { setError('Please select a file'); return }
    if (!form.lead_id) { setError('Please select a lead'); return }
    setUpl(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    const res = await fetch('/api/sales/documents', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) { onSaved() }
    else { setError(data.error ?? 'Upload failed'); setUpl(false) }
  }

  const label = (l: string) => (
    <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{l}</label>
  )

  return (
    <div className="fadaa-card" style={{ padding: 28, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 16, marginBottom: 24 }}>⎗ Upload Document</h2>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#F87171', marginBottom: 20 }}>{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {!defaultLeadId && (
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
            {label('Document Type')}
            <select className="fadaa-input" value={form.doc_type} onChange={set('doc_type')}>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            {label('Status')}
            <select className="fadaa-input" value={form.status} onChange={set('status')}>
              {Object.entries(DOC_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            {label('Version')}
            <input className="fadaa-input" value={form.version} onChange={set('version')} placeholder="v1" />
          </div>
        </div>

        {/* File drop zone */}
        <div>
          {label('File *')}
          <label
            style={{
              display: 'block',
              border: `2px dashed ${file ? '#4F8EF7' : '#1E2D4A'}`,
              borderRadius: 10,
              padding: '24px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'rgba(79,142,247,0.05)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p style={{ color: '#4F8EF7', fontWeight: 600 }}>⎗ {file.name}</p>
                <p style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: '#64748B', fontSize: 14 }}>Drag & drop or click to upload</p>
                <p style={{ color: '#1E2D4A', fontSize: 12, marginTop: 4 }}>PDF, DOCX, XLSX, PNG, JPG (max 10MB)</p>
              </div>
            )}
          </label>
        </div>

        <div>
          {label('Notes')}
          <textarea className="fadaa-input" value={form.notes} onChange={set('notes')} rows={2} style={{ resize: 'vertical' }} placeholder="Optional notes about this document…" />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="fadaa-btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={uploading} className="fadaa-btn">{uploading ? 'Uploading…' : '↑ Upload'}</button>
        </div>
      </form>
    </div>
  )
}

function DocumentsContent() {
  const sp     = useSearchParams()
  const leadId = sp.get('leadId') ?? undefined

  const [docs,     setDocs]    = useState<Doc[]>([])
  const [loading,  setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatus] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const query = leadId ? `?leadId=${leadId}` : ''
    fetch(`/api/sales/documents${query}`)
      .then(r => r.json())
      .then(d => { setDocs(d.documents ?? []); setLoading(false) })
  }, [leadId])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    await fetch('/api/sales/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const filtered = statusFilter ? docs.filter(d => d.status === statusFilter) : docs

  if (showForm) {
    return (
      <SalesShell>
        <UploadForm leadId={leadId} onSaved={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      </SalesShell>
    )
  }

  return (
    <SalesShell>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>⎗ Documents</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{docs.length} documents stored</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="fadaa-input" style={{ maxWidth: 140 }} value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(DOC_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="fadaa-btn" onClick={() => setShowForm(true)}>↑ Upload</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="fadaa-card" style={{ height: 70 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fadaa-card" style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⎗</p>
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(d => {
            const sc = STATUS_COLOR[d.status] ?? STATUS_COLOR.draft
            return (
              <div key={d.id} className="fadaa-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(79,142,247,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: '#4F8EF7',
                }}>
                  {d.file_name.endsWith('.pdf') ? '⎗' : d.file_name.match(/\.(png|jpg|jpeg)$/) ? '🖼' : '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.file_name}
                  </p>
                  <p style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>
                    {DOC_TYPE_LABELS[d.doc_type]} · {d.version} · {d.lead?.company_name ?? '—'} · {new Date(d.upload_date).toLocaleDateString()}
                    {d.file_size_kb ? ` · ${d.file_size_kb}KB` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                  <select
                    value={d.status}
                    onChange={e => updateStatus(d.id, e.target.value)}
                    style={{
                      background: sc.bg, color: sc.text,
                      border: `1px solid ${sc.text}40`,
                      borderRadius: 999, padding: '4px 10px', fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {Object.entries(DOC_STATUS_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: '#131B2E', color: '#E2E8F0' }}>{l}</option>)}
                  </select>
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="fadaa-btn-ghost" style={{ fontSize: 12, padding: '5px 12px', textDecoration: 'none' }}>
                      ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SalesShell>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<SalesShell><div style={{ color: '#64748B', padding: 40 }}>Loading…</div></SalesShell>}>
      <DocumentsContent />
    </Suspense>
  )
}
