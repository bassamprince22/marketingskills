import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const BUCKET      = 'sales-config'
const CONFIG_FILE = 'meta-integration.json'
const LOGS_FILE   = 'meta-logs.json'

async function readJson(db: ReturnType<typeof getServiceClient>, file: string) {
  const { data, error } = await db.storage.from(BUCKET).download(file)
  if (error || !data) return null
  try {
    const text = await data.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function writeJson(db: ReturnType<typeof getServiceClient>, file: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value)], { type: 'application/json' })
  await db.storage
    .from(BUCKET)
    .upload(file, blob, { upsert: true, contentType: 'application/json' })
}

// GET — return integration config + logs from Storage
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceClient()
  const [integration, logs] = await Promise.all([
    readJson(db, CONFIG_FILE),
    readJson(db, LOGS_FILE),
  ])

  return NextResponse.json({ integration: integration ?? null, logs: logs ?? [] })
}

// PATCH — set default auto-import page
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()
  const { default_page_id } = await req.json() as { default_page_id: string }

  const current = await readJson(db, CONFIG_FILE)
  if (!current) return NextResponse.json({ error: 'Not connected' }, { status: 400 })

  await writeJson(db, CONFIG_FILE, {
    ...current,
    config: { ...current.config, default_page_id },
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}

// DELETE — disconnect Meta (set is_active = false)
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getServiceClient()
  const current = await readJson(db, CONFIG_FILE)

  if (current) {
    await writeJson(db, CONFIG_FILE, {
      ...current,
      is_active: false,
      config: {},
      updated_at: new Date().toISOString(),
    })
  }

  // Clear logs too
  const blob = new Blob([JSON.stringify([])], { type: 'application/json' })
  await db.storage.from(BUCKET).upload(LOGS_FILE, blob, { upsert: true, contentType: 'application/json' })

  return NextResponse.json({ ok: true })
}
