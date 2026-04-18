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

function formatFollowUp(dateStr: string): { label: string; color: string; bg: string } {
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const date     = new Date(dateStr); date.setHours(0, 0, 0, 0)
  const diff     = Math.round((date.getTime() - today.getTime()) / 86400000)

  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: '#F87171', bg: 'rgba(220,38,38,0.08)' }
  if (diff === 0) return { label: 'Today',    color: '#F59E0B', bg: 'rgba(217,119,6,0.08)' }
  if (diff === 1) return { label: 'Tomorrow', color: '#4ADE80', bg: 'rgba(22,163,74,0.08)' }
  if (diff <= 7)  return {
    label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    color: '#7CB9FC', bg: 'rgba(79,142,247,0.06)',
  }
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: 'var(--text-muted)', bg: 'transparent',
  }
}

function FollowUpRow({ date, closed }: { date: string | null; closed: boolean }) {
  if (closed) return null
  if (!date) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>◌</span>
      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>No follow-up set</span>
    </div>
  )
  const { label, color, bg } = formatFollowUp(date)
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      marginTop: 7, padding: '2px 8px', borderRadius: 6,
      background: bg,
    }}>
      <span style={{ fontSize: 10, color }}>◷</span>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function RepAvatar({ rep }: { rep: { name: string; avatar_url?: string | null } | null | undefined }) {
  if (!rep) return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(100,116,139,0.2)', border: '1px solid rgba(100,116,139,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, color: 'var(--text-faint)',
    }}>?</div>
  )
  if (rep.avatar_url) return (
    <img src={rep.avatar_url} alt={rep.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, color: '#fff', fontWeight: 700,
    }}>{rep.name.charAt(0).toUpperCase()}</div>
  )
}

function InlineRepPicker({ lead, reps, onAssign }: {
  lead: Lead; reps: Rep[]; onAssign: (leadId: string, repId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(79,142,247,0.07)', border: '1px solid rgba(79,142,247,0.18)',
          borderRadius: 999, padding: '3px 10px',
          fontSize: 11, color: '#7CB9FC', cursor: 'pointer', maxWidth: '100%',
          transition: 'background 0.15s',
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(false) }} />
          <div className="fadaa-dropdown" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 50, minWidth: 180 }}>
            <p className="fadaa-dropdown-label">Assign to rep</p>
            {reps.map(r => (
              <button key={r.id} onClick={e => { e.preventDefault(); e.stopPropagation(); onAssign(lead.id, r.id); setOpen(false) }}
                className={`fadaa-dropdown-item${lead.assigned_rep_id === r.id ? ' active' : ''}`}>
                <div className="avatar avatar-xs">{r.name.charAt(0).toUpperCase()}</div>
                {lead.assigned_rep_id === r.id ? '✓ ' : ''}{r.name}
              </button>
            ))}
            {lead.assigned_rep_id && (
              <button onClick={e => { e.preventDefault(); e.stopPropagation(); onAssign(lead.id, null); setOpen(false) }}
                className="fadaa-dropdown-item" style={{ color: '#F87171', borderTop: '1px solid var(--border-subtle)' }}>
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
  const cardRef  = useRef<HTMLDivElement>(null)
  const pColor   = PRIORITY_COLORS[lead.priority] ?? '#7D8FA3'
  const today    = new Date().toISOString().slice(0, 10)
  const closed   = ['won', 'lost'].includes(lead.pipeline_stage)
  const isNew    = lead.created_at.slice(0, 10) === today && lead.pipeline_stage === 'new_lead'
  const isOverdue = !closed && lead.next_follow_up_date && lead.next_follow_up_date < today

  const borderColor = isOverdue
    ? 'rgba(220,38,38,0.7)'
    : isNew
    ? 'rgba(79,142,247,0.7)'
    : selected
    ? 'rgba(124,58,237,0.7)'
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
        outline: selected ? '1px solid rgba(124,58,237,0.35)' : 'none',
        transition: 'outline 0.15s',
      }}
    >
      <Link
        href={`/sales/leads/${lead.id}`}
        style={{ textDecoration: 'none', padding: '14px 16px', flex: 1, display: 'block', position: 'relative' }}
      >
        {/* Checkbox (bulk select) */}
        {onSelect && (
          <div
            onClick={e => { e.preventDefault(); e.stopPropagation(); onSelect(lead.id, !selected) }}
            style={{
              position: 'absolute', top: 10, left: -1,
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: selected ? '2px solid #7C3AED' : '2px solid rgba(100,116,139,0.4)',
              background: selected ? '#7C3AED' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s', zIndex: 10,
            }}
          >
            {selected && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
          </div>
        )}

        {/* NEW ribbon */}
        {isNew && (
          <span className="badge badge-new" style={{ position: 'absolute', top: 0, right: 0, borderRadius: '0 10px 0 6px' }}>
            ✦ NEW
          </span>
        )}

        {/* Company + contact */}
        <div style={{ marginBottom: 8, paddingRight: isNew ? 52 : 0, paddingLeft: onSelect ? 18 : 0 }}>
          <p className="t-card-title t-truncate" style={{ fontSize: 14 }}>{lead.company_name}</p>
          <p className="t-caption t-truncate" style={{ marginTop: 2 }}>
            {lead.contact_person}
            {lead.phone ? ` · ${lead.phone}` : lead.email ? ` · ${lead.email}` : ''}
          </p>
        </div>

        {/* Stage + value */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <StageBadge stage={lead.pipeline_stage} size="sm" />
          {lead.estimated_value ? (
            <span className="t-mono" style={{ color: '#4ADE80', fontSize: 13, fontWeight: 700 }}>
              ${(lead.estimated_value / 1000).toFixed(1)}k
            </span>
          ) : null}
        </div>

        {/* Follow-up date row */}
        <FollowUpRow date={lead.next_follow_up_date} closed={closed} />

        {/* Bottom row: service · source · time · rep avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
            <span className={`badge service-${lead.service_type}`} style={{ fontSize: 10 }}>
              {SERVICE_LABELS[lead.service_type]}
            </span>
            <span style={{ color: pColor, fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 6 }}>●</span>{lead.priority}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="t-caption" style={{ fontSize: 10 }}>
              {lead.lead_source === 'meta' ? '⚡ ' : ''}{timeAgo(lead.created_at)}
            </span>
            {canAssign && <RepAvatar rep={lead.assigned_rep} />}
          </div>
        </div>
      </Link>

      {/* Rep picker (managers) */}
      {canAssign && reps && onAssign && (
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--border-subtle)' }}>
          <InlineRepPicker lead={lead} reps={reps} onAssign={onAssign} />
        </div>
      )}
    </div>
  )
}
