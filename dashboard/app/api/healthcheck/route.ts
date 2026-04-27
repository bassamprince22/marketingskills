import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const nextAuthSecret = process.env.NEXTAUTH_SECRET

  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: url ? `set (${url})` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `set (${serviceKey.slice(0, 20)}...)` : 'MISSING',
    NEXTAUTH_SECRET: nextAuthSecret ? 'set' : 'MISSING',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'MISSING',
  }

  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, env: envStatus, db: 'skipped — env missing' })
  }

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data, error } = await db
      .from('sales_users')
      .select('username, role, is_active')
      .eq('username', 'admin')
      .single()

    return NextResponse.json({
      ok: !error,
      env: envStatus,
      db: error ? `ERROR: ${error.message} (code: ${error.code})` : 'connected',
      admin_user: data ?? null,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, env: envStatus, db: `EXCEPTION: ${String(e)}` })
  }
}
