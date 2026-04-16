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

const BTN: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
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
  const previewRef = useRef<HTMLIFrameElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial load — auto-map fields from lead
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

  // Re-fetch preview when fields change (debounced)
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

  const filename = `contract_${lead.company_name.replace(/\s+/g, '_')}`

  return (
    <>
      {/* Print-specific global style */}
      <style>{`@media print { body > * { display: none !important; } }`}</style>

      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.85)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>

        {/* ── Toolbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', background: '#0F1629',
          borderBottom: '1px solid #1E2D4A', flexShrink: 0, gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 15 }}>📄 Contract Editor</p>
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{lead.company_name}</p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {saved && (
              <span style={{ color: '#4ADE80', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                ✓ Saved to Documents
              </span>
            )}
            <button onClick={handlePrint} disabled={view !== 'ready'} style={{ ...BTN, background: '#1E2D4A', color: '#E2E8F0' }}>
              🖨 Print
            </button>
            <button onClick={handleDownload} disabled={downloading || view !== 'ready'} style={{ ...BTN, background: '#1E3A5F', color: '#60A5FA' }}>
              {downloading ? '…' : '📥 Download .docx'}
            </button>
            <button onClick={handleApprove} disabled={saving || view !== 'ready'} style={{ ...BTN, background: saving ? '#1E4A30' : '#166534', color: '#4ADE80' }}>
              {saving ? '…' : '✓ Approve & Save'}
            </button>
            <button onClick={onClose} style={{ ...BTN, background: 'transparent', color: '#64748B', border: '1px solid #1E2D4A' }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left — field editor */}
          <div style={{
            width: 300, flexShrink: 0, overflowY: 'auto',
            background: '#0F1629', borderRight: '1px solid #1E2D4A',
            padding: '16px 14px',
          }}>
            {view === 'loading' && (
              <p style={{ color: '#64748B', fontSize: 13 }}>Loading fields…</p>
            )}
            {view === 'no-template' && (
              <div style={{ padding: '16px 0' }}>
                <p style={{ color: '#F87171', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>No template uploaded</p>
                <p style={{ color: '#64748B', fontSize: 12, lineHeight: 1.6 }}>
                  Go to <strong style={{ color: '#E2E8F0' }}>Settings</strong> and upload your contract template (.docx) first.
                </p>
              </div>
            )}
            {view === 'ready' && loadErr && (
              <p style={{ color: '#F87171', fontSize: 12, marginBottom: 12 }}>{loadErr}</p>
            )}
            {view === 'ready' && placeholders.length > 0 && (
              <>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                  Contract Fields
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {placeholders.map(p => (
                    <div key={p}>
                      <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        {humanLabel(p)}
                      </label>
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
          <div style={{ flex: 1, overflowY: 'auto', background: '#1a1a2e', padding: '32px 24px', display: 'flex', justifyContent: 'center' }}>
            {view === 'loading' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <p style={{ color: '#64748B', fontSize: 14 }}>Generating preview…</p>
              </div>
            ) : view === 'no-template' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ fontSize: 40, marginBottom: 16 }}>📄</p>
                  <p style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No Template Yet</p>
                  <p style={{ color: '#64748B', fontSize: 13 }}>Upload a .docx template in Settings to get started.</p>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#fff', color: '#000',
                width: '100%', maxWidth: 820,
                minHeight: 1000,
                padding: '60px 72px',
                borderRadius: 4,
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                fontFamily: 'serif',
                fontSize: '12pt',
                lineHeight: 1.7,
              }}>
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
    </>
  )
}
