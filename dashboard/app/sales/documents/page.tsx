'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'
import type { Document as Doc, Lead } from '@/lib/sales/types'
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS } from '@/lib/sales/types'

const DOC_ICON: Record<string, string> = { pdf: '⎗', doc: '📄', docx: '📄', xls: '📊', xlsx: '📊', png: '🖼', jpg: '🖼', jpeg: '🖼' }

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return DOC_ICON[ext] ?? '📄'
}

function UploadForm({ leadId: defaultLeadId, onSaved, onCancel }: { leadId?: string; onSaved: () => void; onCancel: () => void }) {
  const [leads, setLeads]   = useState<Lead[]>([])
  const [uploading, setUpl] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm]     = useState({ lead_id: defaultLeadId ?? '', doc_type: 'quotation', version: 'v1', status: 'draft', notes: '' })
  const [file, setFile]     = useState<File | null>(null)
  const [dragging, setDrag] = useState(false)

  useEffect(() => {
    if (!defaultLeadId) {
      fetch('/api/sales/leads?limit=200').then(r => r.json()).then(d => setLeads(d.leads ?? []))
    }
  }, [defaultLeadId])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file)        { setError('Please select a file'); return }
    if (!form.lead_id) { setError('Please select a lead'); return }
    setUpl(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    const res  = await fetch('/api/sales/documents', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) { onSaved() }
    else { setError(data.error ?? 'Upload failed'); setUpl(false) }
  }

  return (
    <div className="fadaa-card" style={{ padding: '28px 32px', maxWidth: 620, margin: '0 auto' }}>
      <div className="card-header" style={{ marginBottom: 24 }}>
        <h2 className="t-section-title">⎗ Upload Document</h2>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
          borderRadius: 10, padding: '10px 14px', color: '#F87171',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        }}>
          <span>⚠</span> {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {!defaultLeadId && (
          <div className="form-field">
            <label className="form-label">Lead <span style={{ color: '#F87171' }}>*</span></label>
            <select className="fadaa-input" value={form.lead_id} onChange={set('lead_id')} required>
              <option value="">— Select a lead —</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.company_name} · {l.contact_person}</option>)}
            </select>
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label">Document Type</label>
            <select className="fadaa-input" value={form.doc_type} onChange={set('doc_type')}>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="fadaa-input" value={form.status} onChange={set('status')}>
              {Object.entries(DOC_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Version</label>
            <input className="fadaa-input" value={form.version} onChange={set('version')} placeholder="v1" />
          </div>
        </div>

        {/* Drop zone */}
        <div className="form-field">
          <label className="form-label">File <span style={{ color: '#F87171' }}>*</span></label>
          <label
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files?.[0] ?? null) }}
            style={{
              display: 'block',
              border: `2px dashed ${file ? 'var(--brand-primary)' : dragging ? 'var(--brand-secondary)' : 'var(--border-default)'}`,
              borderRadius: 12,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'rgba(79,142,247,0.05)' : dragging ? 'rgba(124,58,237,0.05)' : 'transparent',
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
              <>
                <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: 13 }}>⎗ {file.name}</p>
                <p className="t-caption" style={{ marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Drag & drop or click to upload</p>
                <p className="t-caption" style={{ marginTop: 4 }}>PDF, DOCX, XLSX, PNG, JPG · max 10 MB</p>
              </>
            )}
          </label>
        </div>

        <div className="form-field">
          <label className="form-label">Notes</label>
          <textarea className="fadaa-input" value={form.notes} onChange={set('notes')} rows={2} style={{ resize: 'vertical' }} placeholder="Optional notes about this document…" />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button type="button" className="fadaa-btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={uploading} className="fadaa-btn" style={{ minWidth: 120, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
            {uploading ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Uploading…</> : '↑ Upload'}
          </button>
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
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Documents</h1>
          <p className="t-caption">
            {docs.length} document{docs.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <div className="filter-bar">
          <select className="filter-select" value={statusFilter} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All Status</option>
            {Object.entries(DOC_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="fadaa-btn fadaa-btn-sm" onClick={() => setShowForm(true)}>↑ Upload</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fadaa-card skeleton" style={{ height: 72 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fadaa-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="empty-state-title">No documents yet</p>
            <p className="empty-state-desc">
              {statusFilter ? 'No documents match this status filter.' : 'Upload your first quotation or contract.'}
            </p>
            {statusFilter
              ? <button className="fadaa-btn-ghost" onClick={() => setStatus('')}>Clear Filter</button>
              : <button className="fadaa-btn" onClick={() => setShowForm(true)}>↑ Upload Document</button>
            }
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => (
            <div
              key={d.id}
              className="fadaa-card"
              style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = '' }}
            >
              {/* File icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: 'var(--brand-primary)',
              }}>
                {fileIcon(d.file_name)}
              </div>

              {/* File info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="t-card-title t-truncate">{d.file_name}</p>
                <p className="t-caption" style={{ marginTop: 3 }}>
                  {DOC_TYPE_LABELS[d.doc_type]} · {d.version}
                  {d.lead?.company_name ? ` · ${d.lead.company_name}` : ''}
                  {' · '}{new Date(d.upload_date).toLocaleDateString()}
                  {d.file_size_kb ? ` · ${d.file_size_kb} KB` : ''}
                </p>
              </div>

              {/* Status + download */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                <select
                  value={d.status}
                  onChange={e => updateStatus(d.id, e.target.value)}
                  className={`badge badge-${d.status}`}
                  style={{ cursor: 'pointer', appearance: 'none', border: 'none', outline: 'none', paddingRight: 8 }}
                  aria-label="Update document status"
                >
                  {Object.entries(DOC_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v} style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }}>{l}</option>
                  ))}
                </select>
                {d.file_url && (
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="fadaa-btn-ghost fadaa-btn-sm"
                    style={{ textDecoration: 'none', fontSize: 12 }}
                    title="Download / Open"
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SalesShell>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<SalesShell><div className="t-caption" style={{ padding: 40 }}>Loading…</div></SalesShell>}>
      <DocumentsContent />
    </Suspense>
  )
}
