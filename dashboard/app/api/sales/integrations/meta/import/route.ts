import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { getManualImportWindow, readMetaHealth, syncMetaWindow } from '@/lib/sales/metaIntegration'

// Prevent manual imports from running more than once every 3 minutes to avoid
// hitting Meta's rate limits and triggering account security reviews.
const MIN_MANUAL_INTERVAL_MS = 3 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role } = session.user as { role: string }
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getServiceClient()

    // Throttle check — don't import if a sync ran recently
    const health = await readMetaHealth(db)
    const lastSyncAt = health.last_successful_sync_at
    if (lastSyncAt) {
      const elapsed = Date.now() - new Date(lastSyncAt).getTime()
      if (elapsed < MIN_MANUAL_INTERVAL_MS) {
        const waitSec = Math.ceil((MIN_MANUAL_INTERVAL_MS - elapsed) / 1000)
        return NextResponse.json(
          { error: `Please wait ${waitSec}s before importing again to avoid Meta rate limits.` },
          { status: 429 }
        )
      }
    }

    const pageId = req.nextUrl.searchParams.get('page_id')
    const { since, until } = getManualImportWindow()

    const summary = await syncMetaWindow(db, {
      source: 'manual_import',
      since,
      until,
      pageId,
    })

    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Manual import failed' },
      { status: 500 }
    )
  }
}
