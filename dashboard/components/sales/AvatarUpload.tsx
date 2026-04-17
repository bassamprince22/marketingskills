'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

export function AvatarUpload({ currentUrl, onUploaded }: { currentUrl?: string | null; onUploaded?: (url: string) => void }) {
  const { data: session, update } = useSession()
  const name      = session?.user?.name ?? '?'
  const fileRef   = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(currentUrl ?? null)
  const [loading, setLoading]   = useState(false)
  const [msg,     setMsg]       = useState('')
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok')

  function flash(text: string, type: 'ok'|'err') { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 4000) }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { flash('Only image files allowed', 'err'); return }
    if (file.size > 5 * 1024 * 1024) { flash('File must be under 5MB', 'err'); return }

    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    const res  = await fetch('/api/sales/profile/avatar', { method: 'POST', body: form })
    const d    = await res.json()
    setLoading(false)

    if (!res.ok) { flash(d.error ?? 'Upload failed', 'err'); return }

    flash('Photo updated!', 'ok')
    onUploaded?.(d.avatar_url)
    // Update NextAuth session
    await update({ image: d.avatar_url })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />

      {/* Avatar circle — drag & drop target */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          width: 96, height: 96, borderRadius: '50%',
          background: preview ? 'transparent' : 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
          border: '2px solid var(--border-default)',
          boxShadow: '0 4px 16px var(--brand-primary-dim)',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        title="Click or drag to upload photo"
      >
        {preview ? (
          <img src={preview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{name.charAt(0).toUpperCase()}</span>
        )}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="spinner" style={{ borderTopColor: '#fff', width: 24, height: 24 }} />
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.55)', padding: '4px 0', textAlign: 'center',
          fontSize: 10, color: '#fff', fontWeight: 600,
        }}>
          {loading ? 'Uploading…' : 'Change'}
        </div>
      </div>

      {msg && (
        <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)', fontWeight: 500 }}>
          {msgType === 'ok' ? '✓' : '⚠'} {msg}
        </span>
      )}

      <p className="t-caption" style={{ textAlign: 'center' }}>
        Click or drag to upload · JPEG, PNG, WebP · Max 5MB
      </p>
    </div>
  )
}
