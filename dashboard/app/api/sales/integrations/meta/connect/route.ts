import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const APP_ID      = process.env.META_APP_ID ?? ''
const REDIRECT_URI = process.env.NEXTAUTH_URL
  ? `${process.env.NEXTAUTH_URL}/api/sales/integrations/meta/callback`
  : ''

// GET /api/sales/integrations/meta/connect
// Redirects admin to Facebook OAuth
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const scopes = [
    'pages_show_list',
    'leads_retrieval',
    'pages_manage_ads',
    'pages_read_engagement',
  ].join(',')

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code`

  return NextResponse.redirect(url)
}
