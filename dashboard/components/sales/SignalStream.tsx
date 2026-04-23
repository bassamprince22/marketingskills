'use client'

import Link from 'next/link'
import type { Activity } from '@/lib/sales/types'

interface Props { activities: Activity[] }

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60)    return 'now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

const ACTION_META: Record<string, { icon: string; color: string; bg: string }> = {
  lead_created:      { icon: '✦',  color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  lead_updated:      { icon: '✎',  color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
  stage_changed:     { icon: '⇢',  color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  note_added:        { icon: '✍',  color: '#67E8F9', bg: 'rgba(103,232,249,0.12)' },
  meeting_scheduled: { icon: '◻',  color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  meeting_completed: { icon: '✓',  color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
  deal_won:          { icon: '★',  color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  deal_lost:         { icon: '✕',  color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  default:           { icon: '◎',  color: '#94A3B8', bg: 'rgba(148,163,184,0.10)' },
}

function buildDescription(a: Activity): string {
  const lead = (a as Activity & { lead?: { company_name?: string } }).lead
  const user = (a as Activity & { user?: { name?: string } }).user
  if (a.description) return a.description
  const who  = user?.name ?? 'Someone'
  const what = lead?.company_name ? ` — ${lead.company_name}` : ''
  return `${who}${what}`
}

export function SignalStream({ activities }: Props) {
  return (
    <div
      className="fadaa-card"
      style={{
        background: 'linear-gradient(160deg, rgba(10,12,30,0.98) 0%, rgba(14,18,40,0.98) 100%)',
        border: '1px solid rgba(99,102,241,0.15)',
      }}
    >
      <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Signal Stream</h2>
        <Link href="/sales/leads" style={{ fontSize: 12, color: '#818CF8', textDecoration: 'none' }}>View all</Link>
      </div>

      {activities.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No recent activity</p>
        </div>
      ) : (
        <div style={{ padding: '8px 0', maxHeight: 320, overflowY: 'auto' }}>
          {activities.map((a, i) => {
            const meta = ACTION_META[a.action_type] ?? ACTION_META.default
            const lead = (a as Activity & { lead?: { id?: string } }).lead

            return (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 20px',
                  borderBottom: i < activities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: meta.color,
                }}>
                  {meta.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {lead?.id ? (
                    <Link href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.4, transition: 'color 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#E2E8F0' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#CBD5E1' }}
                      >
                        {buildDescription(a)}
                      </p>
                    </Link>
                  ) : (
                    <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.4 }}>{buildDescription(a)}</p>
                  )}
                </div>

                <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0, paddingTop: 1 }}>
                  {timeAgo(a.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
