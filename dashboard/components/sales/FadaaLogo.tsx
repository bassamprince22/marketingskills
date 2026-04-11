'use client'
interface Props {
  size?: number
  showWordmark?: boolean
  showArabic?: boolean
  className?: string
}

export function FadaaLogo({ size = 36, showWordmark = true, showArabic = false, className }: Props) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Mark */}
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fadaa-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4F8EF7" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <filter id="fadaa-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Outer hex ring */}
        <path
          d="M20 2 L34 11 L34 29 L20 38 L6 29 L6 11 Z"
          stroke="url(#fadaa-grad)"
          strokeWidth="1.5"
          fill="rgba(79,142,247,0.06)"
          filter="url(#fadaa-glow)"
        />
        {/* Inner star */}
        <path
          d="M20 8 L22.5 17 L31 20 L22.5 23 L20 32 L17.5 23 L9 20 L17.5 17 Z"
          fill="url(#fadaa-grad)"
          filter="url(#fadaa-glow)"
        />
      </svg>
      {showWordmark && (
        <div>
          <p style={{
            color: '#E2E8F0',
            fontWeight: 800,
            fontSize: size * 0.45,
            letterSpacing: '0.12em',
            lineHeight: 1,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            FADAA
          </p>
          {showArabic && (
            <p style={{ color: '#4F8EF7', fontSize: size * 0.28, letterSpacing: '0.05em', marginTop: 1 }}>فضاء</p>
          )}
        </div>
      )}
    </div>
  )
}
