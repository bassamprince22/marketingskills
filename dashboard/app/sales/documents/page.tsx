'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'
import type { Document as Doc, Lead } from '@/lib/sales/types'
import { DOC_STATUS_LABELS, DOC_TYPE_LABELS } from '@/lib/sales/types'

const DOC_ICON: Record<string, string> = {
  pdf: '[PDF]',
  doc: '[DOC]',
  docx: '[DOC]',
  xls: '[XLS]',
  xlsx: '[XLS]',
  png: '[IMG]',
  jpg: '[IMG]',
  jpeg: '[IMG]',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return DOC_ICON[ext] ?? '[FILE]'
}

function parseVersionScore(version: string) {
  const match = version.match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function groupDocuments(docs: Doc[]) {
  const grouped = new Map<string, { key: string; leadName: string; docType: string; current: Doc; history: Doc[] }>()

  for (const doc of docs) {
    const leadName = doc.lead?.company_name ?? 'Unknown lead'
    const key = `${doc.lead_id}:${doc.doc_type}`
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, { key, leadName, docType: doc.doc_type, current: doc, history: [] })
      continue
    }

    const currentScore = parseVersionScore(existing.current.version)
    const incomingScore = parseVersionScore(doc.version)
    const incomingIsNewer =
      incomingScore > currentScore ||
      (incomingScore === currentScore &&
        new Date(doc.upload_date).getTime() > new Date(existing.current.upload_date).getTime())

    if (incomingIsNewer) {
      existing.history.push(existing.current)
      existing.current = doc
    } else {
      existing.history.push(doc)
    }
  }

  return Array.from(grouped.values()).sort((left, right) => left.leadName.localeCompare(right.leadName))
}

function needsAttention(doc: Doc) {
  return ['draft', 'rejected', 'expired'].includes(doc.status)
}

function getSuggestedNextDoc(docType: string) {
  if (docType === 'quotation' || docType === 'proposal') return 'Contract'
  if (docType === 'contract') return 'Signed copy'
  return 'Proposal'
}

function UploadForm({
  leadId: defaultLeadId,
  onSaved,
  onCancel,
}: {
  leadId?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    lead_id: defaultLeadId ?? '',
    doc_type: 'quotation',
    version: 'v1',
    status: 'draft',
    notes: '',
  })

  useEffect(() => {
    if (defaultLeadId) return
    fetch('/api/sales/leads?limit=500')
      .then((response) => response.json())
      .then((payload) => setLeads(payload.leads ?? []))
  }, [defaultLeadId])

  const setField =
    (key: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }
    if (!form.lead_id) {
      setError('Please select a lead')
      return
    }

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    Object.entries(form).forEach(([key, value]) => formData.append(key, value))

    const response = await fetch('/api/sales/documents', { method: 'POST', body: formData })
    const payload = await response.json()
    if (response.ok) {
      onSaved()
      return
    }

    setError(payload.error ?? 'Upload failed')
    setUploading(false)
  }

  return (
    <div className="fadaa-card" style={{ padding: '28px 32px', maxWidth: 620, margin: '0 auto' }}>
      <div className="card-header" style={{ marginBottom: 24 }}>
        <h2 className="t-section-title">Upload Document</h2>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#F87171',
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {!defaultLeadId && (
          <div className="form-field">
            <label className="form-label">
              Lead <span style={{ color: '#F87171' }}>*</span>
            </label>
            <select className="fadaa-input" value={form.lead_id} onChange={setField('lead_id')} required>
              <option value="">Select a lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.company_name} - {lead.contact_person}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label">Document Type</label>
            <select className="fadaa-input" value={form.doc_type} onChange={setField('doc_type')}>
              {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="fadaa-input" value={form.status} onChange={setField('status')}>
              {Object.entries(DOC_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Version</label>
            <input className="fadaa-input" value={form.version} onChange={setField('version')} placeholder="v1" />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">
            File <span style={{ color: '#F87171' }}>*</span>
          </label>
          <label
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              setFile(event.dataTransfer.files?.[0] ?? null)
            }}
            style={{
              display: 'block',
              border: `2px dashed ${
                file ? 'var(--brand-primary)' : dragging ? 'var(--brand-secondary)' : 'var(--border-default)'
              }`,
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
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: 13 }}>{file.name}</p>
                <p className="t-caption" style={{ marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB - click to change
                </p>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Drag and drop or click to upload</p>
                <p className="t-caption" style={{ marginTop: 4 }}>
                  PDF, DOCX, XLSX, PNG, JPG - max 10 MB
                </p>
              </>
            )}
          </label>
        </div>

        <div className="form-field">
          <label className="form-label">Notes</label>
          <textarea
            className="fadaa-input"
            value={form.notes}
            onChange={setField('notes')}
            rows={2}
            style={{ resize: 'vertical' }}
            placeholder="Optional notes about this document"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button type="button" className="fadaa-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="fadaa-btn"
            style={{ minWidth: 120, justifyContent: 'center', display: 'flex', alignItems: 'center' }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DocumentsContent() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get('leadId') ?? undefined

  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const query = leadId ? `?leadId=${leadId}` : ''
    fetch(`/api/sales/documents${query}`)
      .then((response) => response.json())
      .then((payload) => {
        setDocs(payload.documents ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(id: string, status: string) {
    await fetch('/api/sales/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const filtered = statusFilter ? docs.filter((doc) => doc.status === statusFilter) : docs
  const groupedDocs = groupDocuments(filtered)

  if (showForm) {
    return (
      <SalesShell>
        <UploadForm
          leadId={leadId}
          onSaved={() => {
            setShowForm(false)
            load()
          }}
          onCancel={() => setShowForm(false)}
        />
      </SalesShell>
    )
  }

  return (
    <SalesShell>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Documents</h1>
          <p className="t-caption">
            {docs.length} file{docs.length !== 1 ? 's' : ''} stored - {groupedDocs.length} smart group
            {groupedDocs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="filter-bar">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            {Object.entries(DOC_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="fadaa-btn fadaa-btn-sm" onClick={() => setShowForm(true)}>
            Upload
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="fadaa-card skeleton" style={{ height: 72 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fadaa-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="empty-state-title">No documents yet</p>
            <p className="empty-state-desc">
              {statusFilter ? 'No documents match this status filter.' : 'Upload your first quotation or contract.'}
            </p>
            {statusFilter ? (
              <button className="fadaa-btn-ghost" onClick={() => setStatusFilter('')}>
                Clear Filter
              </button>
            ) : (
              <button className="fadaa-btn" onClick={() => setShowForm(true)}>
                Upload Document
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupedDocs.map((group) => {
            const current = group.current

            return (
              <div key={group.key} className="fadaa-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="t-card-title">{group.leadName}</p>
                    <p className="t-caption" style={{ marginTop: 4 }}>
                      {DOC_TYPE_LABELS[group.docType as keyof typeof DOC_TYPE_LABELS] ?? group.docType} - current version {current.version}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {needsAttention(current) && <span className={`badge badge-${current.status}`}>Needs attention</span>}
                    <span className="badge">Next likely: {getSuggestedNextDoc(current.doc_type)}</span>
                    {group.history.length > 0 && (
                      <span className="badge">
                        {group.history.length} older version{group.history.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, minWidth: 0, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        flexShrink: 0,
                        background: 'rgba(79,142,247,0.1)',
                        border: '1px solid rgba(79,142,247,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {fileIcon(current.file_name)}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p className="t-card-title t-truncate">{current.file_name}</p>
                      <p className="t-caption" style={{ marginTop: 3 }}>
                        {new Date(current.upload_date).toLocaleDateString()}
                        {current.file_size_kb ? ` - ${current.file_size_kb} KB` : ''}
                        {current.uploader?.name ? ` - uploaded by ${current.uploader.name}` : ''}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <select
                      value={current.status}
                      onChange={(event) => updateStatus(current.id, event.target.value)}
                      className={`badge badge-${current.status}`}
                      style={{ cursor: 'pointer', appearance: 'none', border: 'none', outline: 'none', paddingRight: 8 }}
                      aria-label="Update document status"
                    >
                      {Object.entries(DOC_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value} style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {current.file_url && (
                      <a
                        href={current.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="fadaa-btn-ghost fadaa-btn-sm"
                        style={{ textDecoration: 'none', fontSize: 12 }}
                        title="Open current document"
                      >
                        Open
                      </a>
                    )}
                  </div>
                </div>

                {current.notes && (
                  <div
                    style={{
                      borderRadius: 12,
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '10px 12px',
                    }}
                  >
                    <p className="t-caption" style={{ marginBottom: 4 }}>
                      Current notes
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{current.notes}</p>
                  </div>
                )}

                {group.history.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    <p className="t-caption" style={{ marginBottom: 10 }}>
                      Version history
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.history
                        .sort((left, right) => new Date(right.upload_date).getTime() - new Date(left.upload_date).getTime())
                        .map((historyDoc) => (
                          <div
                            key={historyDoc.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) auto',
                              gap: 12,
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <p className="t-card-title t-truncate" style={{ fontSize: 13 }}>
                                {historyDoc.file_name}
                              </p>
                              <p className="t-caption" style={{ marginTop: 2 }}>
                                {historyDoc.version} - {DOC_STATUS_LABELS[historyDoc.status]} -{' '}
                                {new Date(historyDoc.upload_date).toLocaleDateString()}
                              </p>
                            </div>
                            {historyDoc.file_url && (
                              <a
                                href={historyDoc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="fadaa-btn-ghost fadaa-btn-sm"
                                style={{ textDecoration: 'none', fontSize: 12 }}
                              >
                                Open
                              </a>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
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
    <Suspense fallback={<SalesShell><div className="t-caption" style={{ padding: 40 }}>Loading...</div></SalesShell>}>
      <DocumentsContent />
    </Suspense>
  )
}
