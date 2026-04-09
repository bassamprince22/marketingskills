'use client'

import type { Activity } from '@/lib/sales/types'

const ACTION_COLORS: Record<string, string> = {
  stage_change:       '#4F8EF7',
  meeting_logged:     '#A78BFA',
  meeting_completed:  '#22D3EE',
  doc_uploaded:       '#FCD34D',
  lead_created:       '#4ADE80',
  lead_assigned:      '#60A5FA',
  note_added:         '#94A3B8',
  qualified:          '#34D399',
}

const ACTION_ICONS: Record<string, string> = {
  stage_change:       '⟿',
  meeting_logged:     '◷',
  meeting_completed:  '✓',
  doc_uploaded:       '⎗',
  lead_created:       '◎',
  lead_assigned:      '→',
  note_added:         '✎',
  qualified:          '✦',
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
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748B', fontSize: 13 }}>
        No activity yet
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {activities.map((a, i) => {
        const color = ACTION_COLORS[a.action_type] ?? '#64748B'
        const icon  = ACTION_ICONS[a.action_type]  ?? '·'
        return (
          <div
            key={a.id}
            style={{
              display: 'flex',
              gap: 12,
              padding: '10px 0',
              borderBottom: i < activities.length - 1 ? '1px solid #1E2D4A20' : 'none',
              animation: `slideUp 0.3s ease-out ${i * 0.04}s both`,
            }}
          >
            <div
              className="activity-dot"
              style={{ background: color, marginTop: 3 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#E2E8F0', fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ color, marginRight: 6 }}>{icon}</span>
                {a.description}
                {a.lead?.company_name && (
                  <span style={{ color: '#64748B' }}> — {a.lead.company_name}</span>
                )}
              </p>
              <p style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                {a.user?.name ?? 'System'} · {timeAgo(a.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
