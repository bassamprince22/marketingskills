'use client'

import { useEffect, useRef, useState } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'

function ContractTemplateCard() {
  const [status, setStatus]     = useState<'loading' | 'ready'>('loading')
  const [hasTemplate, setHas]   = useState(false)
  const [placeholders, setPh]   = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok' | 'err'>('ok')
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    fetch('/api/sales/contracts/template')
      .then(r => r.json())
      .then(d => { setHas(d.hasTemplate); setPh(d.placeholders ?? []); setStatus('ready') })
      .catch(() => setStatus('ready'))
  }
  useEffect(() => { load() }, [])

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

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  return (
    <div className="fadaa-card" style={{ padding: 24 }}>
      <input
        ref={fileRef} type="file" accept=".docx" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700 }}>📄 Contract Template</h3>
          <p style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>
            {hasTemplate
              ? 'Template is active — contracts generate from this file.'
              : 'No template uploaded — upload a .docx to enable contract generation.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && (
            <span style={{ fontSize: 12, color: msgType === 'ok' ? '#4ADE80' : '#F87171' }}>{msg}</span>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="fadaa-btn"
            style={{ fontSize: 12 }}
          >
            {uploading ? '…' : hasTemplate ? '↺ Replace Template' : '↑ Upload Template'}
          </button>
          {hasTemplate && (
            <button
              onClick={handleDelete}
              style={{ fontSize: 12, color: '#F87171', background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* How to use */}
      {!hasTemplate && status === 'ready' && (
        <div style={{ padding: '14px 16px', background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 8, marginBottom: 16 }}>
          <p style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.7 }}>
            <strong style={{ color: '#E2E8F0' }}>How it works:</strong><br />
            1. Create your contract in Word (.docx)<br />
            2. Add placeholders like <code style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: 4 }}>{'{company_name}'}</code>, <code style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: 4 }}>{'{contact_person}'}</code>, <code style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: 4 }}>{'{value}'}</code>, <code style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: 4 }}>{'{date}'}</code><br />
            3. Upload here — lead data fills in automatically on generation
          </p>
        </div>
      )}

      {/* Detected placeholders */}
      {hasTemplate && placeholders.length > 0 && (
        <div>
          <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Detected Placeholders ({placeholders.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}>
            {placeholders.map(p => (
              <code
                key={p}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(79,142,247,0.1)', color: '#60A5FA', border: '1px solid rgba(79,142,247,0.2)' }}
              >
                {'{' + p + '}'}
              </code>
            ))}
          </div>
          <p style={{ color: '#475569', fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
            These are automatically filled from lead data when you click "Generate Contract" on any lead. You can edit any value before downloading.
          </p>
        </div>
      )}

      {hasTemplate && placeholders.length === 0 && status === 'ready' && (
        <p style={{ color: '#F59E0B', fontSize: 12 }}>
          No placeholders detected. Make sure your template uses <code style={{ color: '#FCD34D' }}>{'{placeholder_name}'}</code> syntax.
        </p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <SalesShell>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>⚙ Settings</h1>
        <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
          Lead assignment rules and system preferences
        </p>
      </div>

      <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AutoAssignCard />
        <ContractTemplateCard />
      </div>
    </SalesShell>
  )
}
