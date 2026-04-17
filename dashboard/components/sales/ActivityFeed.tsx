'use client'

import type { Activity } from '@/lib/sales/types'

const ACTION_COLORS: Record<string, string> = {
  stage_change:      'var(--brand-primary)',
  meeting_logged:    'var(--brand-secondary)',
  meeting_completed: 'var(--brand-cyan)',
  doc_uploaded:      '#FCD34D',
  lead_created:      '#4ADE80',
  lead_assigned:     '#60A5FA',
  note_added:        'var(--text-muted)',
  qualified:         '#34D399',
}

const ACTION_ICONS: Record<string, string> = {
  stage_change:      '⟿',
  meeting_logged:    '◷',
  meeting_completed: '✓',
  doc_uploaded:      '⎗',
  lead_created:      '◎',
  lead_assigned:     '→',
  note_added:        '✎',
  qualified:         '✦',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props { activities: Activity[] }

export function ActivityFeed({ activities }: Props) {
  if (!activities.length) {
    return (
      <div className="empty-state" style={{ padding: '24px 0' }}>
        <p className="t-caption">No activity yet</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {activities.map((a, i) => {
        const color = ACTION_COLORS[a.action_type] ?? 'var(--text-muted)'
        const icon  = ACTION_ICONS[a.action_type]  ?? '·'
        return (
          <div
            key={a.id}
            style={{
              display: 'flex', gap: 12,
              padding: '10px 0',
              borderBottom: i < activities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              animation: `slideUp 0.3s ease-out ${i * 0.04}s both`,
            }}
          >
            <div
              className="activity-dot"
              style={{ background: color, marginTop: 3, flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-body" style={{ lineHeight: 1.4 }}>
                <span style={{ color, marginRight: 6 }}>{icon}</span>
                {a.description}
                {a.lead?.company_name && (
                  <span className="t-caption" style={{ marginLeft: 4 }}>— {a.lead.company_name}</span>
                )}
              </p>
              <p className="t-caption" style={{ marginTop: 2 }}>
                {a.user?.name ?? 'System'} · {timeAgo(a.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
