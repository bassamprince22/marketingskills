import Link from 'next/link'
import type { ReactNode } from 'react'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white antialiased">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0E1A]/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F8EF7] text-sm font-bold">
              F
            </div>
            <span className="text-lg font-semibold tracking-tight">Fadaa</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/features" className="text-sm text-white/70 transition hover:text-white">Features</Link>
            <Link href="/pricing" className="text-sm text-white/70 transition hover:text-white">Pricing</Link>
            <Link href="/demo" className="text-sm text-white/70 transition hover:text-white">Demo</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sales/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/10 bg-[#070A14]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F8EF7] text-sm font-bold">
                  F
                </div>
                <span className="text-lg font-semibold tracking-tight">Fadaa</span>
              </Link>
              <p className="mt-3 max-w-md text-sm text-white/50">
                The all-in-one Sales OS for marketing agencies. Pipeline,
                proposals, AI scoring, and team challenges in one platform.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/40">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white">Book a Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/40">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/data-deletion" className="hover:text-white">Data Deletion</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} Fadaa. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
