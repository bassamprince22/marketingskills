import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { type BrandSettings, DEFAULT_BRAND } from '@/lib/sales/contractHtml'

const BUCKET = 'sales-config'
const FILE   = 'brand-settings.json'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceClient()
  const { data, error } = await db.storage.from(BUCKET).download(FILE)
  if (error || !data) return NextResponse.json({ brand: DEFAULT_BRAND })

  try {
    const brand: BrandSettings = JSON.parse(await data.text())
    return NextResponse.json({ brand })
  } catch {
    return NextResponse.json({ brand: DEFAULT_BRAND })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { brand }: { brand: BrandSettings } = await req.json()
  const blob = new Blob([JSON.stringify(brand)], { type: 'application/json' })
  const { error } = await db().storage.from(BUCKET).upload(FILE, blob, { upsert: true, contentType: 'application/json' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

function db() { return getServiceClient() }
