import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('workspaces')
      .select('id, name, created_at')
      .limit(5)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: data?.length ?? 0, workspaces: data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
