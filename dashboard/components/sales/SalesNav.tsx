'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: string[]
  badge?: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

interface SalesNavProps {
  mobileOpen: boolean
  onClose: () => void
}

const Icons = {
  Dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Leads: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  Pipeline: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="5" height="14" rx="1.5" />
      <rect x="9.5" y="3" width="5" height="18" rx="1.5" />
      <rect x="17" y="8" width="5" height="9" rx="1.5" />
    </svg>
  ),
  Meetings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Qualified: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Documents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  ),
  Commission: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5a2.5 2.5 0 0 0-5 0c0 1.5 1 2.5 2.5 3s2.5 1.5 2.5 3a2.5 2.5 0 0 1-5 0" />
      <line x1="12" y1="7" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="17" />
    </svg>
  ),
  Challenges: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Import: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Reports: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  Marketing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  Integrations: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 21c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      <path d="M20 21c0-2.2-1.5-4-3.5-5" />
    </svg>
  ),
  Settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Profile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  ),
  Logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Mission Control',
    items: [
      { href: '/sales/dashboard', label: 'Dashboard', icon: Icons.Dashboard, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/leads', label: 'Leads', icon: Icons.Leads, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/pipeline', label: 'Pipeline', icon: Icons.Pipeline, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/meetings', label: 'Meetings', icon: Icons.Meetings, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/qualified', label: 'Qualified', icon: Icons.Qualified, roles: ['manager', 'rep', 'admin'] },
    ],
  },
  {
    label: 'Execution',
    items: [
      { href: '/sales/documents', label: 'Documents', icon: Icons.Documents, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/commissions', label: 'Commissions', icon: Icons.Commission, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/challenges', label: 'Challenges', icon: Icons.Challenges, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/reports', label: 'Reports', icon: Icons.Reports, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/marketing', label: 'Marketing', icon: Icons.Marketing, roles: ['admin'] },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/sales/import', label: 'Import', icon: Icons.Import, roles: ['manager', 'admin'] },
      { href: '/sales/integrations', label: 'Integrations', icon: Icons.Integrations, roles: ['manager', 'admin'] },
      { href: '/sales/team', label: 'Team', icon: Icons.Team, roles: ['manager', 'admin'] },
      { href: '/sales/settings', label: 'Settings', icon: Icons.Settings, roles: ['manager', 'rep', 'admin'] },
      { href: '/sales/profile', label: 'Profile', icon: Icons.Profile, roles: ['manager', 'rep', 'admin'] },
    ],
  },
]

function renderInitial(name: string) {
  return (name || 'F').charAt(0).toUpperCase()
}

function NavLinks({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="mission-sidebar-nav">
      {sections.map(section => (
        <div key={section.label} className="mission-sidebar-section">
          <p className="mission-sidebar-section-label">{section.label}</p>
          {section.items.map(({ href, label, icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`nav-link${active ? ' active' : ''}`}
              >
                <span className="nav-link-icon">{icon}</span>
                <span className="nav-link-label">{label}</span>
                {badge && <span className="nav-badge">{badge}</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function SalesNav({ mobileOpen, onClose }: SalesNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'rep'
  const name = session?.user?.name ?? 'Fadaa User'
  const avatarUrl = (session?.user as { image?: string } | undefined)?.image

  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(role)),
  })).filter(section => section.items.length > 0)

  const userBlock = (
    <Link href="/sales/profile" onClick={onClose} className="mission-sidebar-user">
      <div className="mission-sidebar-avatar">
        {avatarUrl ? <img src={avatarUrl} alt={name} /> : renderInitial(name)}
      </div>
      <div className="mission-sidebar-user-copy">
        <p className="mission-sidebar-user-name">{name}</p>
        <p className="mission-sidebar-user-role">{role}</p>
      </div>
    </Link>
  )

  const logoBlock = (
    <Link href="/sales/dashboard" onClick={onClose} className="mission-sidebar-logo">
      <div className="mission-sidebar-logo-mark">*</div>
      <div>
        <p className="mission-sidebar-logo-wordmark">FADAA</p>
        <p className="mission-sidebar-logo-sub">Sales Mission Control</p>
      </div>
    </Link>
  )

  const signOutBlock = (
    <button className="mission-signout-btn" onClick={() => signOut({ callbackUrl: '/sales/login' })}>
      {Icons.Logout}
      <span>Sign out</span>
    </button>
  )

  return (
    <>
      <aside className="sales-sidebar mission-sidebar">
        {logoBlock}
        {userBlock}
        <NavLinks sections={visibleSections} pathname={pathname} />
        <div className="mission-sidebar-footer">{signOutBlock}</div>
      </aside>

      {mobileOpen && <button className="mission-drawer-scrim" onClick={onClose} aria-label="Close navigation" />}

      <aside className={`sales-drawer mission-drawer${mobileOpen ? ' open' : ''}`}>
        <div className="mission-drawer-header">
          {logoBlock}
          <button className="mission-drawer-close" onClick={onClose} aria-label="Close navigation">×</button>
        </div>
        {userBlock}
        <NavLinks sections={visibleSections} pathname={pathname} onNavigate={onClose} />
        <div className="mission-sidebar-footer">{signOutBlock}</div>
      </aside>
    </>
  )
}
