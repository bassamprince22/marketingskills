import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import {
  markMetaDisconnected,
  readMetaHealth,
  readMetaIntegration,
  readMetaLogs,
  refreshMetaHealth,
  type MetaIntegrationRecord,
  writeMetaIntegration,
} from '@/lib/sales/metaIntegration'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceClient()
  const [integration, logs, health] = await Promise.all([
    readMetaIntegration(db),
    readMetaLogs(db),
    readMetaHealth(db),
  ])

  return NextResponse.json({
    integration: integration ?? null,
    logs,
    health,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getServiceClient()
  const { default_page_id } = (await req.json()) as { default_page_id?: string | null }
  const current = await readMetaIntegration(db)
  if (!current) return NextResponse.json({ error: 'Not connected' }, { status: 400 })

  const next: MetaIntegrationRecord = {
    ...current,
    config: {
      ...current.config,
      default_page_id: default_page_id ?? null,
    },
    updated_at: new Date().toISOString(),
  }

  await writeMetaIntegration(db, next)
  const health = await refreshMetaHealth(
    db,
    {
      last_checked_at: new Date().toISOString(),
      last_checked_source: 'settings',
    },
    { notify: false }
  )

  return NextResponse.json({ ok: true, integration: next, health })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getServiceClient()
  const current = await readMetaIntegration(db)

  if (current) {
    await writeMetaIntegration(db, {
      ...current,
      is_active: false,
      config: {},
      updated_at: new Date().toISOString(),
    })
  }

  await markMetaDisconnected(db)
  return NextResponse.json({ ok: true })
}
