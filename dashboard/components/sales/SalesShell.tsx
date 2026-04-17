'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { StarsBackground } from './StarsBackground'
import { SalesNav } from './SalesNav'
import { NotificationToast } from './NotificationToast'

const BOTTOM_NAV = [
  { href: '/sales/dashboard', icon: '⬡', label: 'Home' },
  { href: '/sales/leads',     icon: '◎', label: 'Leads' },
  { href: '/sales/pipeline',  icon: '⟿', label: 'Pipeline' },
  { href: '/sales/meetings',  icon: '◷', label: 'Meetings' },
  { href: '/sales/documents', icon: '⎗', label: 'Docs' },
]

export function SalesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="fadaa-bg sales-shell">
      <StarsBackground />
      <SalesNav />
      <main className="sales-main">
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
