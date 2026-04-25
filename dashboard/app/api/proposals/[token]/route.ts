import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params
  const db = getServiceClient()

  const { data, error } = await db
    .from('proposals')
    .select(`
      id, proposal_number, title, subtitle, status, proposal_date, valid_until,
      body_html, cover_color, public_token, created_at,
      orgs(name, logo_url),
      sales_leads(company_name, contact_person, email, phone),
      sales_users(name),
      proposal_line_items(id, sort_order, description, qty, unit, rate),
      proposal_adjustments(id, adj_type, label, value_type, value)
    `)
    .eq('public_token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  return NextResponse.json(data)
}
