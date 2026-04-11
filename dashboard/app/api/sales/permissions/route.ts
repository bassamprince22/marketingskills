import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserPermissions, setUserPermissions } from '@/lib/sales/db'
import type { Permission } from '@/lib/sales/db'

// GET /api/sales/permissions?userId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, role } = session.user as { id: string; role: string }
  const targetId = req.nextUrl.searchParams.get('userId') ?? id

  if (role !== 'admin' && targetId !== id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const permissions = await getUserPermissions(targetId)
  return NextResponse.json({ permissions })
}

// PUT /api/sales/permissions — admin only, save full permission set
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = session.user as { id: string; role: string }
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, permissions } = await req.json() as { userId: string; permissions: Permission[] }
  if (!userId || !permissions) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await setUserPermissions(userId, permissions)
  return NextResponse.json({ ok: true })
}
