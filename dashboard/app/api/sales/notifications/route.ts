import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export interface Notification {
  id:       string
  type:     'new_leads' | 'urgent' | 'stuck' | 'overdue' | 'unassigned' | 'hot_deals'
  severity: 'critical' | 'warning' | 'info'
  title:    string
  message:  string
  count:    number
  filterUrl: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'manager' && role !== 'admin') return NextResponse.json({ notifications: [] })

  const db   = getServiceClient()
  const now  = new Date()
  const notifications: Notification[] = []

  // ── 1. New leads in the last hour ────────────────────────────────
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const { count: newCount } = await db
    .from('sales_leads').select('id', { count: 'exact', head: true })
    .gt('created_at', oneHourAgo)
    .not('pipeline_stage', 'in', '(won,lost)')
  if ((newCount ?? 0) > 0) {
    notifications.push({
      id: 'new_leads',
      type: 'new_leads',
      severity: 'info',
      title: `${newCount} new lead${newCount !== 1 ? 's' : ''} in the last hour`,
      message: 'Fresh leads waiting to be contacted.',
      count: newCount ?? 0,
      filterUrl: '/sales/leads?stage=new_lead',
    })
  }

  // ── 2. Urgent leads with no activity for 24h+ ────────────────────
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { count: urgentCount } = await db
    .from('sales_leads').select('id', { count: 'exact', head: true })
    .eq('priority', 'urgent')
    .lt('updated_at', oneDayAgo)
    .not('pipeline_stage', 'in', '(won,lost)')
  if ((urgentCount ?? 0) > 0) {
    notifications.push({
      id: 'urgent',
      type: 'urgent',
      severity: 'critical',
      title: `${urgentCount} urgent lead${urgentCount !== 1 ? 's' : ''} need immediate attention`,
      message: 'No activity in 24+ hours on urgent priority leads.',
      count: urgentCount ?? 0,
      filterUrl: '/sales/leads?priority=urgent',
    })
  }

  // ── 3. Overdue follow-ups ─────────────────────────────────────────
  const today = now.toISOString().slice(0, 10)
  const { count: overdueCount } = await db
    .from('sales_leads').select('id', { count: 'exact', head: true })
    .lt('next_follow_up_date', today)
    .not('pipeline_stage', 'in', '(won,lost)')
  if ((overdueCount ?? 0) > 0) {
    notifications.push({
      id: 'overdue',
      type: 'overdue',
      severity: 'critical',
      title: `${overdueCount} overdue follow-up${overdueCount !== 1 ? 's' : ''}`,
      message: 'Follow-up dates have passed with no action taken.',
      count: overdueCount ?? 0,
      filterUrl: '/sales/leads',
    })
  }

  // ── 4. Unassigned leads ───────────────────────────────────────────
  const { count: unassignedCount } = await db
    .from('sales_leads').select('id', { count: 'exact', head: true })
    .is('assigned_rep_id', null)
    .not('pipeline_stage', 'in', '(won,lost)')
  if ((unassignedCount ?? 0) > 0) {
    notifications.push({
      id: 'unassigned',
      type: 'unassigned',
      severity: 'warning',
      title: `${unassignedCount} lead${unassignedCount !== 1 ? 's' : ''} unassigned`,
      message: 'These leads have no rep assigned and may be missed.',
      count: unassignedCount ?? 0,
      filterUrl: '/sales/leads?repId=unassigned',
    })
  }

  // ── 5. Leads stuck / idle for 7+ days ────────────────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: stuckCount } = await db
    .from('sales_leads').select('id', { count: 'exact', head: true })
    .lt('updated_at', sevenDaysAgo)
    .not('pipeline_stage', 'in', '(won,lost)')
  if ((stuckCount ?? 0) > 0) {
    notifications.push({
      id: 'stuck',
      type: 'stuck',
      severity: 'warning',
      title: `${stuckCount} lead${stuckCount !== 1 ? 's' : ''} idle for 7+ days`,
      message: 'No stage change or update in over a week.',
      count: stuckCount ?? 0,
      filterUrl: '/sales/leads',
    })
  }

  // ── 6. Hot deals (negotiation / contract_sent) stale 14d+ ────────
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { count: hotCount } = await db
    .from('sales_leads').select('id', { count: 'exact', head: true })
    .in('pipeline_stage', ['negotiation', 'contract_sent'])
    .lt('updated_at', fourteenDaysAgo)
  if ((hotCount ?? 0) > 0) {
    notifications.push({
      id: 'hot_deals',
      type: 'hot_deals',
      severity: 'critical',
      title: `${hotCount} deal${hotCount !== 1 ? 's' : ''} in negotiation stalled`,
      message: 'Contracts or negotiations with no movement in 14+ days.',
      count: hotCount ?? 0,
      filterUrl: '/sales/pipeline',
    })
  }

  // Sort: critical first, then warning, then info
  const order = { critical: 0, warning: 1, info: 2 }
  notifications.sort((a, b) => order[a.severity] - order[b.severity])

  return NextResponse.json({ notifications, total: notifications.length })
}
