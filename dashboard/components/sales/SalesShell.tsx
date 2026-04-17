'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { StarsBackground } from './StarsBackground'
import { SalesNav } from './SalesNav'
import { NotificationToast } from './NotificationToast'

const BOTTOM_NAV = [
  { href: '/sales/dashboard', label: 'Home',     icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )},
  { href: '/sales/leads',    label: 'Leads',    icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )},
  { href: '/sales/pipeline', label: 'Pipeline', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="5" height="14" rx="1.5"/><rect x="9.5" y="3" width="5" height="18" rx="1.5"/><rect x="17" y="8" width="5" height="9" rx="1.5"/>
    </svg>
  )},
  { href: '/sales/meetings', label: 'Meetings', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )},
  { href: '/sales/documents',label: 'Docs',     icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  )},
]

export function SalesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const cards = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.fadaa-card')
    for (const card of cards) {
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty('--glow-x', `${x}%`)
      card.style.setProperty('--glow-y', `${y}%`)
    }
  }, [])

  return (
    <div className="fadaa-bg sales-shell">
      <StarsBackground />
      <SalesNav />
      <main className="sales-main" onMouseMove={handleMouseMove}>
        {children}
      </main>

      <NotificationToast />

      {/* Mobile bottom nav */}
      <nav className="sales-bottom-nav">
        {BOTTOM_NAV.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={active ? 'active' : ''}>
              <span className="icon">{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
