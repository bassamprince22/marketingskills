import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { getCronWindow, readMetaHealth, syncMetaWindow } from '@/lib/sales/metaIntegration'

function isAuthorizedCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (secret && authHeader === `Bearer ${secret}`) return true
  if (req.headers.get('x-vercel-cron')) return true
  const userAgent = req.headers.get('user-agent')?.toLowerCase() ?? ''
  return userAgent.includes('vercel-cron')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  const canUseSession = role === 'admin' || role === 'manager'
  const canUseCron = isAuthorizedCron(req)

  if (!canUseSession && !canUseCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServiceClient()
  const pageId = req.nextUrl.searchParams.get('page_id')
  const health = await readMetaHealth(db)
  const { since, until } = getCronWindow(health)

  try {
    const summary = await syncMetaWindow(db, {
      source: 'cron',
      since,
      until,
      pageId,
    })
    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Meta sync failed' },
      { status: 500 }
    )
  }
}
