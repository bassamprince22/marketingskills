'use client'
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
  blue:   { border: '#4F8EF7', glow: 'rgba(79,142,247,0.2)',  text: '#4F8EF7', bg: 'rgba(79,142,247,0.08)',  gradient: 'linear-gradient(135deg,#4F8EF730,#4F8EF708)' },
  purple: { border: '#7C3AED', glow: 'rgba(124,58,237,0.2)',  text: '#A78BFA', bg: 'rgba(124,58,237,0.08)', gradient: 'linear-gradient(135deg,#7C3AED30,#7C3AED08)' },
  cyan:   { border: '#06B6D4', glow: 'rgba(6,182,212,0.2)',   text: '#22D3EE', bg: 'rgba(6,182,212,0.08)',  gradient: 'linear-gradient(135deg,#06B6D430,#06B6D408)' },
  amber:  { border: '#F59E0B', glow: 'rgba(245,158,11,0.2)',  text: '#FCD34D', bg: 'rgba(245,158,11,0.08)', gradient: 'linear-gradient(135deg,#F59E0B30,#F59E0B08)' },
  red:    { border: '#EF4444', glow: 'rgba(239,68,68,0.2)',   text: '#F87171', bg: 'rgba(239,68,68,0.08)',  gradient: 'linear-gradient(135deg,#EF444430,#EF444408)' },
  green:  { border: '#22C55E', glow: 'rgba(34,197,94,0.2)',   text: '#4ADE80', bg: 'rgba(34,197,94,0.08)',  gradient: 'linear-gradient(135deg,#22C55E30,#22C55E08)' },
}

export function FadaaStatCard({ label, value, icon, color = 'blue', suffix = '', prefix = '', delay = 0, isCurrency = false }: Props) {
  const frame = useAnimationFrame(delay)
  const c = COLOR_MAP[color]

  // Spring for entrance (opacity + translateY)
  const entrance = useRemotionSpring({ frame, config: { stiffness: 120, damping: 14 }, from: 0, to: 1 })
  // Spring for counter
  const counterSpring = useRemotionSpring({ frame, config: { stiffness: 60, damping: 18 }, from: 0, to: value })

  const animated = Math.round(counterSpring)
  const display = isCurrency
    ? animated >= 1000 ? `${prefix}${(animated/1000).toFixed(1)}k${suffix}` : `${prefix}${animated}${suffix}`
    : `${prefix}${animated.toLocaleString()}${suffix}`

  return (
    <div
      style={{
        background: c.gradient,
        border: `1px solid ${c.border}30`,
        borderRadius: 14,
        padding: '20px',
        boxShadow: `0 4px 32px rgba(0,0,0,0.35), 0 0 24px ${c.glow}`,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 12}px)`,
        transition: 'box-shadow 0.2s',
        cursor: 'default',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background accent */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: c.bg, filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40,
          background: c.bg,
          border: `1px solid ${c.border}30`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: c.text, background: c.bg,
          padding: '3px 8px', borderRadius: 999,
          letterSpacing: '0.08em',
          border: `1px solid ${c.border}20`,
        }}>
          LIVE
        </span>
      </div>

      <p style={{
        fontSize: 32, fontWeight: 800,
        color: c.text,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {display}
      </p>
      <p style={{ color: '#64748B', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
        {label}
      </p>
    </div>
  )
}
