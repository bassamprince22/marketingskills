import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

function err(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }) }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return err('Unauthorized', 401)
  const user = session.user as { role?: string }
  if (user.role !== 'admin') return err('Forbidden', 403)

  const body   = await req.json()
  const { type = 'qualified', from, to, source, stage, rep_id } = body

  const db = getServiceClient()
  let q = db.from('sales_leads')
    .select(`
      id, company_name, contact_person, phone, email, service_type,
      lead_source, pipeline_stage, priority, estimated_value,
      next_follow_up_date, is_qualified, created_at, updated_at,
      sales_users!assigned_rep_id(name)
    `)

  if (from)   q = q.gte('created_at', from)
  if (to)     q = q.lte('created_at', to + 'T23:59:59')
  if (source) q = q.eq('lead_source', source)
  if (rep_id) q = q.eq('assigned_rep_id', rep_id)

  if (type === 'qualified') {
    q = q.in('pipeline_stage', ['qualified', 'proposal_sent', 'negotiation', 'contract_sent', 'won'])
  } else if (type === 'meetings') {
    q = q.in('pipeline_stage', ['meeting_completed', 'qualified', 'proposal_sent', 'negotiation', 'contract_sent', 'won'])
  } else if (type === 'pipeline' && stage) {
    q = q.eq('pipeline_stage', stage)
  }

  const { data, error } = await q.order('created_at', { ascending: false }).limit(5000)
  if (error) return err(error.message, 500)

  const rows = data ?? []
  if (rows.length === 0) {
    return new NextResponse('No data', { headers: { 'Content-Type': 'text/plain' } })
  }

  const headers = ['Company', 'Contact', 'Phone', 'Email', 'Service', 'Source', 'Stage', 'Priority', 'Value', 'Rep', 'Follow-up', 'Qualified', 'Created']
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      q_(r.company_name), q_(r.contact_person), q_(r.phone), q_(r.email),
      q_(r.service_type), q_(r.lead_source), q_(r.pipeline_stage), q_(r.priority),
      r.estimated_value ?? '', q_((r as any).sales_users?.name),
      r.next_follow_up_date ?? '', r.is_qualified ? 'Yes' : 'No',
      r.created_at?.slice(0, 10),
    ].join(','))
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fadaa-export-${type}-${Date.now()}.csv"`,
    },
  })
}

function q_(v: unknown): string {
  if (v == null) return ''
  const s = String(v).replace(/"/g, '""')
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
}
