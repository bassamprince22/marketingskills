'use client'

import { useRef, useState } from 'react'
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
  low: '#7D8FA3', medium: '#7CB9FC', high: '#F59E0B', urgent: '#F87171',
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60)        return 'just now'
  if (secs < 3600)      return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400)     return `${Math.floor(secs / 3600)}h ago`
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function InlineRepPicker({
  lead, reps, onAssign,
}: {
  lead: Lead; reps: Rep[]; onAssign: (leadId: string, repId: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(79,142,247,0.07)',
          border: '1px solid rgba(79,142,247,0.18)',
          borderRadius: 999, padding: '3px 10px',
          fontSize: 11, color: '#7CB9FC',
          cursor: 'pointer', maxWidth: '100%',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.14)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.07)')}
      >
        <span style={{ fontSize: 11, opacity: 0.7 }}>↳</span>
        <span className="t-truncate" style={{ maxWidth: 120 }}>
          {lead.assigned_rep?.name ?? 'Unassigned — assign'}
        </span>
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(false) }}
          />
          <div className="fadaa-dropdown" style={{
            position: 'absolute', bottom: '100%', left: 0,
            marginBottom: 4, zIndex: 50, minWidth: 180,
          }}>
            <p className="fadaa-dropdown-label">Assign to rep</p>
            {reps.map(r => (
              <button
                key={r.id}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onAssign(lead.id, r.id); setOpen(false) }}
                className={`fadaa-dropdown-item${lead.assigned_rep_id === r.id ? ' active' : ''}`}
              >
                <div className="avatar avatar-xs">{r.name.charAt(0).toUpperCase()}</div>
                {lead.assigned_rep_id === r.id ? '✓ ' : ''}{r.name}
              </button>
            ))}
            {lead.assigned_rep_id && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onAssign(lead.id, null); setOpen(false) }}
                className="fadaa-dropdown-item"
                style={{ color: '#F87171', borderTop: '1px solid var(--border-subtle)' }}
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
  const cardRef   = useRef<HTMLDivElement>(null)
  const pColor    = PRIORITY_COLORS[lead.priority] ?? '#7D8FA3'
  const idleDays  = daysSince(lead.updated_at)
  const isStale   = idleDays >= 7 && !['won', 'lost'].includes(lead.pipeline_stage)
  const today     = new Date().toISOString().slice(0, 10)
  const isOverdue = lead.next_follow_up_date && lead.next_follow_up_date < today && !['won', 'lost'].includes(lead.pipeline_stage)
  const overdueDays = isOverdue ? daysSince(lead.next_follow_up_date!) : 0
  const isNewToday  = lead.created_at.slice(0, 10) === today && lead.pipeline_stage === 'new_lead'

  const borderColor = isOverdue
    ? 'rgba(220,38,38,0.7)'
    : isNewToday
    ? 'rgba(79,142,247,0.7)'
    : isStale
    ? 'rgba(100,116,139,0.4)'
    : `${pColor}55`

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect || !cardRef.current) return
    cardRef.current.style.setProperty('--glow-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    cardRef.current.style.setProperty('--glow-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  return (
    <div
      ref={cardRef}
      className="fadaa-card"
      onMouseMove={handleMouseMove}
      style={{ borderLeft: `3px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}
    >
      <Link
        href={`/sales/leads/${lead.id}`}
        style={{ textDecoration: 'none', padding: '14px 16px', flex: 1, display: 'block', position: 'relative' }}
      >
        {/* Status ribbon */}
        {isNewToday && (
          <span className="badge badge-new" style={{ position: 'absolute', top: 0, right: 0, borderRadius: '0 10px 0 6px' }}>
            ✦ NEW
          </span>
        )}
        {!isNewToday && isOverdue && (
          <span className="badge badge-red" style={{ position: 'absolute', top: 0, right: 0, borderRadius: '0 10px 0 6px' }}>
            {overdueDays}D OVERDUE
          </span>
        )}
        {!isNewToday && !isOverdue && isStale && (
          <span className="badge badge-slate" style={{ position: 'absolute', top: 0, right: 0, borderRadius: '0 10px 0 6px' }}>
            {idleDays}D IDLE
          </span>
        )}

        {/* Company + contact */}
        <div style={{ marginBottom: 10, paddingRight: isNewToday || isOverdue || isStale ? 62 : 0 }}>
          <p className="t-card-title t-truncate">{lead.company_name}</p>
          <p className="t-caption t-truncate" style={{ marginTop: 2 }}>
            {lead.contact_person}{lead.phone ? ` · ${lead.phone}` : ''}
          </p>
        </div>

        {/* Stage + value */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <StageBadge stage={lead.pipeline_stage} size="sm" />
          {lead.estimated_value ? (
            <span className="t-mono" style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }}>
              ${(lead.estimated_value / 1000).toFixed(1)}k
            </span>
          ) : null}
        </div>

        {/* Service + priority */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className={`badge service-${lead.service_type}`} style={{ fontSize: 11 }}>
            {SERVICE_LABELS[lead.service_type]}
          </span>
          <span style={{ color: pColor, fontSize: 11, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 7 }}>●</span>{lead.priority}
          </span>
        </div>

        {/* Source + timestamp */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: lead.lead_source === 'meta' ? '#7CB9FC' : 'var(--text-faint)' }}>
            {lead.lead_source === 'meta' ? '⚡' : '◎'}
          </span>
          <span className="t-caption">
            {lead.lead_source === 'meta' ? 'Meta · ' : ''}{timeAgo(lead.created_at)}
          </span>
        </div>

        {/* Rep (read-only mode) */}
        {!canAssign && lead.assigned_rep && (
          <p className="t-caption" style={{ marginTop: 8 }}>↳ {lead.assigned_rep.name}</p>
        )}
      </Link>

      {canAssign && reps && onAssign && (
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--border-subtle)' }}>
          <InlineRepPicker lead={lead} reps={reps} onAssign={onAssign} />
        </div>
      )}
    </div>
  )
}
