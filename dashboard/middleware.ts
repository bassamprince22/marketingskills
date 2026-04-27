import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const BILLING_EXEMPT = [
  '/sales/billing',
  '/sales/login',
  '/sales/logout',
  '/api/auth',
  '/api/sales/billing',
]

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as (Record<string, string> & { role?: string; orgId?: string; trialEndsAt?: string }) | null
    const { pathname } = req.nextUrl

    // Protect onboarding routes — must be authenticated
    if (pathname.startsWith('/onboarding')) {
      if (!token) {
        return NextResponse.redirect(new URL('/sales/login', req.url))
      }
    }

    // Sales routes: role-based guards
    if (
      pathname.startsWith('/sales') &&
      !pathname.startsWith('/sales/login') &&
      !pathname.startsWith('/sales/forgot-password') &&
      !pathname.startsWith('/sales/reset-password') &&
      !pathname.startsWith('/sales/invite/')
    ) {
      if (!token) {
        return NextResponse.redirect(new URL('/sales/login', req.url))
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

      // Trial expiry: if org is suspended, send to billing (admin only)
      if (token.orgStatus === 'suspended' && token.role === 'admin') {
        const exempt = BILLING_EXEMPT.some((p) => pathname.startsWith(p))
        if (!exempt) {
          return NextResponse.redirect(new URL('/sales/billing?expired=1', req.url))
        }
      }
    }

    // Platform admin requires super_admin role
    if (pathname.startsWith('/platform-admin')) {
      if (token?.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/sales/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Fully public paths — no token required
        if (
          pathname === '/' ||
          pathname.startsWith('/features') ||
          pathname.startsWith('/pricing') ||
          pathname.startsWith('/demo') ||
          pathname.startsWith('/signup') ||
          pathname.startsWith('/sales/login') ||
          pathname.startsWith('/sales/forgot-password') ||
          pathname.startsWith('/sales/reset-password') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/privacy') ||
          pathname.startsWith('/terms') ||
          pathname.startsWith('/data-deletion') ||
          pathname.startsWith('/p/') ||
          pathname.startsWith('/api/proposals/') ||
          pathname.startsWith('/api/sales/integrations/meta/webhook') ||
          pathname === '/api/healthcheck' ||
          pathname === '/api/sales/password' ||
          pathname.startsWith('/sales/invite/') ||
          /^\/api\/sales\/invites\/[^/]+(\/accept)?$/.test(pathname)
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
    '/onboarding/:path*',
    '/platform-admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
