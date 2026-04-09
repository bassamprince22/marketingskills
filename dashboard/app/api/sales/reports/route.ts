import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role === 'rep') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp   = req.nextUrl.searchParams
  const from = sp.get('from') // ISO date string
  const to   = sp.get('to')

  const db = getServiceClient()

  try {
    // Fetch everything we need in parallel
    const [
      { data: leads },
      { data: meetings },
      { data: docs },
      { data: users },
    ] = await Promise.all([
      db.from('sales_leads').select('id, pipeline_stage, lead_source, service_type, assigned_rep_id, is_qualified, estimated_value, created_at'),
      db.from('sales_meetings').select('id, rep_id, status, meeting_date'),
      db.from('sales_documents').select('id, doc_type, status, upload_date'),
      db.from('sales_users').select('id, name').eq('role', 'rep'),
    ])

    const L  = (leads    ?? []) as any[]
    const M  = (meetings ?? []) as any[]
    const D  = (docs     ?? []) as any[]
    const U  = (users    ?? []) as any[]

    // Date filter helper
    const inRange = (dateStr: string) => {
      if (!from && !to) return true
      const d = new Date(dateStr)
      if (from && d < new Date(from)) return false
      if (to   && d > new Date(to))   return false
      return true
    }

    const filteredL = L.filter(l => inRange(l.created_at))
    const filteredM = M.filter(m => inRange(m.meeting_date))
    const filteredD = D.filter(d => inRange(d.upload_date))

    // 1. Leads by source
    const bySource: Record<string, number> = {}
    filteredL.forEach(l => { bySource[l.lead_source] = (bySource[l.lead_source] ?? 0) + 1 })

    // 2. Leads by service type
    const byService: Record<string, number> = {}
    filteredL.forEach(l => { byService[l.service_type] = (byService[l.service_type] ?? 0) + 1 })

    // 3. Qualified leads by rep
    const qualByRep = U.map(u => ({
      rep_id:   u.id,
      rep_name: u.name,
      count:    filteredL.filter(l => l.assigned_rep_id === u.id && l.is_qualified).length,
    }))

    // 4. Meetings by rep
    const meetingsByRep = U.map(u => ({
      rep_id:    u.id,
      rep_name:  u.name,
      total:     filteredM.filter(m => m.rep_id === u.id).length,
      completed: filteredM.filter(m => m.rep_id === u.id && m.status === 'completed').length,
      no_show:   filteredM.filter(m => m.rep_id === u.id && m.status === 'no_show').length,
    }))

    // 5. Win / loss
    const won  = filteredL.filter(l => l.pipeline_stage === 'won').length
    const lost = filteredL.filter(l => l.pipeline_stage === 'lost').length
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0

    // 6. Quotations sent / contracts signed
    const quotations = filteredD.filter(d => d.doc_type === 'quotation').length
    const contractsSigned = filteredD.filter(d => d.doc_type === 'contract' && d.status === 'signed').length

    // 7. Monthly performance (last 6 months)
    const monthlyMap: Record<string, { month: string; leads: number; won: number; value: number }> = {}
    L.forEach(l => {
      const d = new Date(l.created_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyMap[k]) monthlyMap[k] = { month: k, leads: 0, won: 0, value: 0 }
      monthlyMap[k].leads++
      if (l.pipeline_stage === 'won') { monthlyMap[k].won++; monthlyMap[k].value += l.estimated_value ?? 0 }
    })
    const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)

    // 8. Pipeline value by stage
    const pipelineValue: Record<string, number> = {}
    filteredL.forEach(l => {
      pipelineValue[l.pipeline_stage] = (pipelineValue[l.pipeline_stage] ?? 0) + (l.estimated_value ?? 0)
    })

    return NextResponse.json({
      summary: {
        total_leads:       filteredL.length,
        won, lost, winRate,
        total_meetings:    filteredM.length,
        quotations_sent:   quotations,
        contracts_signed:  contractsSigned,
        total_pipeline_value: filteredL.reduce((s: number, l: any) => s + (l.estimated_value ?? 0), 0),
      },
      bySource,
      byService,
      qualByRep,
      meetingsByRep,
      monthly,
      pipelineValue,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 })
  }
}
