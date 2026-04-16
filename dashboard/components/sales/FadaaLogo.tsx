interface FadaaLogoProps {
  size?: number
  showWordmark?: boolean
  showArabic?: boolean
}

export function FadaaLogo({ size = 48, showWordmark = false, showArabic = false }: FadaaLogoProps) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Icon mark */}
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #4F8EF7 0%, #7C3AED 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.46,
        boxShadow: '0 0 32px rgba(79,142,247,0.4)',
      }}>
        ✦
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: '#E2E8F0',
            fontSize: size * 0.42,
            fontWeight: 700,
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}>
            FADAA SALES
          </div>
          {showArabic && (
            <div style={{
              color: '#475569',
              fontSize: size * 0.27,
              marginTop: 4,
              letterSpacing: '0.03em',
            }}>
              فضاء · Mission Control
            </div>
          )}
        </div>
      )}
    </div>
  )
}
