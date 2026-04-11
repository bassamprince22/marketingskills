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
    opacity: Math.random() * 0.6 + 0.2,
    duration: Math.random() * 3 + 2,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: '#fff',
          opacity: s.opacity,
          animation: `twinkle ${s.duration}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

export default function SalesLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Remotion spring entrance
  const frame = useAnimationFrame(100)
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
      padding: 20,
      position: 'relative',
    }}>
      <StarField />

      {/* Nebula glows */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
        {/* Logo section */}
        <div style={{
          textAlign: 'center', marginBottom: 40,
          opacity: logoSpring,
          transform: `translateY(${(1 - logoSpring) * -20}px) scale(${0.85 + logoSpring * 0.15})`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <FadaaLogo size={52} showWordmark={true} showArabic={true} />
          </div>
          <p style={{ color: '#4F8EF7', fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            Sales Operating System
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15,22,41,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(79,142,247,0.15)',
          borderRadius: 20,
          padding: 36,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(79,142,247,0.06)',
          opacity: cardSpring,
          transform: `translateY(${(1 - cardSpring) * 24}px)`,
        }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 28 }}>Sign in to your mission control</p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '10px 14px', color: '#F87171',
              fontSize: 13, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Username
              </label>
              <input
                className="fadaa-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your.username"
                autoComplete="username"
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Password
              </label>
              <input
                className="fadaa-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(79,142,247,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Signing in…' : '→ Enter Mission Control'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#1E2D4A', fontSize: 11, marginTop: 24 }}>
          FADAA SALES · INTERNAL SYSTEM
        </p>
      </div>
    </div>
  )
}
