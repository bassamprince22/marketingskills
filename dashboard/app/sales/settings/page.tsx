'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'
import { NotificationSettingsCard } from '@/components/sales/NotificationSettingsCard'
import { ServicesManager } from '@/components/sales/ServicesManager'
import { ChallengeAdminPanel } from '@/components/sales/ChallengeAdminPanel'

function Flash({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  if (!msg) return null
  return (
    <span style={{
      fontSize: 12, fontWeight: 500,
      color: type === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)',
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
            <button onClick={handleDelete} className="fadaa-btn-danger fadaa-btn-sm">Remove</button>
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
        <p className="t-caption" style={{ color: 'var(--brand-amber-text)' }}>
          No placeholders detected. Make sure your template uses <code style={{ color: 'var(--brand-amber-text)' }}>{'{placeholder_name}'}</code> syntax.
        </p>
      )}
    </div>
  )
}

function CommissionTargetCard() {
  const [target,  setTarget]  = useState(0)
  const [period,  setPeriod]  = useState<'monthly'|'quarterly'|'yearly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')

  useEffect(() => {
    fetch('/api/sales/settings').then(r => r.json()).then(d => {
      setTarget(d.settings?.commission?.team_target ?? 0)
      setPeriod(d.settings?.commission?.team_target_period ?? 'monthly')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function flash(text: string, type: 'ok'|'err') { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3000) }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/sales/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission: { team_target: target, team_target_period: period, enabled: target > 0 } }),
    })
    setSaving(false)
    if (res.ok) flash('Saved', 'ok')
    else flash('Failed', 'err')
  }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div>
          <h3 className="t-section-title">Team Commission Target</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>Set a revenue target to show a team progress bar on the dashboard.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {msg && <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)' }}>{msgType === 'ok' ? '✓' : '⚠'} {msg}</span>}
          <button onClick={save} disabled={saving || loading} className="fadaa-btn fadaa-btn-sm">
            {saving ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</> : 'Save'}
          </button>
        </div>
      </div>
      {loading ? <div className="skeleton" style={{ height: 44, borderRadius: 8 }} /> : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="t-label">Target Amount ($)</label>
            <input className="fadaa-input" type="number" min={0} style={{ width: 160 }}
              value={target} onChange={e => setTarget(parseFloat(e.target.value) || 0)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="t-label">Period</label>
            <select className="fadaa-input" value={period} onChange={e => setPeriod(e.target.value as 'monthly'|'quarterly'|'yearly')}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

type SettingsTab = 'notifications' | 'services' | 'challenges' | 'system'

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const isPrivileged = role === 'manager' || role === 'admin'
  const isAdmin      = role === 'admin'
  const [tab, setTab] = useState<SettingsTab>('notifications')

  return (
    <SalesShell>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1 className="t-page-title">Settings</h1>
          <p className="t-caption">
            {isPrivileged ? 'System configuration and your personal preferences' : 'Your personal notification preferences'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-underline-bar" style={{ marginBottom: 24 }}>
        <button className={`tab-underline${tab === 'notifications' ? ' active' : ''}`} onClick={() => setTab('notifications')}>
          Notifications
        </button>
        {isPrivileged && (
          <button className={`tab-underline${tab === 'services' ? ' active' : ''}`} onClick={() => setTab('services')}>
            Services & Commissions
          </button>
        )}
        {isAdmin && (
          <button className={`tab-underline${tab === 'challenges' ? ' active' : ''}`} onClick={() => setTab('challenges')}>
            Challenges & Rewards
          </button>
        )}
        {isPrivileged && (
          <button className={`tab-underline${tab === 'system' ? ' active' : ''}`} onClick={() => setTab('system')}>
            System
          </button>
        )}
      </div>

      <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'notifications' && <NotificationSettingsCard role={role} />}
        {tab === 'services' && isPrivileged && (
          <>
            <ServicesManager />
            <CommissionTargetCard />
          </>
        )}
        {tab === 'challenges' && isAdmin && <ChallengeAdminPanel />}
        {tab === 'system' && isPrivileged && (
          <>
            <AutoAssignCard />
            <ContractTemplateCard />
          </>
        )}
      </div>
    </SalesShell>
  )
}
