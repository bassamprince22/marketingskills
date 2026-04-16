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
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const canAssign = role === 'manager' || role === 'admin'

  const [leads,   setLeads]   = useState<Lead[]>([])
  const [reps,    setReps]    = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState({
    stage: '', serviceType: '', source: '', priority: '', repId: '',
  })

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

  // Load reps for assign dropdown (manager/admin only)
  useEffect(() => {
    if (!canAssign) return
    fetch('/api/sales/users?role=rep')
      .then(r => r.json())
      .then(d => setReps(d.users ?? []))
      .catch(() => {})
  }, [canAssign])

  useEffect(() => { loadLeads() }, [loadLeads])

  const handleAssign = useCallback(async (leadId: string, repId: string | null) => {
    // Optimistic update
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

  return (
    <SalesShell>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>◎ Leads</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {role === 'rep' ? ' in your orbit' : ' across all reps'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canAssign && (
            <Link href="/sales/import" className="fadaa-btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ↧ Import CSV
            </Link>
          )}
          <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none' }}>
            + New Lead
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="fadaa-card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="fadaa-input"
          style={{ maxWidth: 220 }}
          placeholder="Search company, contact, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="fadaa-input" style={{ maxWidth: 155 }} value={filters.stage} onChange={setFilter('stage')}>
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select className="fadaa-input" style={{ maxWidth: 145 }} value={filters.serviceType} onChange={setFilter('serviceType')}>
          <option value="">All Services</option>
          <option value="marketing">Marketing</option>
          <option value="software">Software</option>
          <option value="both">Both</option>
        </select>
        <select className="fadaa-input" style={{ maxWidth: 130 }} value={filters.source} onChange={setFilter('source')}>
          <option value="">All Sources</option>
          <option value="meta">Meta Ads</option>
          <option value="referral">Referral</option>
          <option value="website">Website</option>
          <option value="outbound">Outbound</option>
          <option value="other">Other</option>
        </select>
        <select className="fadaa-input" style={{ maxWidth: 120 }} value={filters.priority} onChange={setFilter('priority')}>
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {canAssign && reps.length > 0 && (
          <select className="fadaa-input" style={{ maxWidth: 150 }} value={filters.repId} onChange={setFilter('repId')}>
            <option value="">All Reps</option>
            <option value="unassigned">Unassigned</option>
            {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
        {hasFilters ? (
          <button
            className="fadaa-btn-ghost"
            onClick={() => { setSearch(''); setFilters({ stage: '', serviceType: '', source: '', priority: '', repId: '' }) }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Lead grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fadaa-card" style={{ height: 120 }} />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="fadaa-card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>◎</p>
          <p style={{ color: '#E2E8F0', fontWeight: 600 }}>No leads found</p>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>
            {hasFilters ? 'Try adjusting your filters' : 'Add your first lead to get started'}
          </p>
          <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
            + Add Lead
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              canAssign={canAssign}
              reps={reps}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}
    </SalesShell>
  )
}
