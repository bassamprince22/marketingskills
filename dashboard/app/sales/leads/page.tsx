'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { LeadCard } from '@/components/sales/LeadCard'
import type { Lead } from '@/lib/sales/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/lib/sales/types'

interface Rep { id: string; name: string }

export default function LeadsPage() {
  const { data: session } = useSession()
  const role      = (session?.user as { role?: string })?.role ?? 'rep'
  const canAssign = role === 'manager' || role === 'admin'

  const [leads,    setLeads]    = useState<Lead[]>([])
  const [reps,     setReps]     = useState<Rep[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState({ stage: '', serviceType: '', source: '', priority: '', repId: '' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // ── Read initial state from URL on mount ──────────────────────────────
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
    })
  }, [])

  // ── Sync filters → URL silently ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams()
    if (search)              sp.set('search',      search)
    if (filters.stage)       sp.set('stage',        filters.stage)
    if (filters.serviceType) sp.set('serviceType',  filters.serviceType)
    if (filters.source)      sp.set('source',       filters.source)
    if (filters.priority)    sp.set('priority',     filters.priority)
    if (filters.repId)       sp.set('repId',        filters.repId)
    const url = sp.toString() ? `/sales/leads?${sp}` : '/sales/leads'
    window.history.replaceState({}, '', url)
  }, [search, filters])

  const loadLeads = useCallback(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (search)              sp.set('search',      search)
    if (filters.stage)       sp.set('stage',        filters.stage)
    if (filters.serviceType) sp.set('serviceType',  filters.serviceType)
    if (filters.source)      sp.set('source',       filters.source)
    if (filters.priority)    sp.set('priority',     filters.priority)
    if (filters.repId)       sp.set('repId',        filters.repId)
    fetch(`/api/sales/leads?${sp}`)
      .then(r => r.json())
      .then(d => { setLeads(d.leads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, filters])

  useEffect(() => {
    if (!canAssign) return
    fetch('/api/sales/users?role=rep').then(r => r.json()).then(d => setReps(d.users ?? []))
  }, [canAssign])

  useEffect(() => { loadLeads() }, [loadLeads])

  const handleAssign = useCallback(async (leadId: string, repId: string | null) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l
      const rep = repId ? (reps.find(r => r.id === repId) ?? null) : null
      return { ...l, assigned_rep_id: repId, assigned_rep: rep as any }
    }))
    await fetch(`/api/sales/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_rep_id: repId }),
    })
  }, [reps])

  // ── Bulk selection ─────────────────────────────────────────────────────
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
      body: JSON.stringify({ ids: [...selected], action, value: value || null }),
    })
    clearSelection()
    loadLeads()
    setBulkBusy(false)
  }

  const setFilter = (k: string) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters(f => ({ ...f, [k]: e.target.value }))

  const hasFilters = search || Object.values(filters).some(Boolean)
  const clearAll   = () => { setSearch(''); setFilters({ stage: '', serviceType: '', source: '', priority: '', repId: '' }) }

  return (
    <SalesShell>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Leads</h1>
          <p className="t-caption">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {role === 'rep' ? ' in your orbit' : ' across all reps'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canAssign && leads.length > 0 && (
            <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={toggleAll}>
              {selected.size === leads.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
          {canAssign && (
            <Link href="/sales/import" className="fadaa-btn-ghost fadaa-btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ↧ Import CSV
            </Link>
          )}
          <Link href="/sales/leads/new" className="fadaa-btn fadaa-btn-sm" style={{ textDecoration: 'none' }}>+ New Lead</Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="fadaa-card" style={{ padding: '12px 16px', marginBottom: 20 }}>
        <div className="filter-bar">
          <input
            className="fadaa-input"
            style={{ minWidth: 200, flex: '1 1 200px' }}
            placeholder="Search company, contact…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search leads"
          />
          <select className="filter-select" value={filters.stage}       onChange={setFilter('stage')}       aria-label="Filter by stage">
            <option value="">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <select className="filter-select" value={filters.serviceType} onChange={setFilter('serviceType')} aria-label="Filter by service">
            <option value="">All Services</option>
            <option value="marketing">Marketing</option>
            <option value="software">Software</option>
            <option value="both">Both</option>
          </select>
          <select className="filter-select" value={filters.source}      onChange={setFilter('source')}      aria-label="Filter by source">
            <option value="">All Sources</option>
            <option value="meta">Meta Ads</option>
            <option value="referral">Referral</option>
            <option value="website">Website</option>
            <option value="outbound">Outbound</option>
            <option value="other">Other</option>
          </select>
          <select className="filter-select" value={filters.priority}    onChange={setFilter('priority')}    aria-label="Filter by priority">
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {canAssign && reps.length > 0 && (
            <select className="filter-select" value={filters.repId} onChange={setFilter('repId')} aria-label="Filter by rep">
              <option value="">All Reps</option>
              <option value="unassigned">Unassigned</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {hasFilters && (
            <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={clearAll}>Clear</button>
          )}
        </div>
      </div>

      {/* Lead grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="fadaa-card skeleton" style={{ height: 180 }} />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="fadaa-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <p className="empty-state-title">No leads found</p>
            <p className="empty-state-desc">
              {hasFilters ? 'Try adjusting your filters to see more results.' : 'Add your first lead to get started.'}
            </p>
            {hasFilters
              ? <button className="fadaa-btn-ghost" onClick={clearAll}>Clear Filters</button>
              : <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none' }}>+ Add Lead</Link>
            }
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12, paddingBottom: selected.size > 0 ? 80 : 0 }}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id} lead={lead} canAssign={canAssign} reps={reps}
              onAssign={handleAssign}
              selected={selected.has(lead.id)}
              onSelect={canAssign ? toggleSelect : undefined}
            />
          ))}
        </div>
      )}

      {/* Bulk action tray */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(13,21,38,0.96)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(79,142,247,0.25)', borderRadius: 14,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>
            {selected.size} selected
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', flexShrink: 0 }} />
          <select
            className="filter-select"
            disabled={bulkBusy}
            defaultValue=""
            onChange={e => { bulkAction('assign', e.target.value); e.target.value = '' }}
            style={{ fontSize: 12 }}
          >
            <option value="" disabled>Assign to…</option>
            <option value="null">— Unassign</option>
            {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select
            className="filter-select"
            disabled={bulkBusy}
            defaultValue=""
            onChange={e => { bulkAction('stage', e.target.value); e.target.value = '' }}
            style={{ fontSize: 12 }}
          >
            <option value="" disabled>Move stage…</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <button
            className="fadaa-btn-ghost fadaa-btn-sm"
            onClick={clearSelection}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            ✕ Clear
          </button>
        </div>
      )}
    </SalesShell>
  )
}
