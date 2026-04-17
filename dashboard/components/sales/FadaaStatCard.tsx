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
  blue:   { accent: '#4F8EF7', glow: 'rgba(79,142,247,0.12)',  text: '#7CB9FC', bg: 'rgba(79,142,247,0.06)',  border: 'rgba(79,142,247,0.18)' },
  purple: { accent: '#7C3AED', glow: 'rgba(124,58,237,0.12)',  text: '#A78BFA', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.18)' },
  cyan:   { accent: '#06B6D4', glow: 'rgba(6,182,212,0.12)',   text: '#22D3EE', bg: 'rgba(6,182,212,0.06)',  border: 'rgba(6,182,212,0.18)' },
  amber:  { accent: '#D97706', glow: 'rgba(217,119,6,0.12)',   text: '#F59E0B', bg: 'rgba(217,119,6,0.06)',  border: 'rgba(217,119,6,0.18)' },
  red:    { accent: '#DC2626', glow: 'rgba(220,38,38,0.12)',   text: '#F87171', bg: 'rgba(220,38,38,0.06)',  border: 'rgba(220,38,38,0.18)' },
  green:  { accent: '#16A34A', glow: 'rgba(22,163,74,0.12)',   text: '#4ADE80', bg: 'rgba(22,163,74,0.06)',  border: 'rgba(22,163,74,0.18)' },
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
        borderTop: `1px solid ${c.border}`,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 10}px)`,
        cursor: 'default',
        userSelect: 'none',
        padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: c.text, background: c.bg,
          padding: '2px 7px', borderRadius: 999,
          letterSpacing: '0.1em',
          border: `1px solid ${c.border}`,
          opacity: 0.8,
        }}>
          LIVE
        </span>
      </div>

      <p style={{
        fontSize: 28, fontWeight: 700,
        color: c.text,
        letterSpacing: '-0.025em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 5, fontWeight: 500, letterSpacing: '0.01em' }}>
        {label}
      </p>
    </div>
  )
}
