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

  const [leads,   setLeads]   = useState<Lead[]>([])
  const [reps,    setReps]    = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState({ stage: '', serviceType: '', source: '', priority: '', repId: '' })

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
        <div style={{ display: 'flex', gap: 8 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="fadaa-card skeleton" style={{ height: 160 }} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} canAssign={canAssign} reps={reps} onAssign={handleAssign} />
          ))}
        </div>
      )}
    </SalesShell>
  )
}
