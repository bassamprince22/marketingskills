'use client'

import { useEffect, useRef, useState } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'

function Flash({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  if (!msg) return null
  return (
    <span style={{
      fontSize: 12, fontWeight: 500,
      color: type === 'ok' ? '#4ADE80' : '#F87171',
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      {type === 'ok' ? '✓' : '⚠'} {msg}
    </span>
  )
}

function ContractTemplateCard() {
  const [status,    setStatus]    = useState<'loading' | 'ready'>('loading')
  const [hasTemplate, setHas]     = useState(false)
  const [placeholders, setPh]     = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [msg,       setMsg]       = useState('')
  const [msgType,   setMsgType]   = useState<'ok' | 'err'>('ok')
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    fetch('/api/sales/contracts/template')
      .then(r => r.json())
      .then(d => { setHas(d.hasTemplate); setPh(d.placeholders ?? []); setStatus('ready') })
      .catch(() => setStatus('ready'))
  }
  useEffect(() => { load() }, [])

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  async function handleUpload(file: File) {
    if (!file.name.endsWith('.docx')) { flash('Only .docx files supported', 'err'); return }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/sales/contracts/template', { method: 'POST', body: form })
    const d   = await res.json()
    setUploading(false)
    if (!res.ok || !d.ok) { flash(d.error ?? 'Upload failed', 'err'); return }
    setHas(true)
    setPh(d.placeholders ?? [])
    flash(`Template uploaded — ${d.placeholders?.length ?? 0} placeholder${d.placeholders?.length !== 1 ? 's' : ''} detected`, 'ok')
  }

  async function handleDelete() {
    if (!confirm('Remove the current contract template?')) return
    await fetch('/api/sales/contracts/template', { method: 'DELETE' })
    setHas(false); setPh([])
    flash('Template removed', 'ok')
  }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <input
        ref={fileRef} type="file" accept=".docx" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
      />

      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h3 className="t-section-title">Contract Template</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>
            {hasTemplate
              ? 'Template is active — contracts generate from this file.'
              : 'Upload a .docx to enable contract generation.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Flash msg={msg} type={msgType} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="fadaa-btn fadaa-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {uploading
              ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Uploading…</>
              : hasTemplate ? '↺ Replace' : '↑ Upload'}
          </button>
          {hasTemplate && (
            <button
              onClick={handleDelete}
              className="fadaa-btn-danger fadaa-btn-sm"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {!hasTemplate && status === 'ready' && (
        <div style={{
          padding: '14px 18px', borderRadius: 10,
          background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)',
          marginBottom: 4,
        }}>
          <p className="t-body" style={{ lineHeight: 1.8 }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>How it works</span><br />
            1. Create your contract in Word (.docx)<br />
            2. Add placeholders like{' '}
            {['{company_name}', '{contact_person}', '{value}', '{date}'].map(p => (
              <code key={p} style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: 4, margin: '0 3px', fontSize: 11 }}>{p}</code>
            ))}<br />
            3. Upload here — lead data fills in automatically when generating
          </p>
        </div>
      )}

      {hasTemplate && placeholders.length > 0 && (
        <div>
          <p className="t-label" style={{ marginBottom: 10 }}>Detected Placeholders ({placeholders.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', marginBottom: 12 }}>
            {placeholders.map(p => (
              <code
                key={p}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(79,142,247,0.1)', color: '#60A5FA', border: '1px solid rgba(79,142,247,0.2)' }}
              >
                {'{' + p + '}'}
              </code>
            ))}
          </div>
          <p className="t-caption">
            These are automatically filled from lead data when you click "Generate Contract" on any lead.
          </p>
        </div>
      )}

      {hasTemplate && placeholders.length === 0 && status === 'ready' && (
        <p className="t-caption" style={{ color: '#F59E0B' }}>
          No placeholders detected. Make sure your template uses <code style={{ color: '#FCD34D' }}>{'{placeholder_name}'}</code> syntax.
        </p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <SalesShell>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-left">
          <h1 className="t-page-title">Settings</h1>
          <p className="t-caption">Lead assignment rules and system preferences</p>
        </div>
      </div>

      <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <AutoAssignCard />
        <ContractTemplateCard />
      </div>
    </SalesShell>
  )
}
