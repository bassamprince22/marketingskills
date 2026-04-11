'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FadaaLogo } from '@/components/sales/FadaaLogo'
import { StarsBackground } from '@/components/sales/StarsBackground'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  // Dev: show token returned from API
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
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      setSent(true)
      if (data.resetToken) setDevToken(data.resetToken)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0E1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative',
    }}>
      <StarsBackground />
      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <FadaaLogo size={48} showWordmark showArabic />
        </div>

        <div className="fadaa-card" style={{ padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✉</div>
              <h2 style={{ color: '#E2E8F0', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>
                If an account exists for <strong style={{ color: '#94A3B8' }}>{email}</strong>, we've sent a password reset link.
              </p>
              {devToken && (
                <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8 }}>
                  <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Dev Mode — Reset Token</p>
                  <Link
                    href={`/sales/reset-password?token=${devToken}`}
                    style={{ color: '#4F8EF7', fontSize: 12, wordBreak: 'break-all' }}
                  >
                    /sales/reset-password?token={devToken}
                  </Link>
                </div>
              )}
              <Link
                href="/sales/login"
                style={{ display: 'inline-block', marginTop: 24, color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}
              >
                ← Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ color: '#E2E8F0', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reset Password</h2>
              <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Email Address
                  </label>
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
                  {sending ? 'Sending…' : 'Send Reset Link'}
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
      </div>
    </div>
  )
}
