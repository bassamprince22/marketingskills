'use client'

import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { SalesShell } from '@/components/sales/SalesShell'
import { StageBadge } from '@/components/sales/StageBadge'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import type { Lead } from '@/lib/sales/types'
import { PIPELINE_STAGES, STAGE_LABELS, SERVICE_LABELS, PRIORITY_LABELS } from '@/lib/sales/types'

interface Rep { id: string; name: string }

function RepPicker({ lead, reps, onAssign }: { lead: Lead; reps: Rep[]; onAssign: (leadId: string, repId: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const current = lead.assigned_rep?.name

  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Reassign lead"
        style={{
          background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)',
          borderRadius: 999, padding: '2px 8px', fontSize: 10, color: '#60A5FA',
          cursor: 'pointer', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {current ? `↳ ${current}` : '+ Assign'}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 10,
            zIndex: 50, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {reps.map(r => (
              <button
                key={r.id}
                onClick={() => { onAssign(lead.id, r.id); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 14px', fontSize: 13, color: lead.assigned_rep_id === r.id ? '#60A5FA' : '#E2E8F0',
                  background: lead.assigned_rep_id === r.id ? 'rgba(79,142,247,0.1)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {lead.assigned_rep_id === r.id ? '✓ ' : ''}{r.name}
              </button>
            ))}
            {lead.assigned_rep_id && (
              <button
                onClick={() => { onAssign(lead.id, null); setOpen(false) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12, color: '#F87171', background: 'transparent', border: 'none', borderTop: '1px solid #1E2D4A', cursor: 'pointer' }}
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

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d ago`
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

function KanbanCard({ lead, index, reps, onAssign, canAssign }: {
  lead: Lead; index: number; reps: Rep[]
  onAssign: (leadId: string, repId: string | null) => void
  canAssign: boolean
}) {
  const today      = new Date().toISOString().slice(0, 10)
  const isNewToday = lead.created_at.slice(0, 10) === today && lead.pipeline_stage === 'new_lead'

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            background: snapshot.isDragging ? '#1E2D4A' : '#131B2E',
            border: `1px solid ${snapshot.isDragging ? '#4F8EF7' : isNewToday ? '#4F8EF740' : '#1E2D4A'}`,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 8,
            cursor: 'grab',
            boxShadow: snapshot.isDragging
              ? '0 8px 32px rgba(79,142,247,0.3)'
              : '0 2px 8px rgba(0,0,0,0.3)',
            transition: snapshot.isDragging ? 'none' : 'box-shadow 0.15s',
          }}
        >
          <Link href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
                  {lead.company_name}
                </p>
                <p style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>{lead.contact_person}</p>
              </div>
              {isNewToday && (
                <span style={{ flexShrink: 0, background: 'rgba(79,142,247,0.18)', color: '#60A5FA', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999, letterSpacing: '0.08em', marginTop: 1 }}>
                  ✦ NEW
                </span>
              )}
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <span className={`service-${lead.service_type}`} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999 }}>
              {SERVICE_LABELS[lead.service_type]}
            </span>
            {lead.estimated_value ? (
              <span style={{ color: '#4ADE80', fontSize: 11, fontWeight: 600 }}>
                ${(lead.estimated_value / 1000).toFixed(1)}k
              </span>
            ) : null}
          </div>
          {canAssign ? (
            <div style={{ marginTop: 8 }}>
              <RepPicker lead={lead} reps={reps} onAssign={onAssign} />
            </div>
          ) : lead.assigned_rep?.name ? (
            <p style={{ color: '#64748B', fontSize: 10, marginTop: 6 }}>↳ {lead.assigned_rep.name}</p>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 7 }}>
            <span style={{ color: lead.lead_source === 'meta' ? '#60A5FA' : '#334155', fontSize: 9 }}>
              {lead.lead_source === 'meta' ? '⚡' : '◎'}
            </span>
            <span style={{ color: '#334155', fontSize: 9 }}>
              {lead.lead_source === 'meta' ? 'Meta · ' : ''}{timeAgo(lead.created_at)}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default function PipelinePage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const canAssign = role === 'admin' || role === 'manager'

  const [board,   setBoard]   = useState<Board>({})
  const [reps,    setReps]    = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [view,    setView]    = useState<'kanban' | 'list'>('kanban')

  const loadLeads = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/sales/leads?limit=500').then(r => r.json()),
      canAssign ? fetch('/api/sales/users?role=rep').then(r => r.json()) : Promise.resolve({ users: [] }),
    ]).then(([ld, ud]) => {
      const leads: Lead[] = ld.leads ?? []
      const b: Board = {}
      PIPELINE_STAGES.forEach(s => { b[s] = [] })
      leads.forEach(l => { if (b[l.pipeline_stage]) b[l.pipeline_stage].push(l) })
      setBoard(b)
      setReps(ud.users ?? [])
      setLoading(false)
    })
  }, [canAssign])

  useEffect(() => { loadLeads() }, [loadLeads])

  const handleAssign = useCallback(async (leadId: string, repId: string | null) => {
    // Optimistic update
    setBoard(prev => {
      const next = { ...prev }
      for (const stage of PIPELINE_STAGES) {
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

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const srcStage  = source.droppableId
    const destStage = destination.droppableId
    const lead      = board[srcStage]?.[source.index]
    if (!lead) return

    // Optimistic update
    setBoard(prev => {
      const next = { ...prev }
      next[srcStage]  = prev[srcStage].filter(l => l.id !== draggableId)
      const newLead   = { ...lead, pipeline_stage: destStage as any }
      next[destStage] = [
        ...prev[destStage].slice(0, destination.index),
        newLead,
        ...prev[destStage].slice(destination.index),
      ]
      return next
    })

    // Persist
    await fetch(`/api/sales/leads/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: destStage }),
    })
  }, [board])

  const totalValue = Object.values(board).flat().reduce((s, l) => s + (l.estimated_value ?? 0), 0)
  const totalLeads = Object.values(board).flat().length

  return (
    <SalesShell>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>⟿ Pipeline</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            {totalLeads} leads · ${(totalValue / 1000).toFixed(1)}k total value
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setView('kanban')}
            className={view === 'kanban' ? 'fadaa-btn' : 'fadaa-btn-ghost'}
            style={{ fontSize: 12 }}
          >
            ⊞ Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={view === 'list' ? 'fadaa-btn' : 'fadaa-btn-ghost'}
            style={{ fontSize: 12 }}
          >
            ≡ List
          </button>
          <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none' }}>
            + Lead
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fadaa-card kanban-col" style={{ height: 300 }} />
          ))}
        </div>
      ) : view === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 20, alignItems: 'flex-start' }}>
            {PIPELINE_STAGES.map(stage => {
              const cards  = board[stage] ?? []
              const accent = STAGE_ACCENT[stage]
              const colVal = cards.reduce((s, l) => s + (l.estimated_value ?? 0), 0)
              return (
                <div key={stage} className="kanban-col" style={{ flexShrink: 0 }}>
                  {/* Column header */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px 10px 0 0',
                    background: '#0F1629',
                    border: `1px solid ${accent}30`,
                    borderBottom: `2px solid ${accent}`,
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: accent, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {STAGE_LABELS[stage]}
                      </p>
                      <span style={{ background: `${accent}20`, color: accent, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                        {cards.length}
                      </span>
                    </div>
                    {colVal > 0 && (
                      <p style={{ color: '#64748B', fontSize: 10, marginTop: 3 }}>
                        ${(colVal / 1000).toFixed(1)}k
                      </p>
                    )}
                  </div>

                  {/* Drop zone */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={snapshot.isDraggingOver ? 'kanban-drop-active' : ''}
                        style={{
                          minHeight: 80,
                          borderRadius: 10,
                          padding: 4,
                          border: snapshot.isDraggingOver ? '1px dashed #4F8EF740' : '1px solid transparent',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        {cards.map((lead, i) => (
                          <KanbanCard key={lead.id} lead={lead} index={i} reps={reps} onAssign={handleAssign} canAssign={canAssign} />
                        ))}
                        {provided.placeholder}
                        {cards.length === 0 && !snapshot.isDraggingOver && (
                          <p style={{ color: '#1E2D4A', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                            Drop here
                          </p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        /* List view */
        <div className="fadaa-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2D4A' }}>
                {['Company', 'Contact', 'Stage', 'Service', 'Value', 'Rep', 'Priority'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PIPELINE_STAGES.flatMap(stage =>
                (board[stage] ?? []).map((lead, i) => (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: '1px solid #1E2D4A20', cursor: 'pointer' }}
                    onClick={() => window.location.href = `/sales/leads/${lead.id}`}
                  >
                    <td style={{ padding: '10px 16px', color: '#E2E8F0', fontWeight: 500 }}>{lead.company_name}</td>
                    <td style={{ padding: '10px 16px', color: '#94A3B8' }}>{lead.contact_person}</td>
                    <td style={{ padding: '10px 16px' }}><StageBadge stage={lead.pipeline_stage} size="sm" /></td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`service-${lead.service_type}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>
                        {SERVICE_LABELS[lead.service_type]}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#4ADE80', fontWeight: 600 }}>
                      {lead.estimated_value ? `$${(lead.estimated_value/1000).toFixed(1)}k` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#94A3B8' }}>{lead.assigned_rep?.name ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`priority-${lead.priority}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>
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
