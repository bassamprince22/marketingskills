'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StageBadge } from './StageBadge'
import type { Lead } from '@/lib/sales/types'
import { SERVICE_LABELS } from '@/lib/sales/types'

interface Rep { id: string; name: string }

interface Props {
  lead:       Lead
  canAssign?: boolean
  reps?:      Rep[]
  onAssign?:  (leadId: string, repId: string | null) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748B', medium: '#60A5FA', high: '#FCD34D', urgent: '#F87171',
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60)   return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function InlineRepPicker({ lead, reps, onAssign }: { lead: Lead; reps: Rep[]; onAssign: (leadId: string, repId: string | null) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)',
          borderRadius: 999, padding: '3px 10px', fontSize: 11, color: '#60A5FA',
          cursor: 'pointer', maxWidth: '100%',
        }}
      >
        <span style={{ fontSize: 12 }}>↳</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.assigned_rep?.name ?? 'Unassigned — click to assign'}
        </span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(false) }}
          />
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
            background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 10,
            zIndex: 50, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            <p style={{ padding: '8px 12px 4px', fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Assign to rep
            </p>
            {reps.map(r => (
              <button
                key={r.id}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onAssign(lead.id, r.id); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 12px', fontSize: 13,
                  color: lead.assigned_rep_id === r.id ? '#60A5FA' : '#E2E8F0',
                  background: lead.assigned_rep_id === r.id ? 'rgba(79,142,247,0.1)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                {lead.assigned_rep_id === r.id ? '✓ ' : ''}{r.name}
              </button>
            ))}
            {lead.assigned_rep_id && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onAssign(lead.id, null); setOpen(false) }}
                style={{ display: 'block', width: '100%', padding: '8px 12px', fontSize: 12, color: '#F87171', background: 'transparent', border: 'none', borderTop: '1px solid #1E2D4A', cursor: 'pointer', textAlign: 'left' }}
              >
                Remove assignment
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function LeadCard({ lead, canAssign, reps, onAssign }: Props) {
  const pColor     = PRIORITY_COLORS[lead.priority] ?? '#64748B'
  const idleDays   = daysSince(lead.updated_at)
  const isStale    = idleDays >= 7 && !['won','lost'].includes(lead.pipeline_stage)
  const today      = new Date().toISOString().slice(0, 10)
  const isOverdue  = lead.next_follow_up_date && lead.next_follow_up_date < today && !['won','lost'].includes(lead.pipeline_stage)
  const overdueDays = isOverdue ? daysSince(lead.next_follow_up_date!) : 0

  const borderColor = isOverdue ? '#EF4444' : isStale ? '#475569' : `${pColor}40`

  return (
    <div
      className="fadaa-card"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Link href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none', padding: '14px 16px', flex: 1 }}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className={`service-${lead.service_type}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>
            {SERVICE_LABELS[lead.service_type]}
          </span>
          <span style={{ color: pColor, fontSize: 11, flexShrink: 0 }}>● {lead.priority}</span>
        </div>

        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: lead.lead_source === 'meta' ? '#60A5FA' : '#475569', fontSize: 10 }}>
            {lead.lead_source === 'meta' ? '⚡' : '◎'}
          </span>
          <span style={{ color: '#475569', fontSize: 10 }}>
            {lead.lead_source === 'meta' ? 'Meta · ' : ''}{timeAgo(lead.created_at)}
          </span>
        </div>

        {!canAssign && lead.assigned_rep && (
          <p style={{ color: '#64748B', fontSize: 11, marginTop: 8 }}>
            ↳ {lead.assigned_rep.name}
          </p>
        )}
      </Link>

      {canAssign && reps && onAssign && (
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #1E2D4A20' }}>
          <InlineRepPicker lead={lead} reps={reps} onAssign={onAssign} />
        </div>
      )}
    </div>
  )
}
