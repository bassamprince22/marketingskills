import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { type ContractTemplate } from '@/lib/sales/contractHtml'

const BUCKET = 'sales-config'
const FILE   = 'contract-templates.json'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceClient()
  const { data, error } = await db.storage.from(BUCKET).download(FILE)
  if (error || !data) return NextResponse.json({ templates: [] })

  try {
    const templates: ContractTemplate[] = JSON.parse(await data.text())
    return NextResponse.json({ templates: Array.isArray(templates) ? templates : [] })
  } catch {
    return NextResponse.json({ templates: [] })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { templates }: { templates: ContractTemplate[] } = await req.json()
  const blob = new Blob([JSON.stringify(templates)], { type: 'application/json' })
  const db = getServiceClient()
  const { error } = await db.storage.from(BUCKET).upload(FILE, blob, { upsert: true, contentType: 'application/json' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
