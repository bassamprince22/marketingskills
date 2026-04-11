'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FadaaLogo } from '@/components/sales/FadaaLogo'
import { StarsBackground } from '@/components/sales/StarsBackground'

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!token) {
      setError('Missing reset token. Please use the link from your email.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/sales/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', token, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to reset password'); return }
      setSuccess(true)
      setTimeout(() => router.push('/sales/login'), 2500)
    } finally {
      setSaving(false)
    }
  }

  const label = (l: string) => (
    <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{l}</label>
  )

  return (
    <div className="fadaa-card" style={{ padding: 32 }}>
      {!token ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✕</div>
          <h2 style={{ color: '#F87171', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Invalid Reset Link</h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>This link is missing or malformed.</p>
          <Link href="/sales/forgot-password" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}>
            Request a new reset link
          </Link>
        </div>
      ) : success ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
          <h2 style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Password Reset!</h2>
          <p style={{ color: '#64748B', fontSize: 13 }}>Your password has been updated. Redirecting to login…</p>
        </div>
      ) : (
        <>
          <h2 style={{ color: '#E2E8F0', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Set New Password</h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              {label('New Password')}
              <input
                className="fadaa-input"
                type="password"
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                autoFocus
              />
            </div>
            <div>
              {label('Confirm Password')}
              <input
                className="fadaa-input"
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button className="fadaa-btn" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/sales/login" style={{ color: '#64748B', fontSize: 13, textDecoration: 'none' }}>
              ← Back to Login
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A0E1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative',
    }}>
      <StarsBackground />
      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <FadaaLogo size={48} showWordmark showArabic />
        </div>
        <Suspense fallback={<div className="fadaa-card" style={{ padding: 32, height: 200 }} />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
