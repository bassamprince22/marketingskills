import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Social Dashboard',
  description: 'Automated social content pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <Providers>
          <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
