'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

interface NavItem {
  href:   string
  label:  string
  icon:   React.ReactNode
  roles:  string[]
}

/* ── Inline SVG Icons (24×24 viewBox, stroke-based) ── */
const Icons = {
  Dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Leads: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Pipeline: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="5" height="14" rx="1.5"/>
      <rect x="9.5" y="3" width="5" height="18" rx="1.5"/>
      <rect x="17" y="8" width="5" height="9" rx="1.5"/>
    </svg>
  ),
  Meetings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  Qualified: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  Documents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  Import: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Reports: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Integrations: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3"/>
      <circle cx="17" cy="9" r="2.5"/>
      <path d="M2 21c0-3.3 3.1-6 7-6s7 2.7 7 6"/>
      <path d="M20 21c0-2.2-1.5-4-3.5-5"/>
    </svg>
  ),
  Settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  SignOut: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

const NAV: NavItem[] = [
  { href: '/sales/dashboard',    label: 'Dashboard',    icon: Icons.Dashboard,    roles: ['manager','rep','admin'] },
  { href: '/sales/leads',        label: 'Leads',        icon: Icons.Leads,        roles: ['manager','rep','admin'] },
  { href: '/sales/pipeline',     label: 'Pipeline',     icon: Icons.Pipeline,     roles: ['manager','rep','admin'] },
  { href: '/sales/meetings',     label: 'Meetings',     icon: Icons.Meetings,     roles: ['manager','rep','admin'] },
  { href: '/sales/qualified',    label: 'Qualified',    icon: Icons.Qualified,    roles: ['manager','rep','admin'] },
  { href: '/sales/documents',    label: 'Documents',    icon: Icons.Documents,    roles: ['manager','rep','admin'] },
  { href: '/sales/import',       label: 'Import CSV',   icon: Icons.Import,       roles: ['manager','admin'] },
  { href: '/sales/reports',      label: 'Reports',      icon: Icons.Reports,      roles: ['manager','admin'] },
  { href: '/sales/integrations', label: 'Integrations', icon: Icons.Integrations, roles: ['manager','admin'] },
  { href: '/sales/team',         label: 'Team',         icon: Icons.Team,         roles: ['admin','manager'] },
  { href: '/sales/settings',     label: 'Settings',     icon: Icons.Settings,     roles: ['manager','admin','rep'] },
]

function NavLinks({ visible, pathname, onNav }: { visible: NavItem[]; pathname: string; onNav?: () => void }) {
  return (
    <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
      {visible.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
            className={`nav-link${active ? ' active' : ''}`}
          >
            <span className="nav-link-icon">{icon}</span>
            <span className="nav-link-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function SalesNav() {
  const pathname          = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const name = session?.user?.name ?? '—'
  const [open, setOpen]   = useState(false)

  const visible = NAV.filter(n => n.roles.includes(role))

  const logoBlock = (
    <div style={{
      padding: '20px 16px 16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>
          ✦
        </div>
        <div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', lineHeight: 1.1 }}>FADAA</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.06em' }}>SALES · MISSION CONTROL</p>
        </div>
      </div>
    </div>
  )

  const userBlock = (onNav?: () => void) => (
    <Link
      href="/sales/profile"
      onClick={onNav}
      style={{ textDecoration: 'none', display: 'block', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-primary-dim)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
          boxShadow: '0 2px 8px var(--brand-primary-dim)',
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'capitalize', letterSpacing: '0.02em' }}>{role}</p>
        </div>
      </div>
    </Link>
  )

  const signOutBlock = (onNav?: () => void) => (
    <div style={{ padding: '10px', borderTop: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => { onNav?.(); signOut({ callbackUrl: '/sales/login' }) }}
        style={{
          width: '100%', textAlign: 'left', padding: '9px 12px',
          borderRadius: 8, fontSize: 12, color: 'var(--text-muted)',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 9,
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-red-text)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-red-dim)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        {Icons.SignOut}
        <span>Sign out</span>
      </button>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="sales-sidebar">
        {logoBlock}
        {userBlock()}
        <NavLinks visible={visible} pathname={pathname} />
        {signOutBlock()}
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="sales-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11,
          }}>✦</div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>FADAA</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: 20, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
          }}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,15,0.75)', zIndex: 50, backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className="sales-drawer"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 260,
          background: 'rgba(8, 12, 24, 0.97)',
          borderRight: '1px solid var(--border-subtle)',
          zIndex: 60,
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          backdropFilter: 'blur(20px)',
        }}
      >
        {logoBlock}
        {userBlock(() => setOpen(false))}
        <NavLinks visible={visible} pathname={pathname} onNav={() => setOpen(false)} />
        {signOutBlock(() => setOpen(false))}
      </div>
    </>
  )
}
