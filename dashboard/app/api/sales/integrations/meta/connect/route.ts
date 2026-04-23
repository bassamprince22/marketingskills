import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMetaCallbackUrl } from '@/lib/sales/metaIntegration'

const APP_ID      = process.env.META_APP_ID ?? ''

// GET /api/sales/integrations/meta/connect
// Redirects admin to Facebook OAuth
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const scopes = [
    'ads_management',
    'pages_show_list',
    'leads_retrieval',
    'pages_manage_ads',
    'pages_read_engagement',
  ].join(',')

  const redirectUri = getMetaCallbackUrl(new URL(req.url).origin)
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`

  return NextResponse.redirect(url)
}
