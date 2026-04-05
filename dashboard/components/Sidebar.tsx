'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'

const NAV = [
  { href: '/', label: 'Overview', icon: '▦' },
  { href: '/analytics', label: 'Analytics', icon: '↗' },
  { href: '/schedule', label: 'Schedule', icon: '⊞' },
  { href: '/uploads', label: 'Uploads', icon: '↑' },
  { href: '/control', label: 'Control', icon: '⊙' },
  { href: '/workspaces', label: 'Workspaces', icon: '⊕' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session) return null

  return (
    <aside className="w-52 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Social Pipeline</p>
        <div className="mt-2">
          <WorkspaceSwitcher />
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-violet-50 text-violet-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
