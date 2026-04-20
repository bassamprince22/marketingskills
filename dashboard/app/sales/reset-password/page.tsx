'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthMissionShell } from '@/components/sales/AuthMissionShell'

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
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match')
    if (form.newPassword.length < 8) return setError('Password must be at least 8 characters')
    if (!token) return setError('Missing reset token. Please use the link from your email.')

    setSaving(true)
    try {
      const res = await fetch('/api/sales/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', token, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error ?? 'Failed to reset password')
      setSuccess(true)
      setTimeout(() => router.push('/sales/login'), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>X</div>
        <h2 className="t-page-title" style={{ fontSize: 18, marginBottom: 8 }}>Invalid reset link</h2>
        <p className="t-caption" style={{ marginBottom: 20 }}>This link is missing or malformed.</p>
        <Link href="/sales/forgot-password" style={{ color: 'var(--brand-primary-text)', fontSize: 13, textDecoration: 'none' }}>
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>OK</div>
        <h2 className="t-page-title" style={{ fontSize: 18, marginBottom: 8, color: 'var(--brand-green-text)' }}>Password reset</h2>
        <p className="t-caption">Your password has been updated. Redirecting to login...</p>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-field">
          <label className="form-label">New Password</label>
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

        <div className="form-field">
          <label className="form-label">Confirm Password</label>
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
          {saving ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/sales/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
          ← Back to login
        </Link>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthMissionShell
      eyebrow="Account Recovery"
      title="Set new password"
      subtitle="Choose a strong password for your account."
      footer={<p>FADAA SALES - RECOVERY FLOW</p>}
    >
      <Suspense fallback={<div className="fadaa-card" style={{ padding: 32, height: 200 }} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthMissionShell>
  )
}
