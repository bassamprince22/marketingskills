import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Sales routes require a real role (not the legacy single-password admin)
    if (pathname.startsWith('/sales') && !pathname.startsWith('/sales/login')) {
      if (!token) {
        return NextResponse.redirect(new URL('/sales/login', req.url))
      }
      // Reports are manager/admin only
      if (pathname.startsWith('/sales/reports') && token.role === 'rep') {
        return NextResponse.redirect(new URL('/sales/dashboard', req.url))
      }
      // Admin pages require admin role
      if (pathname.startsWith('/sales/admin') && token.role !== 'admin') {
        return NextResponse.redirect(new URL('/sales/dashboard', req.url))
      }
      // CSV import requires manager or admin
      if (pathname.startsWith('/sales/import') && token.role === 'rep') {
        return NextResponse.redirect(new URL('/sales/dashboard', req.url))
      }
      // Integrations requires manager or admin
      if (pathname.startsWith('/sales/integrations') && token.role === 'rep') {
        return NextResponse.redirect(new URL('/sales/dashboard', req.url))
      }
      // Settings requires manager or admin
      if (pathname.startsWith('/sales/settings') && token.role === 'rep') {
        return NextResponse.redirect(new URL('/sales/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Public paths
        if (
          pathname.startsWith('/sales/login') ||
          pathname.startsWith('/sales/forgot-password') ||
          pathname.startsWith('/sales/reset-password') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/privacy') ||
          pathname.startsWith('/terms') ||
          pathname.startsWith('/data-deletion') ||
          // Meta webhook is server-to-server from Facebook — must be public
          pathname.startsWith('/api/sales/integrations/meta/webhook') ||
          // Password reset API endpoint must be public for forgot-password flow
          pathname === '/api/sales/password'
        ) return true
        // All other paths require auth
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/sales/:path*',
    '/((?!_next/static|_next/image|favicon.ico|login).*)',
  ],
}
