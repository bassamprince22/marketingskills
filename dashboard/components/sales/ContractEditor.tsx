'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Lead } from '@/lib/sales/types'

interface Props {
  lead:    Lead
  onClose: () => void
  onSaved?: () => void
}

type ViewState = 'loading' | 'no-template' | 'ready' | 'generating'

function humanLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function ContractEditor({ lead, onClose, onSaved }: Props) {
  const [view,         setView]         = useState<ViewState>('loading')
  const [fields,       setFields]       = useState<Record<string, string>>({})
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [html,         setHtml]         = useState('')
  const [loadErr,      setLoadErr]      = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [downloading,  setDownloading]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/sales/contracts/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ leadId: lead.id }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          if (d.error.includes('No contract template')) { setView('no-template'); return }
          setLoadErr(d.error); setView('ready'); return
        }
        setFields(d.fields ?? {})
        setPlaceholders(d.placeholders ?? [])
        setHtml(d.html ?? '')
        setView('ready')
      })
      .catch(() => { setLoadErr('Failed to load contract'); setView('ready') })
  }, [lead.id])

  const refreshPreview = useCallback((updatedFields: Record<string, string>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch('/api/sales/contracts/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields: updatedFields }),
      })
        .then(r => r.json())
        .then(d => { if (d.html) setHtml(d.html) })
        .catch(() => {})
    }, 500)
  }, [])

  function updateField(key: string, value: string) {
    const next = { ...fields, [key]: value }
    setFields(next)
    refreshPreview(next)
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/sales/contracts/download', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields, filename: lead.company_name }),
      })
      if (!res.ok) { alert('Download failed'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `contract_${lead.company_name.replace(/\s+/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleApprove() {
    setSaving(true)
    try {
      const res = await fetch('/api/sales/contracts/approve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leadId: lead.id, fields, filename: lead.company_name }),
      })
      const d = await res.json()
      if (!res.ok || !d.ok) { alert(d.error ?? 'Failed to save contract'); return }
      setSaved(true)
      onSaved?.()
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Contract — ${lead.company_name}</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 40px 60px; color: #000; font-size: 12pt; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 6px 10px; }
        @media print { body { margin: 20mm 25mm; } }
      </style>
    </head><body>${html}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <div className="contract-overlay">
      {/* Toolbar */}
      <div className="contract-toolbar">
        <div>
          <p className="contract-toolbar-title">📄 Contract Editor</p>
          <p className="contract-toolbar-sub">{lead.company_name}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {saved && <span className="contract-saved-badge">✓ Saved to Documents</span>}
          <button onClick={handlePrint} disabled={view !== 'ready'} className="contract-btn contract-btn-ghost">
            🖨 Print
          </button>
          <button onClick={handleDownload} disabled={downloading || view !== 'ready'} className="contract-btn contract-btn-download">
            {downloading ? '…' : '📥 Download .docx'}
          </button>
          <button
            onClick={handleApprove}
            disabled={saving || view !== 'ready'}
            className={`contract-btn contract-btn-approve${saving ? ' saving' : ''}`}
          >
            {saving ? '…' : '✓ Approve & Save'}
          </button>
          <button onClick={onClose} className="contract-btn contract-btn-close">✕ Close</button>
        </div>
      </div>

      {/* Body */}
      <div className="contract-body">
        {/* Left — field editor */}
        <div className="contract-sidebar">
          {view === 'loading' && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading fields…</p>
          )}
          {view === 'no-template' && (
            <div style={{ padding: '16px 0' }}>
              <p style={{ color: 'var(--brand-red-text)', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>No template uploaded</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
                Go to <strong style={{ color: 'var(--text-primary)' }}>Settings</strong> and upload your contract template (.docx) first.
              </p>
            </div>
          )}
          {view === 'ready' && loadErr && (
            <p style={{ color: 'var(--brand-red-text)', fontSize: 12, marginBottom: 12 }}>{loadErr}</p>
          )}
          {view === 'ready' && placeholders.length > 0 && (
            <>
              <p className="contract-fields-label">Contract Fields</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {placeholders.map(p => (
                  <div key={p}>
                    <label className="contract-field-label">{humanLabel(p)}</label>
                    <input
                      className="fadaa-input"
                      style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
                      value={fields[p] ?? ''}
                      onChange={e => updateField(p, e.target.value)}
                      placeholder={`{${p}}`}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right — document preview */}
        <div className="contract-preview">
          {view === 'loading' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generating preview…</p>
            </div>
          ) : view === 'no-template' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 40, marginBottom: 16 }}>📄</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No Template Yet</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Upload a .docx template in Settings to get started.</p>
              </div>
            </div>
          ) : (
            <div className="contract-doc">
              {html ? (
                <div dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p style={{ color: '#999', fontStyle: 'italic' }}>Preview will appear here…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
