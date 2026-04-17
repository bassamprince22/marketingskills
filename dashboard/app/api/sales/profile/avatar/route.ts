import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const BUCKET  = 'sales-avatars'
const MAX_MB  = 5
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id?: string }
  if (!user.id) return NextResponse.json({ error: 'No user id' }, { status: 400 })

  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 })
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File must be under ${MAX_MB}MB` }, { status: 400 })
  }

  const db        = getServiceClient()
  const ext       = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path      = `${user.id}/avatar.${ext}`
  const arrayBuf  = await file.arrayBuffer()

  // Upload to Supabase Storage
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(path, arrayBuf, { contentType: file.type, upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path)
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  // Update user record
  await db.from('sales_users')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  return NextResponse.json({ ok: true, avatar_url: avatarUrl })
}
