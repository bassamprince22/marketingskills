import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const BUCKET = 'sales-config'
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Invalid file type — use PNG, JPG, WebP or SVG' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `brand-logo.${ext}`
  const db = getServiceClient()

  // Delete old logo files (any extension)
  for (const oldExt of ['png', 'jpg', 'jpeg', 'webp', 'svg']) {
    await db.storage.from(BUCKET).remove([`brand-logo.${oldExt}`]).catch(() => {})
  }

  const bytes = await file.arrayBuffer()
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
    upsert: true,
    contentType: file.type,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ ok: true, url: publicUrl })
}
