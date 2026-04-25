'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Proposal = {
  id: string
  proposal_number: string
  title: string
  status: string
  proposal_date: string
  valid_until: string | null
  sales_leads: { company_name: string; contact_person: string } | null
  created_at: string
}

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  new:      { label: 'New',      class: 'bg-white/10 text-white/60' },
  draft:    { label: 'Draft',    class: 'bg-amber-500/20 text-amber-400' },
  sent:     { label: 'Sent',     class: 'bg-blue-500/20 text-blue-400' },
  accepted: { label: 'Accepted', class: 'bg-green-500/20 text-green-400' },
  declined: { label: 'Declined', class: 'bg-red-500/20 text-red-400' },
  revised:  { label: 'Revised',  class: 'bg-orange-500/20 text-orange-400' },
}

export default function ProposalsPage() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('')
  const [search, setSearch]       = useState('')
  const [creating, setCreating]   = useState(false)

  useEffect(() => {
    const q = filter ? `?status=${filter}` : ''
    fetch(`/api/sales/proposals${q}`)
      .then(r => r.json())
      .then(setProposals)
      .finally(() => setLoading(false))
  }, [filter])

  async function createNew() {
    setCreating(true)
    const res = await fetch('/api/sales/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Proposal', status: 'draft' }),
    })
    const data = await res.json()
    if (data.id) router.push(`/sales/proposals/${data.id}`)
    setCreating(false)
  }

  const filtered = proposals.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.proposal_number.toLowerCase().includes(search.toLowerCase()) ||
    p.sales_leads?.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="mt-1 text-sm text-white/50">Create, send, and track branded proposals</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sales/proposals/templates"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10"
          >
            Templates
          </Link>
          <button
            onClick={createNew}
            disabled={creating}
            className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
          >
            {creating ? 'Creating…' : '+ New Proposal'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search proposals…"
          className="w-64 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50"
        />
        <div className="flex flex-wrap gap-2">
          {['', 'new', 'draft', 'sent', 'accepted', 'declined', 'revised'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === s ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {s ? STATUS_STYLES[s].label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40">Valid Until</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-16 text-center text-sm text-white/30">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <p className="text-white/30">No proposals yet.</p>
                  <button onClick={createNew} disabled={creating} className="mt-3 text-sm text-purple-400 hover:text-purple-300">
                    Create your first proposal →
                  </button>
                </td>
              </tr>
            ) : filtered.map((p, i) => {
              const s = STATUS_STYLES[p.status] ?? STATUS_STYLES.new
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/sales/proposals/${p.id}`)}
                  className={`cursor-pointer border-b border-white/5 transition hover:bg-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-white/50">{p.proposal_number}</td>
                  <td className="px-4 py-3 font-medium text-white">{p.title}</td>
                  <td className="px-4 py-3 text-white/60">{p.sales_leads?.company_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.class}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-white/50">{p.proposal_date ? new Date(p.proposal_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-white/50">{p.valid_until ? new Date(p.valid_until).toLocaleDateString() : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
