import Link from 'next/link'
import type { ReactNode } from 'react'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white antialiased">
      <div className="flex flex-col items-center px-4 pb-16 pt-8">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F8EF7] text-sm font-bold shadow-lg shadow-purple-500/30">
            F
          </div>
          <span className="text-xl font-semibold tracking-tight">Fadaa</span>
        </Link>
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  )
}
