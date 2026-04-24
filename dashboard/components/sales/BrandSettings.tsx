'use client'

import { useEffect, useRef, useState } from 'react'
import { type BrandSettings, DEFAULT_BRAND } from '@/lib/sales/contractHtml'

export function BrandSettingsCard() {
  const [brand,    setBrand]    = useState<BrandSettings>(DEFAULT_BRAND)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [uploading,setUploading]= useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/sales/brand')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.brand) setBrand({ ...DEFAULT_BRAND, ...d.brand }); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function flash(text: string, ok: boolean) {
    setMsg(text); setMsgOk(ok)
    setTimeout(() => setMsg(''), 3000)
  }

  function set(k: keyof BrandSettings) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setBrand(b => ({ ...b, [k]: e.target.value }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/sales/brand', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand }),
    })
    setSaving(false)
    if (res.ok) flash('Brand settings saved', true)
    else flash('Failed to save', false)
  }

  async function uploadLogo(file: File) {
    if (!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)) {
      flash('Use PNG, JPG, WebP or SVG', false); return
    }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/sales/brand/logo', { method: 'POST', body: form })
    const d   = await res.json()
    setUploading(false)
    if (!res.ok || !d.url) { flash(d.error ?? 'Upload failed', false); return }
    setBrand(b => ({ ...b, logoUrl: d.url }))
    flash('Logo uploaded', true)
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#E2E8F0', outline: 'none',
  }
  const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-faint)', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />

      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h3 className="t-section-title">Brand Identity</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>
            Logo, company info, and colors auto-inject into every contract header.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {msg && <span style={{ fontSize: 12, fontWeight: 500, color: msgOk ? '#4ADE80' : '#F87171' }}>{msgOk ? '✓' : '⚠'} {msg}</span>}
          <button className="fadaa-btn fadaa-btn-sm" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save Brand'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 8 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Logo */}
          <div>
            <label style={labelStyle}>Company Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt="logo" style={{ height: 48, maxWidth: 160, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.06)', padding: 6 }} />
              ) : (
                <div style={{ width: 80, height: 48, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>No logo</span>
                </div>
              )}
              <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : brand.logoUrl ? '↺ Replace' : '↑ Upload logo'}
              </button>
              {brand.logoUrl && (
                <button className="fadaa-btn-danger fadaa-btn-sm" onClick={() => setBrand(b => ({ ...b, logoUrl: '' }))}>Remove</button>
              )}
            </div>
          </div>

          {/* Company info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input style={inputStyle} value={brand.companyName} onChange={set('companyName')} placeholder="Fadaa Agency" />
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={brand.address} onChange={set('address')} placeholder="Riyadh, Saudi Arabia" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={brand.phone} onChange={set('phone')} placeholder="+966 50 000 0000" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={brand.email} onChange={set('email')} placeholder="contracts@fadaa.co" />
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              <input style={inputStyle} value={brand.website} onChange={set('website')} placeholder="www.fadaa.co" />
            </div>
            <div>
              <label style={labelStyle}>Brand Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={brand.brandColor} onChange={set('brandColor')}
                  style={{ width: 38, height: 38, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', padding: 2, background: 'transparent', cursor: 'pointer' }} />
                <input style={{ ...inputStyle, flex: 1 }} value={brand.brandColor} onChange={set('brandColor')} placeholder="#4F8EF7" maxLength={7} />
              </div>
            </div>
          </div>

          {/* Live preview strip */}
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginTop: 4 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {brand.logoUrl && <img src={brand.logoUrl} alt="" style={{ height: 28, objectFit: 'contain' }} />}
              <span style={{ fontWeight: 700, fontSize: 13, color: '#E2E8F0' }}>{brand.companyName || 'Your Company'}</span>
              {brand.address && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>· {brand.address}</span>}
            </div>
            <div style={{ height: 3, background: brand.brandColor }} />
          </div>
        </div>
      )}
    </div>
  )
}
