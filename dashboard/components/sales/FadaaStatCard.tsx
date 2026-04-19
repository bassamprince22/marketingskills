'use client'
import { useRef } from 'react'
import { useAnimationFrame, useRemotionSpring } from './useRemotionSpring'

interface Props {
  label: string
  value: number
  icon: string
  color?: 'blue' | 'purple' | 'cyan' | 'amber' | 'red' | 'green'
  suffix?: string
  prefix?: string
  delay?: number
  isCurrency?: boolean
}

const COLOR_MAP = {
  blue:   { text: 'var(--brand-blue-text)',   bg: 'var(--brand-primary-dim)',    border: 'var(--brand-primary-glow)' },
  purple: { text: 'var(--brand-purple-text)', bg: 'var(--brand-secondary-dim)',  border: 'var(--brand-secondary-glow)' },
  cyan:   { text: 'var(--brand-cyan-text)',   bg: 'var(--brand-cyan-dim)',        border: 'var(--brand-cyan-glow)' },
  amber:  { text: 'var(--brand-amber-text)',  bg: 'var(--brand-amber-dim)',       border: 'var(--brand-amber-glow)' },
  red:    { text: 'var(--brand-red-text)',    bg: 'var(--brand-red-dim)',         border: 'var(--brand-red-glow)' },
  green:  { text: 'var(--brand-green-text)',  bg: 'var(--brand-green-dim)',       border: 'var(--brand-green-glow)' },
}

export function FadaaStatCard({ label, value, icon, color = 'blue', suffix = '', prefix = '', delay = 0, isCurrency = false }: Props) {
  const frame = useAnimationFrame(delay)
  const cardRef = useRef<HTMLDivElement>(null)
  const c = COLOR_MAP[color]

  const entrance = useRemotionSpring({ frame, config: { stiffness: 120, damping: 14 }, from: 0, to: 1 })
  const counterSpring = useRemotionSpring({ frame, config: { stiffness: 60, damping: 18 }, from: 0, to: value })

  const animated = Math.round(counterSpring)
  const display = isCurrency
    ? animated >= 1000 ? `${prefix}${(animated/1000).toFixed(1)}k${suffix}` : `${prefix}${animated}${suffix}`
    : `${prefix}${animated.toLocaleString()}${suffix}`

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect || !cardRef.current) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    cardRef.current.style.setProperty('--glow-x', `${x}%`)
    cardRef.current.style.setProperty('--glow-y', `${y}%`)
  }

  return (
    <div
      ref={cardRef}
      className="fadaa-card"
      onMouseMove={handleMouseMove}
      style={{
        borderTop: `2px solid ${c.border}`,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 10}px)`,
        cursor: 'default',
        userSelect: 'none',
        padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          boxShadow: `0 2px 8px ${c.border}`,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 8, fontWeight: 700,
          color: c.text, background: c.bg,
          padding: '2px 6px', borderRadius: 999,
          letterSpacing: '0.12em',
          border: `1px solid ${c.border}`,
          opacity: 0.75,
        }}>
          LIVE
        </span>
      </div>

      <p style={{
        fontSize: 30, fontWeight: 800,
        color: c.text,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
        {label}
      </p>
    </div>
  )
}
