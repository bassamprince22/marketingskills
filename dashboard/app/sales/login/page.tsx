'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FadaaLogo } from '@/components/sales/FadaaLogo'
import { useAnimationFrame, useRemotionSpring } from '@/components/sales/useRemotionSpring'

function StarField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 3 + 2,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: '50%', background: '#fff',
          opacity: 0.15,
          animation: `twinkle ${s.duration}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

export default function SalesLoginPage() {
  const router = useRouter()
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const frame      = useAnimationFrame(100)
  const logoSpring = useRemotionSpring({ frame, config: { stiffness: 80, damping: 14 }, from: 0, to: 1 })
  const cardSpring = useRemotionSpring({ frame: Math.max(0, frame - 8), config: { stiffness: 100, damping: 16 }, from: 0, to: 1 })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('sales', { username: username.trim().toLowerCase(), password, redirect: false })
    if (res?.ok) {
      router.push('/sales/dashboard')
    } else {
      setError('Invalid username or password')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, #0F1E4A 0%, #0A0E1A 60%, #050810 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative',
      fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <StarField />

      {/* Nebula glows */}
      <div style={{ position: 'fixed', top: '10%',    left: '5%',  width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, var(--brand-primary-dim) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--brand-secondary-dim) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>

        {/* Logo */}
        <div style={{
          textAlign: 'center', marginBottom: 36,
          opacity: logoSpring,
          transform: `translateY(${(1 - logoSpring) * -18}px) scale(${0.88 + logoSpring * 0.12})`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <FadaaLogo size={52} showWordmark={true} showArabic={true} />
          </div>
          <p style={{ color: 'var(--brand-primary)', fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600 }}>
            Sales Operating System
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(13, 20, 40, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(79,142,247,0.14)',
          borderRadius: 20,
          padding: 36,
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.05) inset, 0 0 60px rgba(79,142,247,0.05)',
          opacity: cardSpring,
          transform: `translateY(${(1 - cardSpring) * 24}px)`,
        }}>
          {/* Top-edge shine */}
          <div style={{ position: 'absolute', top: 0, left: 40, right: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', borderRadius: '0 0 4px 4px', pointerEvents: 'none' }} />

          <h2 className="t-page-title" style={{ fontSize: 20, marginBottom: 4 }}>Welcome back</h2>
          <p className="t-caption" style={{ marginBottom: 28 }}>Sign in to your mission control</p>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)',
              borderRadius: 10, padding: '10px 14px', color: '#F87171',
              fontSize: 13, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠</span> {error}
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 13, padding: '2px 4px',
                    transition: 'color 0.15s', lineHeight: 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="fadaa-btn"
              style={{
                marginTop: 8, width: '100%',
                padding: '13px',
                fontSize: 14, fontWeight: 700,
                letterSpacing: '0.03em',
                borderRadius: 12,
                justifyContent: 'center',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loading ? (
                <><span className="spinner" style={{ borderTopColor: '#fff' }} /> Signing in…</>
              ) : (
                '→ Enter Mission Control'
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <a
              href="/sales/forgot-password"
              style={{ color: 'var(--brand-primary)', fontSize: 13, textDecoration: 'none', opacity: 0.75, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
            >
              Forgot your password?
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 10, marginTop: 24, letterSpacing: '0.18em' }}>
          FADAA SALES · INTERNAL SYSTEM
        </p>
      </div>
    </div>
  )
}
