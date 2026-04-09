'use client'

import { StarsBackground } from './StarsBackground'
import { SalesNav } from './SalesNav'

export function SalesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fadaa-bg" style={{ display: 'flex', minHeight: '100vh' }}>
      <StarsBackground />
      <SalesNav />
      <main
        style={{
          flex: 1,
          marginLeft: '220px',
          padding: '28px 32px',
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  )
}
