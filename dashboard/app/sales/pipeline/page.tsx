'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import { StageBadge } from '@/components/sales/StageBadge'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { Lead, PipelineStageConfig } from '@/lib/sales/types'
import { DEFAULT_PIPELINE_STAGE_CONFIGS, STAGE_LABELS, SERVICE_LABELS, PRIORITY_LABELS } from '@/lib/sales/types'
import { normalizePipelineStages } from '@/lib/sales/pipeline'

interface Rep { id: string; name: string }

function RepPicker({ lead, reps, onAssign }: {
  lead: Lead; reps: Rep[]
  onAssign: (leadId: string, repId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(79,142,247,0.07)', border: '1px solid rgba(79,142,247,0.18)',
          borderRadius: 999, padding: '2px 8px', fontSize: 10, color: '#7CB9FC',
          cursor: 'pointer', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {lead.assigned_rep?.name ? `↳ ${lead.assigned_rep.name}` : '+ Assign'}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div className="fadaa-dropdown" style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50 }}>
            <p className="fadaa-dropdown-label">Assign rep</p>
            {reps.map(r => (
              <button
                key={r.id}
                onClick={() => { onAssign(lead.id, r.id); setOpen(false) }}
                className={`fadaa-dropdown-item${lead.assigned_rep_id === r.id ? ' active' : ''}`}
              >
                <div className="avatar avatar-xs">{r.name.charAt(0).toUpperCase()}</div>
                {lead.assigned_rep_id === r.id ? '✓ ' : ''}{r.name}
              </button>
            ))}
            {lead.assigned_rep_id && (
              <button
                onClick={() => { onAssign(lead.id, null); setOpen(false) }}
                className="fadaa-dropdown-item"
                style={{ color: '#F87171', borderTop: '1px solid var(--border-subtle)' }}
              >
                Remove
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60)         return 'just now'
  if (secs < 3600)       return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400)      return `${Math.floor(secs / 3600)}h ago`
  if (secs < 7 * 86400)  return `${Math.floor(secs / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Board = Record<string, Lead[]>

const STAGE_ACCENT: Record<string, string> = {
  new_lead:          '#64748B',
  contacted:         '#60A5FA',
  discovery:         '#818CF8',
  meeting_scheduled: '#A78BFA',
  meeting_completed: '#34D399',
  qualified:         '#6EE7B7',
  proposal_sent:     '#38BDF8',
  negotiation:       '#FCD34D',
  contract_sent:     '#FDBA74',
  won:               '#4ADE80',
  lost:              '#F87171',
}

function KanbanCard({ lead, index, reps, onAssign, canAssign, draggingId, onDragStart, onDragEnd }: {
  lead: Lead; index: number; reps: Rep[]
  onAssign: (leadId: string, repId: string | null) => void
  canAssign: boolean
  draggingId: string | null
  onDragStart: (id: string, srcStage: string) => void
  onDragEnd: () => void
}) {
  const today      = new Date().toISOString().slice(0, 10)
  const isNewToday = lead.created_at.slice(0, 10) === today && lead.pipeline_stage === 'new_lead'
  const isDraggingThis = draggingId === lead.id

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', lead.id)
        onDragStart(lead.id, lead.pipeline_stage)
        // Set opacity after ghost is captured
        const el = e.currentTarget as HTMLElement
        requestAnimationFrame(() => { el.style.opacity = '0.35' })
      }}
      onDragEnd={e => {
        ;(e.currentTarget as HTMLElement).style.opacity = '1'
        onDragEnd()
      }}
      style={{
        background: 'rgba(16,24,44,0.9)',
        border: `1px solid ${isNewToday ? 'rgba(79,142,247,0.25)' : 'var(--border-subtle)'}`,
        borderRadius: 10,
        padding: '11px 13px',
        marginBottom: 7,
        cursor: 'grab',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.15s, border-color 0.15s, opacity 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!isDraggingThis) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.45)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)' }}
    >
      <Link href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }} onClick={e => { if (isDraggingThis) e.preventDefault() }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <p className="t-card-title t-truncate">{lead.contact_person}</p>
            <p className="t-caption" style={{ marginTop: 2 }}>{lead.company_name}</p>
          </div>
          {isNewToday && (
            <span className="badge badge-new" style={{ fontSize: 9, flexShrink: 0, marginTop: 1 }}>NEW</span>
          )}
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
        <span className={`badge service-${lead.service_type}`} style={{ fontSize: 10 }}>
          {SERVICE_LABELS[lead.service_type]}
        </span>
        {lead.estimated_value ? (
          <span className="t-mono" style={{ color: '#4ADE80', fontSize: 11, fontWeight: 600 }}>
            ${(lead.estimated_value / 1000).toFixed(1)}k
          </span>
        ) : null}
      </div>

      {canAssign ? (
        <div style={{ marginTop: 8 }}>
          <RepPicker lead={lead} reps={reps} onAssign={onAssign} />
        </div>
      ) : lead.assigned_rep?.name ? (
        <p className="t-caption" style={{ marginTop: 6, fontSize: 10 }}>↳ {lead.assigned_rep.name}</p>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 7 }}>
        <span style={{ fontSize: 9, color: lead.lead_source === 'meta' ? '#7CB9FC' : 'var(--text-faint)' }}>
          {lead.lead_source === 'meta' ? '⚡' : '◎'}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>
          {lead.lead_source === 'meta' ? 'Meta · ' : ''}{timeAgo(lead.created_at)}
        </span>
      </div>
    </div>
  )
}

function PipelineContent() {
  const searchParams  = useSearchParams()
  const { data: session } = useSession()
  const role      = (session?.user as { role?: string })?.role ?? 'rep'
  const canAssign = role === 'admin' || role === 'manager'
  const dateRange = searchParams.get('dateRange') ?? ''

  const [board,        setBoard]        = useState<Board>({})
  const boardRef       = useRef<Board>({})
  const [reps,         setReps]         = useState<Rep[]>([])
  const [stageConfigs, setStageConfigs] = useState<PipelineStageConfig[]>(DEFAULT_PIPELINE_STAGE_CONFIGS)
  const stageConfigsRef = useRef<PipelineStageConfig[]>(DEFAULT_PIPELINE_STAGE_CONFIGS)
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState<'kanban' | 'list'>('kanban')

  // Native DnD state — refs avoid re-renders during drag
  const draggingRef = useRef<{ id: string; srcStage: string } | null>(null)
  const [draggingId,    setDraggingId]    = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const dragOverRef = useRef<string | null>(null)

  const stageKeys = stageConfigs.map(s => s.key)

  useEffect(() => { stageConfigsRef.current = stageConfigs }, [stageConfigs])
  useEffect(() => { boardRef.current = board }, [board])

  const loadLeads = useCallback(() => {
    setLoading(true)
    const q = new URLSearchParams({ limit: '500' })
    if (dateRange) q.set('dateRange', dateRange)
    const keys = stageConfigsRef.current.map(s => s.key)
    Promise.all([
      fetch(`/api/sales/leads?${q}`).then(r => r.ok ? r.json() : Promise.resolve({})),
      canAssign ? fetch('/api/sales/users?role=rep').then(r => r.ok ? r.json() : Promise.resolve({})) : Promise.resolve({ users: [] }),
    ]).then(([ld, ud]) => {
      const leads: Lead[] = ld.leads ?? []
      const b: Board = {}
      keys.forEach(s => { b[s] = [] })
      leads.forEach(l => { if (b[l.pipeline_stage]) b[l.pipeline_stage].push(l) })
      setBoard(b)
      setReps(ud.users ?? [])
      setLoading(false)
    })
  }, [canAssign, dateRange])

  useEffect(() => { loadLeads() }, [loadLeads])

  useEffect(() => {
    fetch('/api/sales/settings')
      .then(r => r.ok ? r.json() : Promise.resolve({}))
      .then(p => setStageConfigs(normalizePipelineStages(p.settings?.pipeline?.stages)))
      .catch(() => setStageConfigs(DEFAULT_PIPELINE_STAGE_CONFIGS))
  }, [])

  const handleAssign = useCallback(async (leadId: string, repId: string | null) => {
    setBoard(prev => {
      const next = { ...prev }
      for (const stage of Object.keys(next)) {
        next[stage] = (prev[stage] ?? []).map(l => {
          if (l.id !== leadId) return l
          const rep = repId ? (reps.find(r => r.id === repId) ?? null) : null
          return { ...l, assigned_rep_id: repId, assigned_rep: rep as any }
        })
      }
      return next
    })
    await fetch(`/api/sales/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_rep_id: repId }),
    })
  }, [reps])

  // Called from KanbanCard onDragStart
  const handleDragStart = useCallback((id: string, srcStage: string) => {
    draggingRef.current = { id, srcStage }
    setDraggingId(id)
  }, [])

  // Called from KanbanCard onDragEnd
  const handleDragEnd = useCallback(() => {
    draggingRef.current = null
    setDraggingId(null)
    dragOverRef.current = null
    setDragOverStage(null)
  }, [])

  // Column drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverRef.current !== stage) {
      dragOverRef.current = stage
      setDragOverStage(stage)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the column itself, not a child element
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      dragOverRef.current = null
      setDragOverStage(null)
    }
  }, [])

  // onDrop is a React synthetic event → state update is high-priority, no flash
  const handleDrop = useCallback((e: React.DragEvent, destStage: string) => {
    e.preventDefault()
    dragOverRef.current = null
    setDragOverStage(null)

    const d = draggingRef.current
    if (!d || d.srcStage === destStage) return

    const srcLead = boardRef.current[d.srcStage]?.find(l => l.id === d.id)
    if (!srcLead) return

    setBoard(prev => ({
      ...prev,
      [d.srcStage]: (prev[d.srcStage] ?? []).filter(l => l.id !== d.id),
      [destStage]:  [{ ...srcLead, pipeline_stage: destStage as any }, ...(prev[destStage] ?? [])],
    }))

    draggingRef.current = null
    setDraggingId(null)

    fetch(`/api/sales/leads/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: destStage }),
    }).then(r => { if (!r.ok) loadLeads() })
  }, [loadLeads])

  const totalValue = Object.values(board).flat().reduce((s, l) => s + (l.estimated_value ?? 0), 0)
  const totalLeads = Object.values(board).flat().length

  return (
    <SalesShell>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Pipeline</h1>
          <p className="t-caption">
            {totalLeads} leads · <span className="t-mono" style={{ color: '#4ADE80' }}>${(totalValue / 1000).toFixed(1)}k</span> total value
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="tab-bar">
            <button className={`tab${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>⊞ Kanban</button>
            <button className={`tab${view === 'list' ? ' active' : ''}`}   onClick={() => setView('list')}>≡ List</button>
          </div>
          <Link href="/sales/leads/new" className="fadaa-btn fadaa-btn-sm" style={{ textDecoration: 'none' }}>+ Lead</Link>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kanban-col skeleton" style={{ height: 280, borderRadius: 10, flexShrink: 0 }} />
          ))}
        </div>
      ) : view === 'kanban' ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 20, alignItems: 'flex-start' }}>
          {stageKeys.map(stage => {
            const cards    = board[stage] ?? []
            const accent   = STAGE_ACCENT[stage] ?? '#64748B'
            const colVal   = cards.reduce((s, l) => s + (l.estimated_value ?? 0), 0)
            const isTarget = dragOverStage === stage && draggingRef.current?.srcStage !== stage

            return (
              <div
                key={stage}
                className="kanban-col"
                style={{ flexShrink: 0 }}
                onDragOver={e => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, stage)}
              >
                {/* Column header */}
                <div style={{
                  padding: '9px 12px',
                  borderRadius: '10px 10px 0 0',
                  background: 'rgba(10,14,26,0.85)',
                  border: `1px solid ${accent}22`,
                  borderBottom: `2px solid ${accent}`,
                  marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: accent, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {stageConfigs.find(e => e.key === stage)?.label ?? STAGE_LABELS[stage] ?? stage}
                    </p>
                    <span className="badge" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}28`, fontSize: 10 }}>
                      {cards.length}
                    </span>
                  </div>
                  <p className="t-mono" style={{ marginTop: 3, fontSize: 11, color: colVal > 0 ? '#4ADE80' : 'var(--text-faint)' }}>
                    {colVal > 0 ? `$${(colVal / 1000).toFixed(1)}k` : '—'}
                  </p>
                </div>

                {/* Drop zone */}
                <div style={{
                  minHeight: 80,
                  borderRadius: 10,
                  padding: 3,
                  border: isTarget ? '1px dashed rgba(79,142,247,0.4)' : '1px solid transparent',
                  background: isTarget ? 'rgba(79,142,247,0.05)' : undefined,
                  transition: 'border-color 0.12s, background 0.12s',
                }}>
                  {cards.map((lead, i) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      index={i}
                      reps={reps}
                      onAssign={handleAssign}
                      canAssign={canAssign}
                      draggingId={draggingId}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                  {cards.length === 0 && !isTarget && (
                    <p style={{ color: 'var(--text-faint)', fontSize: 11, textAlign: 'center', padding: '18px 0', letterSpacing: '0.04em' }}>
                      Drop here
                    </p>
                  )}
                  {isTarget && (
                    <div style={{
                      height: 48, borderRadius: 8, border: '2px dashed rgba(79,142,247,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(79,142,247,0.6)', fontSize: 11,
                    }}>
                      Drop to move here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="fadaa-card fadaa-table-wrapper">
          <table className="fadaa-table">
            <thead>
              <tr>
                {['Company', 'Contact', 'Stage', 'Service', 'Value', 'Rep', 'Priority'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stageKeys.flatMap(stage =>
                (board[stage] ?? []).map(lead => (
                  <tr key={lead.id} onClick={() => window.location.href = `/sales/leads/${lead.id}`} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lead.company_name}</td>
                    <td>{lead.contact_person}</td>
                    <td><StageBadge stage={lead.pipeline_stage} size="sm" /></td>
                    <td>
                      <span className={`badge service-${lead.service_type}`} style={{ fontSize: 11 }}>
                        {SERVICE_LABELS[lead.service_type]}
                      </span>
                    </td>
                    <td className="t-mono" style={{ color: '#4ADE80', fontWeight: 600 }}>
                      {lead.estimated_value ? `$${(lead.estimated_value / 1000).toFixed(1)}k` : '—'}
                    </td>
                    <td>{lead.assigned_rep?.name ?? '—'}</td>
                    <td>
                      <span className={`badge priority-${lead.priority}`} style={{ fontSize: 10 }}>
                        {PRIORITY_LABELS[lead.priority]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </SalesShell>
  )
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<SalesShell><div className="t-caption" style={{ padding: 40 }}>Loading...</div></SalesShell>}>
      <PipelineContent />
    </Suspense>
  )
}
