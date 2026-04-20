import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { type WidgetConfig, DEFAULT_WIDGETS } from '@/lib/sales/widgetConfig'

const BUCKET = 'sales-config'
const FILE   = 'dashboard-widgets.json'
const db     = () => getServiceClient()

async function readConfig(): Promise<WidgetConfig[]> {
  const { data, error } = await db().storage.from(BUCKET).download(FILE)
  if (error || !data) return DEFAULT_WIDGETS
  try {
    const saved: WidgetConfig[] = JSON.parse(await data.text())
    // Merge with defaults — add any new widgets not yet in saved config
    const savedIds = new Set(saved.map(w => w.id))
    const merged   = [...saved]
    DEFAULT_WIDGETS.forEach((d, i) => {
      if (!savedIds.has(d.id)) merged.push({ ...d, order: saved.length + i + 1 })
    })
    return merged.sort((a, b) => a.order - b.order)
  } catch {
    return DEFAULT_WIDGETS
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ widgets: await readConfig() })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { widgets }: { widgets: WidgetConfig[] } = await req.json()
  const blob = new Blob([JSON.stringify(widgets)], { type: 'application/json' })
  const { error } = await db().storage.from(BUCKET).upload(FILE, blob, { upsert: true, contentType: 'application/json' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
