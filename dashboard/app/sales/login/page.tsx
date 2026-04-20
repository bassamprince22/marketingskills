'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AuthMissionShell } from '@/components/sales/AuthMissionShell'
import { useAnimationFrame, useRemotionSpring } from '@/components/sales/useRemotionSpring'

export default function SalesLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const frame = useAnimationFrame(100)
  const cardSpring = useRemotionSpring({ frame: Math.max(0, frame - 6), config: { stiffness: 100, damping: 16 }, from: 0, to: 1 })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('sales', { username: username.trim().toLowerCase(), password, redirect: false })
    if (res?.ok) router.push('/sales/dashboard')
    else {
      setError('Invalid username or password')
      setLoading(false)
    }
  }

  return (
    <AuthMissionShell
      eyebrow="Sales Operating System"
      title="Welcome back"
      subtitle="Sign in to your mission control"
      footer={<p>FADAA SALES - INTERNAL SYSTEM</p>}
    >
      <div style={{ opacity: cardSpring, transform: `translateY(${(1 - cardSpring) * 18}px)` }}>
        {error && (
          <div
            style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.22)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#F87171',
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>!</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-field">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="fadaa-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your.username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="fadaa-input"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="current-password"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  padding: '2px 4px',
                  lineHeight: 1,
                }}
                tabIndex={-1}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                  {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="fadaa-btn"
            style={{
              marginTop: 8,
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
            {loading ? (
              <>
                <span className="spinner" style={{ borderTopColor: '#fff' }} />
                <span>Signing in...</span>
              </>
            ) : (
              'Enter Mission Control'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a
            href="/sales/forgot-password"
            style={{ color: 'var(--brand-primary-text)', fontSize: 13, textDecoration: 'none', opacity: 0.82 }}
          >
            Forgot your password?
          </a>
        </div>
      </div>
    </AuthMissionShell>
  )
}
