'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { LeadCard } from '@/components/sales/LeadCard'
import type { Lead } from '@/lib/sales/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/lib/sales/types'

export default function LeadsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'

  const [leads, setLeads]     = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filters, setFilters] = useState({
    stage: '', serviceType: '', source: '', priority: '',
  })

  const loadLeads = useCallback(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (search)                sp.set('search',      search)
    if (filters.stage)         sp.set('stage',        filters.stage)
    if (filters.serviceType)   sp.set('serviceType',  filters.serviceType)
    if (filters.source)        sp.set('source',       filters.source)
    if (filters.priority)      sp.set('priority',     filters.priority)

    fetch(`/api/sales/leads?${sp}`)
      .then(r => r.json())
      .then(d => { setLeads(d.leads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, filters])

  useEffect(() => { loadLeads() }, [loadLeads])

  const setFilter = (k: string) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters(f => ({ ...f, [k]: e.target.value }))

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
          {(role === 'manager' || role === 'admin') && (
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
        <select className="fadaa-input" style={{ maxWidth: 160 }} value={filters.stage} onChange={setFilter('stage')}>
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select className="fadaa-input" style={{ maxWidth: 160 }} value={filters.serviceType} onChange={setFilter('serviceType')}>
          <option value="">All Services</option>
          <option value="marketing">Marketing</option>
          <option value="software">Software</option>
          <option value="both">Both</option>
        </select>
        <select className="fadaa-input" style={{ maxWidth: 140 }} value={filters.source} onChange={setFilter('source')}>
          <option value="">All Sources</option>
          <option value="meta">Meta Ads</option>
          <option value="referral">Referral</option>
          <option value="website">Website</option>
          <option value="outbound">Outbound</option>
          <option value="other">Other</option>
        </select>
        <select className="fadaa-input" style={{ maxWidth: 130 }} value={filters.priority} onChange={setFilter('priority')}>
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {Object.values(filters).some(Boolean) || search ? (
          <button
            className="fadaa-btn-ghost"
            onClick={() => { setSearch(''); setFilters({ stage: '', serviceType: '', source: '', priority: '' }) }}
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
            {search || Object.values(filters).some(Boolean)
              ? 'Try adjusting your filters'
              : 'Add your first lead to get started'}
          </p>
          <Link href="/sales/leads/new" className="fadaa-btn" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
            + Add Lead
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      )}
    </SalesShell>
  )
}
