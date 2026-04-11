'use client'

import Link from 'next/link'
import { StageBadge } from './StageBadge'
import type { Lead } from '@/lib/sales/types'
import { SERVICE_LABELS } from '@/lib/sales/types'

interface Props { lead: Lead }

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748B', medium: '#60A5FA', high: '#FCD34D', urgent: '#F87171',
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

export function LeadCard({ lead }: Props) {
  const pColor     = PRIORITY_COLORS[lead.priority] ?? '#64748B'
  const idleDays   = daysSince(lead.updated_at)
  const isStale    = idleDays >= 7 && !['won','lost'].includes(lead.pipeline_stage)
  const today      = new Date().toISOString().slice(0, 10)
  const isOverdue  = lead.next_follow_up_date && lead.next_follow_up_date < today && !['won','lost'].includes(lead.pipeline_stage)
  const overdueDays = isOverdue ? daysSince(lead.next_follow_up_date!) : 0

  const borderColor = isOverdue ? '#EF4444' : isStale ? '#475569' : `${pColor}40`

  return (
    <Link href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="fadaa-card"
        style={{
          padding: 16,
          borderLeft: `3px solid ${borderColor}`,
          cursor: 'pointer',
          transition: 'transform 0.1s, box-shadow 0.1s',
          position: 'relative',
        }}
      >
        {/* Urgency ribbon */}
        {isOverdue && (
          <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239,68,68,0.15)', color: '#F87171', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: '0 8px 0 6px', letterSpacing: '0.05em' }}>
            {overdueDays}D OVERDUE
          </div>
        )}
        {!isOverdue && isStale && (
          <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(100,116,139,0.15)', color: '#94A3B8', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: '0 8px 0 6px' }}>
            {idleDays}D IDLE
          </div>
        )}

        {/* Company + service */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10, paddingRight: isOverdue || isStale ? 64 : 0 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.company_name}
            </p>
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.contact_person}{lead.phone ? ` · ${lead.phone}` : ''}
            </p>
          </div>
        </div>

        {/* Stage + value */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <StageBadge stage={lead.pipeline_stage} size="sm" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lead.estimated_value ? (
              <span style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }}>
                ${(lead.estimated_value / 1000).toFixed(1)}k
              </span>
            ) : null}
          </div>
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: 'rgba(79,142,247,0.1)', color: '#60A5FA' }}>
            {SERVICE_LABELS[lead.service_type]}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lead.next_follow_up_date && !isOverdue && (
              <span style={{ color: '#64748B', fontSize: 11 }}>
                follow-up {new Date(lead.next_follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {lead.assigned_rep && (
              <span style={{ color: '#64748B', fontSize: 11 }}>
                {lead.assigned_rep.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
