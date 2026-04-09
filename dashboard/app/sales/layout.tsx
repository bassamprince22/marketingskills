import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fadaa Sales — Mission Control',
  description: 'Internal sales management system',
}

// Sales section uses its own layout (dark Fadaa theme) —
// The root layout's Sidebar is still rendered but the sales
// section adds its own nav inside the main area.
export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <div className="fadaa-bg min-h-screen">{children}</div>
}
