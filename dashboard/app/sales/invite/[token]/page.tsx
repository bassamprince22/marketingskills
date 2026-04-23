'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { AuthMissionShell } from '@/components/sales/AuthMissionShell'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Sales Manager',
  rep: 'Sales Rep',
  admin: 'Admin',
}

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState<{ email: string; role: string } | null>(null)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetch(`/api/sales/invites/${token}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) {
          setError(data.error ?? 'Invalid invite')
          setLoading(false)
          return
        }
        setInvite({ email: data.email, role: data.role })
        setLoading(false)
      })
      .catch(() => {
        setError('Network error')
        setLoading(false)
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (password !== confirm) return setFormError('Passwords do not match')
    if (password.length < 8) return setFormError('Password must be at least 8 characters')
    if (!/^[a-z0-9._-]+$/i.test(username)) return setFormError('Username can only contain letters, numbers, dot, dash, underscore')

    setSubmitting(true)
    const res = await fetch(`/api/sales/invites/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), name: name.trim(), password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error ?? 'Failed to create account')
      setSubmitting(false)
      return
    }

    const signinRes = await signIn('sales', { username: username.trim().toLowerCase(), password, redirect: false })
    if (signinRes?.ok) router.push('/sales/dashboard')
    else router.push('/sales/login')
  }

  return (
    <AuthMissionShell
      eyebrow="Team Invitation"
      title={loading ? 'Validating invitation' : error ? 'Invite unavailable' : 'Create your account'}
      subtitle={invite ? `Invited as ${ROLE_LABELS[invite.role] ?? invite.role} - ${invite.email}` : 'Secure onboarding for the sales workspace.'}
      footer={<p>FADAA SALES - TEAM ONBOARDING</p>}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <span className="spinner" style={{ borderTopColor: 'var(--brand-primary)' }} />
          <p className="t-caption" style={{ marginTop: 14 }}>Validating invitation...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>!</div>
          <p className="t-caption" style={{ marginBottom: 24 }}>{error}</p>
          <a href="/sales/login" className="fadaa-btn" style={{ display: 'inline-flex', padding: '10px 22px' }}>
            Go to login
          </a>
        </div>
      ) : invite ? (
        <>
          {formError && (
            <div style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.22)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#F87171',
              fontSize: 13,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>!</span>
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input className="fadaa-input" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div className="form-field">
              <label className="form-label">Username</label>
              <input className="fadaa-input" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="jane.smith" required autoComplete="username" />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="fadaa-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '2px 4px', lineHeight: 1 }}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Confirm Password</label>
              <input
                className="fadaa-input"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-type your password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="fadaa-btn"
              style={{
                marginTop: 10,
                width: '100%',
                padding: '13px',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.03em',
                borderRadius: 12,
                justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff' }} />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </>
      ) : null}
    </AuthMissionShell>
  )
}
