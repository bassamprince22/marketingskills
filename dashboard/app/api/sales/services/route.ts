import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db = getServiceClient()
  const { data, error } = await db.from('sales_services')
    .select('*')
    .order('sort_order')
    .order('created_at')

  if (error && error.code !== '42P01') return err(error.message, 500)
  return NextResponse.json({ services: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (!['manager','admin'].includes(user.role ?? '')) return err('Forbidden', 403)

  const body = await req.json()
  if (!body.name) return err('name required')

  const db = getServiceClient()
  const { data, error } = await db.from('sales_services')
    .insert({
      name:           body.name,
      description:    body.description ?? null,
      commission_pct: body.commission_pct ?? 0,
      is_enabled:     body.is_enabled ?? true,
      sort_order:     body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ service: data })
}
