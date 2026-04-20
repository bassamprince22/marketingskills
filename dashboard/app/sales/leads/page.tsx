'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import type { Lead } from '@/lib/sales/types'
import { PIPELINE_STAGES } from '@/lib/sales/types'

interface Rep { id: string; name: string }

const STAGE_META: Record<string, { label: string; color: string; bg: string }> = {
  new_lead:           { label: 'New Lead',       color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  contacted:          { label: 'Contacted',       color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  discovery:          { label: 'Discovery',       color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
  meeting_scheduled:  { label: 'Meeting Booked',  color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  meeting_completed:  { label: 'Meeting Done',    color: '#34D399', bg: 'rgba(52,211,153,0.12)'  },
  qualified:          { label: 'Qualified',       color: '#4ADE80', bg: 'rgba(74,222,128,0.12)'  },
  proposal_sent:      { label: 'Proposal Sent',   color: '#38BDF8', bg: 'rgba(56,189,248,0.12)'  },
  negotiation:        { label: 'Negotiation',     color: '#FB923C', bg: 'rgba(251,146,60,0.12)'  },
  contract_sent:      { label: 'Contract Sent',   color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  won:                { label: 'Won',             color: '#4ADE80', bg: 'rgba(74,222,128,0.12)'  },
  lost:               { label: 'Lost',            color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
}

const PRIORITY_META: Record<string, { color: string }> = {
  urgent: { color: '#F87171' },
  high:   { color: '#F59E0B' },
  medium: { color: '#60A5FA' },
  low:    { color: '#94A3B8' },
}

const SOURCE_META: Record<string, { color: string }> = {
  meta:     { color: '#60A5FA' },
  referral: { color: '#F59E0B' },
  website:  { color: '#4ADE80' },
  outbound: { color: '#A78BFA' },
  other:    { color: '#94A3B8' },
}

const AVATAR_PALETTE = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EC4899','#14B8A6','#EF4444']
function avatarColor(name: string) {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
}

function followUpDisplay(date: string | null, stage: string): { text: string; color: string } {
  if (!date || ['won', 'lost'].includes(stage)) return { text: '—', color: 'var(--text-faint)' }
  const today = new Date().toISOString().slice(0, 10)
  const diffDays = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000)
  if (date < today) return { text: `${Math.abs(diffDays)}d overdue`, color: '#F87171' }
  if (date === today) return { text: 'Today', color: '#F59E0B' }
  return { text: `in ${diffDays}d`, color: '#94A3B8' }
}

const COLS = '40px minmax(220px,1fr) 168px 90px 110px 150px 100px 120px 36px'

export default function LeadsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role      = (session?.user as { role?: string })?.role ?? 'rep'
  const canAssign = role === 'manager' || role === 'admin'

  const [leads,    setLeads]    = useState<Lead[]>([])
  const [dupeIds,  setDupeIds]  = useState<Set<string>>(new Set())
  const [reps,     setReps]     = useState<Rep[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState({ stage: '', serviceType: '', source: '', priority: '', repId: '', dateRange: '' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // Read URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    setSearch(sp.get('search') ?? '')
    setFilters({
      stage:       sp.get('stage')       ?? '',
      serviceType: sp.get('serviceType') ?? '',
      source:      sp.get('source')      ?? '',
      priority:    sp.get('priority')    ?? '',
      repId:       sp.get('repId')       ?? '',
      dateRange:   sp.get('dateRange')   ?? '',
    })
  }, [])

  // Sync to URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams()
    if (search)              sp.set('search',     search)
    if (filters.stage)       sp.set('stage',       filters.stage)
    if (filters.serviceType) sp.set('serviceType', filters.serviceType)
    if (filters.source)      sp.set('source',      filters.source)
    if (filters.priority)    sp.set('priority',    filters.priority)
    if (filters.repId)       sp.set('repId',       filters.repId)
    if (filters.dateRange)   sp.set('dateRange',   filters.dateRange)
    const url = sp.toString() ? `/sales/leads?${sp}` : '/sales/leads'
    window.history.replaceState({}, '', url)
  }, [search, filters])

  const loadLeads = useCallback(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (search)              sp.set('search',     search)
    if (filters.stage)       sp.set('stage',       filters.stage)
    if (filters.serviceType) sp.set('serviceType', filters.serviceType)
    if (filters.source)      sp.set('source',      filters.source)
    if (filters.priority)    sp.set('priority',    filters.priority)
    if (filters.repId)       sp.set('repId',       filters.repId)
    if (filters.dateRange)   sp.set('dateRange',   filters.dateRange)
    fetch(`/api/sales/leads?${sp}`)
      .then(r => r.json())
      .then(d => {
        const list: Lead[] = d.leads ?? []
        const emailCount = new Map<string, number>()
        const phoneCount = new Map<string, number>()
        list.forEach(l => {
          if (l.email) emailCount.set(l.email, (emailCount.get(l.email) ?? 0) + 1)
          if (l.phone) phoneCount.set(l.phone, (phoneCount.get(l.phone) ?? 0) + 1)
        })
        setDupeIds(new Set(
          list.filter(l =>
            (l.email && (emailCount.get(l.email) ?? 0) > 1) ||
            (l.phone && (phoneCount.get(l.phone) ?? 0) > 1)
          ).map(l => l.id)
        ))
        setLeads(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, filters])

  useEffect(() => {
    if (!canAssign) return
    fetch('/api/sales/users?role=rep').then(r => r.json()).then(d => setReps(d.users ?? []))
  }, [canAssign])

  useEffect(() => { loadLeads() }, [loadLeads])

  const toggleSelect = useCallback((id: string, on: boolean) =>
    setSelected(s => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n }), [])

  const toggleAll = () =>
    setSelected(s => s.size === leads.length ? new Set() : new Set(leads.map(l => l.id)))

  const clearSelection = () => setSelected(new Set())

  async function bulkAction(action: 'assign' | 'stage', value: string) {
    if (!value || selected.size === 0) return
    setBulkBusy(true)
    await fetch('/api/sales/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action, value: value || null }),
    })
    clearSelection()
    loadLeads()
    setBulkBusy(false)
  }

  const setFilter = (k: string) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters(f => ({ ...f, [k]: e.target.value }))

  const hasFilters = search || Object.values(filters).some(Boolean)
  const clearAll   = () => { setSearch(''); setFilters({ stage: '', serviceType: '', source: '', priority: '', repId: '', dateRange: '' }) }

  return (
    <SalesShell>
      {/* Page header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: 0 }}>Leads</h1>
          <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 5 }}>
            All prospects across your constellation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canAssign && (
            <Link href="/sales/import" className="fadaa-btn-ghost fadaa-btn-sm"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ↧ Import
            </Link>
          )}
          <Link href="/sales/leads/new" className="fadaa-btn fadaa-btn-sm" style={{ textDecoration: 'none' }}>
            + New Lead
          </Link>
        </div>
      </div>

      {/* Main table card */}
      <div style={{
        background: 'rgba(9,13,30,0.97)',
        border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Filter bar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="fadaa-input"
              style={{ paddingLeft: 34 }}
              placeholder="Search leads, deals, people..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="filter-select" value={filters.stage} onChange={setFilter('stage')} style={{ minWidth: 140 }}>
            <option value="">All stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>)}
          </select>

          {canAssign && (
            <select className="filter-select" value={filters.repId} onChange={setFilter('repId')} style={{ minWidth: 120 }}>
              <option value="">All reps</option>
              <option value="unassigned">Unassigned</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}

          <select className="filter-select" value={filters.dateRange} onChange={setFilter('dateRange')}>
            <option value="">All time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
          </select>

          <select className="filter-select" value={filters.priority} onChange={setFilter('priority')}>
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select className="filter-select" value={filters.source} onChange={setFilter('source')}>
            <option value="">All sources</option>
            <option value="meta">Meta</option>
            <option value="referral">Referral</option>
            <option value="website">Website</option>
            <option value="outbound">Outbound</option>
            <option value="other">Other</option>
          </select>

          {hasFilters && (
            <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={clearAll}>Clear</button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {canAssign && leads.length > 0 && (
              <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={toggleAll} style={{ fontSize: 11 }}>
                {selected.size === leads.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono, monospace)' }}>
              {loading ? '…' : `${leads.length} / ${leads.length}`}
            </span>
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: COLS, alignItems: 'center',
          padding: '10px 20px', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div />
          {['Company','Stage','Value','Priority','Owner','Source','Follow-up',''].map(col => (
            <div key={col} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'var(--text-faint)', textTransform: 'uppercase',
            }}>
              {col}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: COLS, gap: 8,
                padding: '16px 20px', alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
                <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 3 }} />
                <div>
                  <div className="skeleton" style={{ height: 13, width: '55%', borderRadius: 4, marginBottom: 7 }} />
                  <div className="skeleton" style={{ height: 10, width: '38%', borderRadius: 4 }} />
                </div>
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="skeleton" style={{ height: 22, borderRadius: 99 }} />
                ))}
                <div />
              </div>
            ))
          ) : leads.length === 0 ? (
            <div style={{ padding: '64px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: 'var(--text-faint)', marginBottom: 14 }}>No leads found</p>
              {hasFilters
                ? <button className="fadaa-btn-ghost" onClick={clearAll}>Clear Filters</button>
                : <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none' }}>+ Add Lead</Link>
              }
            </div>
          ) : leads.map((lead, i) => {
            const sm     = STAGE_META[lead.pipeline_stage] ?? { label: lead.pipeline_stage, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' }
            const pm     = PRIORITY_META[lead.priority]   ?? { color: '#94A3B8' }
            const srcm   = SOURCE_META[lead.lead_source ?? 'other'] ?? SOURCE_META.other
            const fu     = followUpDisplay(lead.next_follow_up_date, lead.pipeline_stage)
            const rep    = lead.assigned_rep as { name: string } | null | undefined
            const isDupe = dupeIds.has(lead.id)
            const isSel  = selected.has(lead.id)
            const isLast = i === leads.length - 1

            return (
              <div
                key={lead.id}
                onClick={() => router.push(`/sales/leads/${lead.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 8,
                  padding: '0 20px', alignItems: 'center', minHeight: 62,
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  background: isSel ? 'rgba(79,142,247,0.07)' : 'transparent',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(79,142,247,0.07)' : 'transparent' }}
              >
                {/* Checkbox */}
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                  {canAssign ? (
                    <button
                      onClick={e => { e.stopPropagation(); toggleSelect(lead.id, !isSel) }}
                      style={{
                        width: 16, height: 16, borderRadius: 4, padding: 0, flexShrink: 0,
                        border: isSel ? '2px solid #4F8EF7' : '2px solid rgba(100,116,139,0.45)',
                        background: isSel ? '#4F8EF7' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.1s',
                      }}
                    >
                      {isSel && (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ) : <div style={{ width: 16 }} />}
                </div>

                {/* Company */}
                <div style={{ padding: '14px 0', minWidth: 0 }} onClick={e => e.stopPropagation()}>
                  <Link href={`/sales/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                        {lead.contact_person}
                      </span>
                      {isDupe && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)', color: '#FB923C', flexShrink: 0 }}>
                          DUPE
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 240 }}>
                      {lead.company_name}{lead.phone ? ` · ${lead.phone}` : ''}
                    </span>
                  </Link>
                </div>

                {/* Stage */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 999,
                    background: sm.bg, border: `1px solid ${sm.color}30`,
                    fontSize: 12, fontWeight: 600, color: sm.color,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.color, flexShrink: 0 }} />
                    {sm.label}
                  </span>
                </div>

                {/* Value */}
                <div>
                  {lead.estimated_value ? (
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#4ADE80', fontFamily: 'var(--font-mono, monospace)' }}>
                      ${lead.estimated_value >= 1000 ? `${Math.round(lead.estimated_value / 1000)}k` : lead.estimated_value}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>
                  )}
                </div>

                {/* Priority */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: pm.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: pm.color, fontWeight: 500, textTransform: 'capitalize' }}>
                    {lead.priority}
                  </span>
                </div>

                {/* Owner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {rep ? (
                    <>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: `${avatarColor(rep.name)}22`, border: `1.5px solid ${avatarColor(rep.name)}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: avatarColor(rep.name),
                      }}>
                        {rep.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, color: '#CBD5E1', fontWeight: 500 }}>
                        {rep.name.split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                  )}
                </div>

                {/* Source */}
                <div>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                    background: `${srcm.color}10`, border: `1px solid ${srcm.color}30`,
                    fontSize: 11, fontWeight: 600, color: srcm.color,
                    whiteSpace: 'nowrap',
                  }}>
                    {lead.lead_source ?? 'other'}
                  </span>
                </div>

                {/* Follow-up */}
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: fu.color, whiteSpace: 'nowrap' }}>
                    {fu.text}
                  </span>
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bulk action tray */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(13,21,38,0.96)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(79,142,247,0.25)', borderRadius: 14,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100, whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
          <select className="filter-select" disabled={bulkBusy} defaultValue=""
            onChange={e => { bulkAction('assign', e.target.value); e.target.value = '' }} style={{ fontSize: 12 }}>
            <option value="" disabled>Assign to…</option>
            <option value="null">— Unassign</option>
            {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="filter-select" disabled={bulkBusy} defaultValue=""
            onChange={e => { bulkAction('stage', e.target.value); e.target.value = '' }} style={{ fontSize: 12 }}>
            <option value="" disabled>Move stage…</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>)}
          </select>
          <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={clearSelection} style={{ fontSize: 12, padding: '4px 10px' }}>
            ✕ Clear
          </button>
        </div>
      )}
    </SalesShell>
  )
}
