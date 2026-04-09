'use client'

import Link from 'next/link'
import { StageBadge } from './StageBadge'
import type { Lead } from '@/lib/sales/types'
import { PRIORITY_LABELS, SERVICE_LABELS } from '@/lib/sales/types'

interface Props { lead: Lead }

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748B', medium: '#60A5FA', high: '#FCD34D', urgent: '#F87171',
}

export function LeadCard({ lead }: Props) {
  const pColor = PRIORITY_COLORS[lead.priority] ?? '#64748B'

  return (
    <Link href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="fadaa-card p-4 cursor-pointer"
        style={{ borderLeft: `3px solid ${pColor}30` }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14 }}>
              {lead.company_name}
            </p>
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
              {lead.contact_person}
              {lead.phone ? ` · ${lead.phone}` : ''}
            </p>
          </div>
          <span
            className={`service-${lead.service_type}`}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {SERVICE_LABELS[lead.service_type]}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <StageBadge stage={lead.pipeline_stage} size="sm" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lead.estimated_value ? (
              <span style={{ color: '#4ADE80', fontSize: 12, fontWeight: 600 }}>
                ${(lead.estimated_value / 1000).toFixed(1)}k
              </span>
            ) : null}
            <span
              style={{ color: pColor, fontSize: 11 }}
              title={`Priority: ${PRIORITY_LABELS[lead.priority]}`}
            >
              ● {lead.priority}
            </span>
          </div>
        </div>

        {lead.assigned_rep && (
          <p style={{ color: '#64748B', fontSize: 11, marginTop: 8 }}>
            ↳ {lead.assigned_rep.name}
          </p>
        )}
      </div>
    </Link>
  )
}
