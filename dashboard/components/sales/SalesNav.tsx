'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'

interface NavItem {
  href:     string
  label:    string
  icon:     string
  roles:    string[]
  exact?:   boolean
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
  { href: '/sales/admin/users', label: 'Users',   icon: '⊕', roles: ['admin'] },
]

export function SalesNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const name = session?.user?.name ?? '—'

  const visible = NAV.filter(n => n.roles.includes(role))

  return (
    <aside
      style={{
        width: '220px',
        flexShrink: 0,
        background: '#0F1629',
        borderRight: '1px solid #1E2D4A',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1E2D4A' }}>
        <p style={{ color: '#4F8EF7', fontWeight: 700, fontSize: '16px', letterSpacing: '0.05em' }}>
          ✦ FADAA SALES
        </p>
        <p style={{ color: '#64748B', fontSize: '11px', marginTop: 4 }}>Mission Control</p>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E2D4A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>{name}</p>
            <p style={{ color: '#64748B', fontSize: 11, textTransform: 'capitalize' }}>{role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {visible.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
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
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #1E2D4A' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/sales/login' })}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: 13,
            color: '#64748B',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>⇠</span> Sign out
        </button>
      </div>
    </aside>
  )
}
