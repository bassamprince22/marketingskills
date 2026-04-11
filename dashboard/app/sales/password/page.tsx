'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'
import Link from 'next/link'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/sales/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change', currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to update password'); return }
      setSuccess(true)
      setTimeout(() => router.push('/sales/profile'), 2000)
    } finally {
      setSaving(false)
    }
  }

  const label = (l: string) => (
    <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{l}</label>
  )

  return (
    <SalesShell>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/sales/profile" style={{ color: '#64748B', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            ← Back to Profile
          </Link>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>🔒 Change Password</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Update your account password</p>
        </div>

        <div className="fadaa-card" style={{ padding: 28 }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <p style={{ color: '#4ADE80', fontSize: 16, fontWeight: 600 }}>Password updated successfully</p>
              <p style={{ color: '#64748B', fontSize: 13, marginTop: 8 }}>Redirecting to your profile…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                {label('Current Password')}
                <input
                  className="fadaa-input"
                  type="password"
                  value={form.currentPassword}
                  onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
              </div>
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
                />
              </div>
              <div>
                {label('Confirm New Password')}
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

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
                <Link href="/sales/profile" className="fadaa-btn-ghost" style={{ textDecoration: 'none', fontSize: 13 }}>Cancel</Link>
                <button className="fadaa-btn" type="submit" disabled={saving}>
                  {saving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </SalesShell>
  )
}
