'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

interface NavItem {
  href:   string
  label:  string
  icon:   string
  roles:  string[]
}

const NAV: NavItem[] = [
  { href: '/sales/dashboard', label: 'Dashboard',  icon: '⬡', roles: ['manager','rep','admin'] },
  { href: '/sales/leads',     label: 'Leads',      icon: '◎', roles: ['manager','rep','admin'] },
  { href: '/sales/pipeline',  label: 'Pipeline',   icon: '⟿', roles: ['manager','rep','admin'] },
  { href: '/sales/meetings',  label: 'Meetings',   icon: '◷', roles: ['manager','rep','admin'] },
  { href: '/sales/qualified', label: 'Qualified',  icon: '✦', roles: ['manager','rep','admin'] },
  { href: '/sales/documents', label: 'Documents',  icon: '⎗', roles: ['manager','rep','admin'] },
  { href: '/sales/import',    label: 'Import CSV', icon: '↧', roles: ['manager','admin'] },
  { href: '/sales/reports',   label: 'Reports',    icon: '▦', roles: ['manager','admin'] },
  { href: '/sales/team',      label: 'Team',       icon: '◈', roles: ['admin'] },
]

function NavLinks({ visible, pathname, onNav }: { visible: NavItem[]; pathname: string; onNav?: () => void }) {
  return (
    <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
      {visible.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? '#4F8EF7' : '#94A3B8',
              background: active ? 'rgba(79,142,247,0.1)' : 'transparent',
              borderLeft: active ? '2px solid #4F8EF7' : '2px solid transparent',
              marginBottom: 2,
              transition: 'all 0.15s',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
            {label}
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
    <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1E2D4A' }}>
      <p style={{ color: '#4F8EF7', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em' }}>✦ FADAA SALES</p>
      <p style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>Mission Control</p>
    </div>
  )

  const userBlock = (onNav?: () => void) => (
    <Link
      href="/sales/profile"
      onClick={onNav}
      style={{ textDecoration: 'none', display: 'block', padding: '12px 16px', borderBottom: '1px solid #1E2D4A', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <p style={{ color: '#64748B', fontSize: 11, textTransform: 'capitalize' }}>{role} · Profile</p>
        </div>
      </div>
    </Link>
  )

  const signOutBlock = (onNav?: () => void) => (
    <div style={{ padding: '12px 8px', borderTop: '1px solid #1E2D4A' }}>
      <button
        onClick={() => { onNav?.(); signOut({ callbackUrl: '/sales/login' }) }}
        style={{
          width: '100%', textAlign: 'left', padding: '9px 12px',
          borderRadius: 8, fontSize: 13, color: '#64748B',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span>⇠</span> Sign out
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
        <p style={{ color: '#4F8EF7', fontWeight: 700, fontSize: 15, letterSpacing: '0.05em' }}>✦ FADAA</p>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'none', border: 'none', color: '#E2E8F0',
            fontSize: 22, cursor: 'pointer', padding: '4px 8px',
            lineHeight: 1,
          }}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.7)', zIndex: 50 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 260,
          background: '#0F1629',
          borderRight: '1px solid #1E2D4A',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
        className="sales-drawer"
      >
        {logoBlock}
        {userBlock(() => setOpen(false))}
        <NavLinks visible={visible} pathname={pathname} onNav={() => setOpen(false)} />
        {signOutBlock(() => setOpen(false))}
      </div>
    </>
  )
}
