import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { readSettings, writeSettings, DEFAULT_NOTIFICATIONS } from '@/lib/sales/autoAssign'
import { sendReportReminderEmail } from '@/lib/sales/emailReporter'

export interface Notification {
  id:        string
  type:      'new_leads' | 'urgent' | 'stuck' | 'overdue' | 'unassigned' | 'hot_deals' | 'daily_report' | 'challenge'
  severity:  'critical' | 'warning' | 'info'
  title:     string
  message:   string
  count:     number
  filterUrl: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = session.user as { role: string }
  if (role !== 'manager' && role !== 'admin') return NextResponse.json({ notifications: [] })

  const db  = getServiceClient()
  const cfg = await readSettings(db)
  const sys = cfg.notifications?.system ?? DEFAULT_NOTIFICATIONS.system
  const now = new Date()
  const notifications: Notification[] = []

  // ── 1. New leads ──────────────────────────────────────────────────
  if (sys.new_leads.enabled) {
    const hours = sys.new_leads.threshold_hours ?? 1
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
    const { count: newCount } = await db
      .from('sales_leads').select('id', { count: 'exact', head: true })
      .gt('created_at', since)
      .not('pipeline_stage', 'in', '(won,lost)')
    if ((newCount ?? 0) > 0) {
      notifications.push({
        id: 'new_leads', type: 'new_leads', severity: 'info',
        title:     `${newCount} new lead${newCount !== 1 ? 's' : ''} in the last ${hours}h`,
        message:   'Fresh leads waiting to be contacted.',
        count:     newCount ?? 0,
        filterUrl: '/sales/leads?stage=new_lead',
      })
    }
  }

  // ── 2. Urgent leads stale ─────────────────────────────────────────
  if (sys.urgent.enabled) {
    const hours = sys.urgent.threshold_hours ?? 24
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
    const { count: urgentCount } = await db
      .from('sales_leads').select('id', { count: 'exact', head: true })
      .eq('priority', 'urgent')
      .lt('updated_at', since)
      .not('pipeline_stage', 'in', '(won,lost)')
    if ((urgentCount ?? 0) > 0) {
      notifications.push({
        id: 'urgent', type: 'urgent', severity: 'critical',
        title:     `${urgentCount} urgent lead${urgentCount !== 1 ? 's' : ''} need immediate attention`,
        message:   `No activity in ${hours}+ hours on urgent priority leads.`,
        count:     urgentCount ?? 0,
        filterUrl: '/sales/leads?priority=urgent',
      })
    }
  }

  // ── 3. Overdue follow-ups ─────────────────────────────────────────
  if (sys.overdue.enabled) {
    const today = now.toISOString().slice(0, 10)
    const { count: overdueCount } = await db
      .from('sales_leads').select('id', { count: 'exact', head: true })
      .lt('next_follow_up_date', today)
      .not('pipeline_stage', 'in', '(won,lost)')
    if ((overdueCount ?? 0) > 0) {
      notifications.push({
        id: 'overdue', type: 'overdue', severity: 'critical',
        title:     `${overdueCount} overdue follow-up${overdueCount !== 1 ? 's' : ''}`,
        message:   'Follow-up dates have passed with no action taken.',
        count:     overdueCount ?? 0,
        filterUrl: '/sales/leads',
      })
    }
  }

  // ── 4. Unassigned leads ───────────────────────────────────────────
  if (sys.unassigned.enabled) {
    const { count: unassignedCount } = await db
      .from('sales_leads').select('id', { count: 'exact', head: true })
      .is('assigned_rep_id', null)
      .not('pipeline_stage', 'in', '(won,lost)')
    if ((unassignedCount ?? 0) > 0) {
      notifications.push({
        id: 'unassigned', type: 'unassigned', severity: 'warning',
        title:     `${unassignedCount} lead${unassignedCount !== 1 ? 's' : ''} unassigned`,
        message:   'These leads have no rep assigned and may be missed.',
        count:     unassignedCount ?? 0,
        filterUrl: '/sales/leads?repId=unassigned',
      })
    }
  }

  // ── 5. Idle / stuck leads ─────────────────────────────────────────
  if (sys.stuck.enabled) {
    const days  = sys.stuck.threshold_days ?? 7
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
    const { count: stuckCount } = await db
      .from('sales_leads').select('id', { count: 'exact', head: true })
      .lt('updated_at', since)
      .not('pipeline_stage', 'in', '(won,lost)')
    if ((stuckCount ?? 0) > 0) {
      notifications.push({
        id: 'stuck', type: 'stuck', severity: 'warning',
        title:     `${stuckCount} lead${stuckCount !== 1 ? 's' : ''} idle for ${days}+ days`,
        message:   'No stage change or update in over a week.',
        count:     stuckCount ?? 0,
        filterUrl: '/sales/leads',
      })
    }
  }

  // ── 6. Hot deals stalled ──────────────────────────────────────────
  if (sys.hot_deals.enabled) {
    const days  = sys.hot_deals.threshold_days ?? 14
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
    const { count: hotCount } = await db
      .from('sales_leads').select('id', { count: 'exact', head: true })
      .in('pipeline_stage', ['negotiation', 'contract_sent'])
      .lt('updated_at', since)
    if ((hotCount ?? 0) > 0) {
      notifications.push({
        id: 'hot_deals', type: 'hot_deals', severity: 'critical',
        title:     `${hotCount} deal${hotCount !== 1 ? 's' : ''} in negotiation stalled`,
        message:   `Contracts or negotiations with no movement in ${days}+ days.`,
        count:     hotCount ?? 0,
        filterUrl: '/sales/pipeline',
      })
    }
  }

  // ── 7. Daily report reminder ──────────────────────────────────────
  const drCfg = cfg.daily_report
  if (drCfg.reminder_enabled) {
    const currentHour = now.getHours()
    if (currentHour >= drCfg.reminder_hour) {
      const today = now.toISOString().slice(0, 10)
      try {
        const { data: allReps } = await db.from('sales_users')
          .select('id, name, email').eq('is_active', true).in('role', ['rep', 'manager'])

        const { data: submitted } = await db.from('sales_daily_reports')
          .select('user_id').eq('report_date', today).eq('status', 'submitted')

        const submittedIds = new Set((submitted ?? []).map(r => r.user_id))
        const missing      = (allReps ?? []).filter(r => !submittedIds.has(r.id))

        if (missing.length > 0) {
          notifications.push({
            id:        'daily_report',
            type:      'daily_report',
            severity:  'warning',
            title:     `${missing.length} rep${missing.length !== 1 ? 's' : ''} haven't submitted today's report`,
            message:   `${submittedIds.size} submitted · ${missing.length} pending`,
            count:     missing.length,
            filterUrl: '/sales/reports',
          })

          // Send email reminder once per day (throttle via settings)
          if (drCfg.email_reminder) {
            const today = now.toISOString().slice(0, 10)
            const cfgAny  = cfg as unknown as Record<string, unknown>
            const lastSent = cfgAny.last_report_email_date as string | undefined
            if (lastSent !== today) {
              const { data: managers } = await db.from('sales_users')
                .select('email').in('role', ['manager', 'admin']).eq('is_active', true)
              const managerEmails = (managers ?? []).map(m => m.email).filter(Boolean)
              if (managerEmails.length > 0) {
                await sendReportReminderEmail(managerEmails, missing, submittedIds.size)
                await writeSettings(db, { ...cfg, last_report_email_date: today } as unknown as Parameters<typeof writeSettings>[1])
              }
            }
          }
        }
      } catch { /* silent if table missing */ }
    }
  }

  // ── 8. Active challenge achievements ─────────────────────────────
  try {
    const { data: activeChallenges } = await db.from('sales_challenges')
      .select('id, title, target_amount, start_date, end_date, sales_challenge_rewards(*)')
      .eq('is_active', true)
      .limit(1)

    const challenge = activeChallenges?.[0]
    if (challenge && challenge.target_amount) {
      // Get leaderboard totals
      let leadsQ = db.from('sales_leads')
        .select('assigned_rep_id, estimated_value')
        .eq('pipeline_stage', 'won')
        .gte('updated_at', challenge.start_date)

      if (challenge.end_date) {
        leadsQ = leadsQ.lte('updated_at', challenge.end_date + 'T23:59:59')
      }

      const { data: wonLeads } = await leadsQ
      const repTotals: Record<string, number> = {}
      for (const lead of (wonLeads ?? [])) {
        if (lead.assigned_rep_id) {
          repTotals[lead.assigned_rep_id] = (repTotals[lead.assigned_rep_id] ?? 0) + Number(lead.estimated_value ?? 0)
        }
      }

      // Count reps who've hit target
      const achieved = Object.values(repTotals).filter(v => v >= Number(challenge.target_amount)).length
      if (achieved > 0) {
        notifications.push({
          id:        'challenge',
          type:      'challenge',
          severity:  'info',
          title:     `${achieved} rep${achieved !== 1 ? 's' : ''} reached the challenge target!`,
          message:   `${challenge.title} · ${achieved} rep${achieved !== 1 ? 's' : ''} hit $${Number(challenge.target_amount).toLocaleString()}`,
          count:     achieved,
          filterUrl: '/sales/challenges',
        })
      }
    }
  } catch { /* silent if table missing */ }

  const order = { critical: 0, warning: 1, info: 2 }
  notifications.sort((a, b) => order[a.severity] - order[b.severity])

  return NextResponse.json({ notifications, total: notifications.length })
}
