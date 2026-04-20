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
  selected?:  boolean
  onSelect?:  (leadId: string, on: boolean) => void
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

function FollowUpRow({ date, isManager }: { date: string | null; isManager: boolean }) {
  if (!date) {
    if (!isManager) return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>◌</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>No follow-up set</span>
      </div>
    )
  }

  const today    = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const diffDays = Math.floor((new Date(date).getTime() - new Date(today).getTime()) / 86400000)

  let label: string
  let color: string
  let bg = 'transparent'

  if (date < today) {
    const overdue = daysSince(date)
    label = `⚠ ${overdue}d overdue`
    color = '#F87171'
    bg    = 'rgba(220,38,38,0.08)'
  } else if (date === today) {
    label = '◷ Today'
    color = '#F59E0B'
  } else if (date === tomorrow) {
    label = '◷ Tomorrow'
    color = '#4ADE80'
  } else if (diffDays <= 7) {
    label = `◷ ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
    color = 'var(--text-secondary)'
  } else {
    label = `◷ ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    color = 'var(--text-secondary)'
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
      background: bg, borderRadius: 4,
      padding: bg !== 'transparent' ? '2px 6px' : '0',
    }}>
      <span style={{ fontSize: 11, color, fontWeight: date < today ? 600 : 400 }}>{label}</span>
    </div>
  )
}

function RepAvatar({ rep }: { rep: { name: string; avatar_url?: string | null } }) {
  if (rep.avatar_url) {
    return (
      <img
        src={rep.avatar_url}
        alt={rep.name}
        style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(79,142,247,0.2)', border: '1px solid rgba(79,142,247,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#7CB9FC',
    }}>
      {rep.name.charAt(0).toUpperCase()}
    </div>
  )
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

export function LeadCard({ lead, canAssign, reps, onAssign, selected, onSelect }: Props) {
  const cardRef   = useRef<HTMLDivElement>(null)
  const pColor    = PRIORITY_COLORS[lead.priority] ?? '#7D8FA3'
  const today     = new Date().toISOString().slice(0, 10)
  const isOverdue = lead.next_follow_up_date && lead.next_follow_up_date < today && !['won', 'lost'].includes(lead.pipeline_stage)
  const isNewToday = lead.created_at.slice(0, 10) === today && lead.pipeline_stage === 'new_lead'

  const borderColor = isOverdue
    ? 'rgba(220,38,38,0.7)'
    : isNewToday
    ? 'rgba(79,142,247,0.7)'
    : selected
    ? 'rgba(79,142,247,0.9)'
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
      style={{
        borderLeft: `3px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column',
        outline: selected ? '1px solid rgba(79,142,247,0.35)' : 'none',
        transition: 'outline 0.1s',
      }}
    >
      <Link
        href={`/sales/leads/${lead.id}`}
        style={{ textDecoration: 'none', padding: '14px 16px', flex: 1, display: 'block', position: 'relative' }}
      >
        {/* Top row: checkbox + value */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
            {onSelect && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onSelect(lead.id, !selected) }}
                style={{
                  flexShrink: 0,
                  width: 16, height: 16,
                  borderRadius: 4,
                  border: selected ? '2px solid #4F8EF7' : '2px solid rgba(100,116,139,0.5)',
                  background: selected ? '#4F8EF7' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, marginTop: 2,
                  transition: 'background 0.1s, border-color 0.1s',
                }}
                aria-label={selected ? 'Deselect lead' : 'Select lead'}
              >
                {selected && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <p className="t-card-title t-truncate">{lead.company_name}</p>
              <p className="t-caption t-truncate" style={{ marginTop: 2 }}>
                {lead.contact_person}{lead.phone ? ` · ${lead.phone}` : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 4 }}>
            {isNewToday && (
              <span className="badge badge-new" style={{ fontSize: 9 }}>✦ NEW</span>
            )}
            {lead.estimated_value ? (
              <span className="t-mono" style={{ color: '#4ADE80', fontSize: 12, fontWeight: 700 }}>
                ${(lead.estimated_value / 1000).toFixed(1)}k
              </span>
            ) : null}
          </div>
        </div>

        {/* Stage + priority row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <StageBadge stage={lead.pipeline_stage} size="sm" />
          <span style={{ color: pColor, fontSize: 11, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 7 }}>●</span>{lead.priority}
          </span>
        </div>

        {/* Follow-up row */}
        <FollowUpRow date={lead.next_follow_up_date} isManager={!!canAssign} />

        {/* Source + timestamp + rep avatar */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: lead.lead_source === 'meta' ? '#7CB9FC' : 'var(--text-faint)' }}>
            {lead.lead_source === 'meta' ? '⚡' : '◎'}
          </span>
          <span className="t-caption" style={{ flex: 1, minWidth: 0 }}>
            <span className={`badge service-${lead.service_type}`} style={{ fontSize: 10, marginRight: 4 }}>
              {SERVICE_LABELS[lead.service_type]}
            </span>
            {lead.lead_source === 'meta' ? 'Meta · ' : ''}{timeAgo(lead.created_at)}
          </span>
          {lead.lead_source === 'meta' && lead.meta_raw_payload && Object.keys(lead.meta_raw_payload.fields ?? {}).length > 0 && (
            <span title="Has Meta form answers" style={{ fontSize: 10, color: '#4F8EF7', background: 'rgba(79,142,247,0.1)', padding: '1px 5px', borderRadius: 4 }}>
              {Object.keys(lead.meta_raw_payload.fields).length}f
            </span>
          )}
          {canAssign && lead.assigned_rep && (
            <RepAvatar rep={lead.assigned_rep as any} />
          )}
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
