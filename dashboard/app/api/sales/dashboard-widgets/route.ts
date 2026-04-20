import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export interface WidgetConfig {
  id:      string
  label:   string
  visible: boolean
  order:   number
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stat_cards',             label: 'Pipeline Stats',        visible: true,  order: 1  },
  { id: 'pipeline_constellation', label: 'Pipeline Overview',     visible: true,  order: 2  },
  { id: 'notifications',          label: 'Notifications',         visible: true,  order: 3  },
  { id: 'challenges',             label: 'Challenge Race',        visible: true,  order: 4  },
  { id: 'commissions',            label: 'Commissions',           visible: true,  order: 5  },
  { id: 'revenue_chart',          label: 'Closed Revenue Chart',  visible: true,  order: 6  },
  { id: 'todays_orbit',           label: "Today's Orbit",         visible: true,  order: 7  },
  { id: 'crew_leaderboard',       label: 'Crew Leaderboard',      visible: true,  order: 8  },
  { id: 'signal_stream',          label: 'Signal Stream',         visible: true,  order: 9  },
  { id: 'auto_assign',            label: 'Auto Assign',           visible: true,  order: 10 },
  { id: 'panel_unassigned',       label: 'Unassigned Leads',      visible: true,  order: 11 },
  { id: 'panel_overdue',          label: 'Overdue Follow-ups',    visible: true,  order: 12 },
  { id: 'panel_at_risk',          label: 'Deals at Risk',         visible: true,  order: 13 },
  { id: 'panel_stale',            label: 'Stale Leads',           visible: true,  order: 14 },
]

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
