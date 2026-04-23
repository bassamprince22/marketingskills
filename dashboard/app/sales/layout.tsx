import type { Metadata } from 'next'
import { IBM_Plex_Sans_Arabic, JetBrains_Mono, Space_Grotesk } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fadaa Sales - Mission Control',
  description: 'Internal sales management system',
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`fadaa-bg min-h-screen ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${ibmPlexSansArabic.variable}`}
      style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
    >
      {children}
    </div>
  )
}
