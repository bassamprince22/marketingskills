'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthMissionShell } from '@/components/sales/AuthMissionShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [devToken, setDevToken] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/sales/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot', email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      setSent(true)
      if (data.resetToken) setDevToken(data.resetToken)
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthMissionShell
      eyebrow="Account Recovery"
      title={sent ? 'Check your email' : 'Reset password'}
      subtitle={sent ? 'Use the recovery link to get back into mission control.' : "Enter your email and we'll send a reset link."}
      footer={<p>FADAA SALES - RECOVERY FLOW</p>}
    >
      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>@</div>
          <p className="t-body">
            If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, we've sent a password reset link.
          </p>
          {devToken && (
            <div className="fadaa-card" style={{ marginTop: 20, padding: '12px 14px', textAlign: 'left' }}>
              <p className="form-label" style={{ marginBottom: 6 }}>Dev Mode Reset Link</p>
              <Link href={`/sales/reset-password?token=${devToken}`} style={{ color: 'var(--brand-primary-text)', fontSize: 12, wordBreak: 'break-all' }}>
                /sales/reset-password?token={devToken}
              </Link>
            </div>
          )}
          <Link href="/sales/login" style={{ display: 'inline-block', marginTop: 24, color: 'var(--brand-primary-text)', fontSize: 13, textDecoration: 'none' }}>
            ← Back to login
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input
                className="fadaa-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                autoFocus
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button className="fadaa-btn" type="submit" disabled={sending} style={{ width: '100%', justifyContent: 'center' }}>
              {sending ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/sales/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
              ← Back to login
            </Link>
          </div>
        </>
      )}
    </AuthMissionShell>
  )
}
