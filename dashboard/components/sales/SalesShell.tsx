'use client'

import { StarsBackground } from './StarsBackground'
import { SalesNav } from './SalesNav'

export function SalesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fadaa-bg sales-shell">
      <StarsBackground />
      <SalesNav />
      <main className="sales-main">
        {children}
      </main>
    </div>
  )
}
