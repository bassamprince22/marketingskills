'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StarsBackground } from '@/components/sales/StarsBackground'

export default function SalesLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('sales', { username, password, redirect: false })
    setLoading(false)
    if (result?.ok) {
      router.push('/sales/dashboard')
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div
      className="fadaa-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <StarsBackground />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, padding: '0 16px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F8EF7 0%, #7C3AED 100%)',
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
            boxShadow: '0 0 40px rgba(79,142,247,0.4)',
            animation: 'float 6s ease-in-out infinite',
          }}>
            ✦
          </div>
          <h1 style={{ color: '#E2E8F0', fontSize: 24, fontWeight: 700, letterSpacing: '0.05em' }}>
            FADAA SALES
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 6 }}>
            Mission Control · Sign in to your cockpit
          </p>
        </div>

        {/* Form card */}
        <div className="fadaa-card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Username
              </label>
              <input
                className="fadaa-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your.username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Password
              </label>
              <input
                className="fadaa-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#F87171',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="fadaa-btn"
              style={{ padding: '12px', fontSize: 15, marginTop: 4 }}
            >
              {loading ? 'Launching…' : '→  Enter Mission Control'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/sales/forgot-password" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none', opacity: 0.8 }}>
              Forgot your password?
            </a>
          </div>
        </div>

        <p style={{ color: '#1E2D4A', textAlign: 'center', fontSize: 12, marginTop: 24 }}>
          FADAA · فضاء · Sales System
        </p>
      </div>
    </div>
  )
}
