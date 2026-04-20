'use client'

import { FadaaLogo } from './FadaaLogo'
import { StarsBackground } from './StarsBackground'

interface AuthMissionShellProps {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthMissionShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthMissionShellProps) {
  return (
    <div className="mission-auth-shell">
      <StarsBackground />
      <div className="mission-auth-nebula mission-auth-nebula-a" />
      <div className="mission-auth-nebula mission-auth-nebula-b" />

      <div className="mission-auth-wrap">
        <div className="mission-auth-brand">
          <FadaaLogo size={50} showWordmark showArabic />
          <p className="mission-auth-eyebrow">{eyebrow}</p>
        </div>

        <div className="mission-auth-card">
          <div className="mission-auth-shine" />
          <div className="mission-auth-header">
            <h1 className="t-page-title">{title}</h1>
            <p className="t-caption">{subtitle}</p>
          </div>

          {children}
        </div>

        {footer && <div className="mission-auth-footer">{footer}</div>}
      </div>
    </div>
  )
}
