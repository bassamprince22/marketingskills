import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)

  const db   = getServiceClient()
  const user = session.user as { id?: string; role?: string }
  const role = user.role ?? 'rep'

  const { searchParams } = new URL(req.url)
  const repId  = searchParams.get('rep_id')
  const status = searchParams.get('status')

  try {
    let q = db.from('sales_commissions')
      .select(`
        *,
        sales_leads!lead_id(id, company_name, contact_person, estimated_value),
        sales_users!rep_id(id, name, avatar_url),
        sales_services!service_id(id, name, commission_pct)
      `)
      .order('created_at', { ascending: false })

    if (role === 'rep') q = q.eq('rep_id', user.id)
    else if (repId)     q = q.eq('rep_id', repId)

    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error && error.code !== '42P01') throw error

    // Aggregate totals
    const rows   = data ?? []
    const total  = rows.reduce((s, r) => s + Number(r.commission_amount), 0)
    const pending = rows.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.commission_amount), 0)
    const paid    = rows.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.commission_amount), 0)

    return NextResponse.json({ commissions: rows, totals: { total, pending, paid } })
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}
