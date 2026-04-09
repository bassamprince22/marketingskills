'use client'

import { useCountUp } from './useCountUp'

interface Props {
  label:       string
  value:       number
  icon:        string
  color?:      'blue' | 'purple' | 'cyan' | 'amber' | 'red' | 'green'
  suffix?:     string
  prefix?:     string
  delay?:      number
  isCurrency?: boolean
}

const COLOR_MAP = {
  blue:   { border: '#4F8EF7', glow: 'rgba(79,142,247,0.15)',  text: '#4F8EF7', bg: 'rgba(79,142,247,0.08)'  },
  purple: { border: '#7C3AED', glow: 'rgba(124,58,237,0.15)',  text: '#A78BFA', bg: 'rgba(124,58,237,0.08)' },
  cyan:   { border: '#06B6D4', glow: 'rgba(6,182,212,0.15)',   text: '#22D3EE', bg: 'rgba(6,182,212,0.08)'  },
  amber:  { border: '#F59E0B', glow: 'rgba(245,158,11,0.15)',  text: '#FCD34D', bg: 'rgba(245,158,11,0.08)' },
  red:    { border: '#EF4444', glow: 'rgba(239,68,68,0.15)',   text: '#F87171', bg: 'rgba(239,68,68,0.08)'  },
  green:  { border: '#22C55E', glow: 'rgba(34,197,94,0.15)',   text: '#4ADE80', bg: 'rgba(34,197,94,0.08)'  },
}

export function FadaaStatCard({ label, value, icon, color = 'blue', suffix = '', prefix = '', delay = 0, isCurrency = false }: Props) {
  const animated = useCountUp(value, 900, delay)
  const c = COLOR_MAP[color]

  const display = isCurrency
    ? animated >= 1000
      ? `${prefix}${(animated / 1000).toFixed(1)}k${suffix}`
      : `${prefix}${animated}${suffix}`
    : `${prefix}${animated.toLocaleString()}${suffix}`

  return (
    <div
      className="fadaa-card p-5 flex flex-col gap-3 select-none"
      style={{
        borderColor: c.border + '40',
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 20px ${c.glow}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-2xl leading-none"
          style={{
            background: c.bg,
            padding: '8px',
            borderRadius: '10px',
            display: 'inline-block',
          }}
        >
          {icon}
        </span>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ background: c.bg, color: c.text }}
        >
          Live
        </span>
      </div>

      <div>
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color: c.text, fontVariantNumeric: 'tabular-nums' }}
        >
          {display}
        </p>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          {label}
        </p>
      </div>
    </div>
  )
}
