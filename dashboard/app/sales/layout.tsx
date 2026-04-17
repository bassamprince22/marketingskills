import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fadaa Sales — Mission Control',
  description: 'Internal sales management system',
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`fadaa-bg min-h-screen ${inter.variable}`} style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      {children}
    </div>
  )
}
