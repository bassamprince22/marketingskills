interface FadaaLogoProps {
  size?: number
  showWordmark?: boolean
  showArabic?: boolean
}

export function FadaaLogo({ size = 48, showWordmark = false, showArabic = false }: FadaaLogoProps) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(12, Math.round(size * 0.26)),
          background: 'linear-gradient(135deg, #4F8EF7 0%, #9B6BFF 58%, #E94BD0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.46,
          color: '#fff',
          boxShadow: '0 10px 34px rgba(79,142,247,0.24), 0 18px 42px rgba(155,107,255,0.22), inset 0 1px 0 rgba(255,255,255,0.26)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span style={{ position: 'relative', zIndex: 1 }}>*</span>
        <span
          style={{
            position: 'absolute',
            inset: -2,
            background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.25), transparent)',
            opacity: 0.7,
          }}
        />
      </div>

      {showWordmark && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              color: 'var(--text-primary)',
              fontSize: size * 0.38,
              fontWeight: 700,
              letterSpacing: '0.16em',
              lineHeight: 1,
            }}
          >
            FADAA
          </div>
          {showArabic && (
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: size * 0.24,
                marginTop: 6,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Mission Control · فضاء
            </div>
          )}
        </div>
      )}
    </div>
  )
}
