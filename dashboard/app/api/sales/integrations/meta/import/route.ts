import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { getManualImportWindow, syncMetaWindow } from '@/lib/sales/metaIntegration'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getServiceClient()
  const pageId = req.nextUrl.searchParams.get('page_id')
  const { since, until } = getManualImportWindow()

  try {
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
