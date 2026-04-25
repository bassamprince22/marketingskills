'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type LineItem    = { description: string; qty: number; unit: string; rate: number }
type Adjustment  = { adj_type: string; label: string; value_type: string; value: number }
type Proposal = {
  proposal_number: string; title: string; subtitle: string | null;
  status: string; proposal_date: string; valid_until: string | null;
  body_html: string | null; cover_color: string; public_token: string;
  orgs: { name: string; logo_url: string | null } | null;
  sales_leads: { company_name: string; contact_person: string; email: string } | null;
  sales_users: { name: string } | null;
  proposal_line_items: LineItem[];
  proposal_adjustments: Adjustment[];
}

function calcTotal(items: LineItem[], adjs: Adjustment[]): number {
  const sub = items.reduce((s, i) => s + i.qty * i.rate, 0)
  let total = sub
  for (const adj of adjs) {
    const v = adj.value_type === 'percent' ? (sub * adj.value) / 100 : adj.value
    if (adj.adj_type === 'discount') total -= v
    else total += v
  }
  return total
}

export default function PublicProposalPage() {
  const { token } = useParams<{ token: string }>()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [responding, setResponding] = useState(false)
  const [responded, setResponded]   = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [showDecline, setShowDecline]     = useState(false)

  useEffect(() => {
    fetch(`/api/proposals/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setProposal)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  async function respond(action: 'accepted' | 'declined') {
    setResponding(true)
    const res = await fetch(`/api/proposals/${token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: declineReason }),
    })
    const data = await res.json()
    if (res.ok) setResponded(action)
    else if (data.status) setResponded(data.status)
    setResponding(false)
    setShowDecline(false)
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-gray-400">Loading…</div>
  if (notFound || !proposal) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-gray-500">Proposal not found.</div>

  const total = calcTotal(proposal.proposal_line_items ?? [], proposal.proposal_adjustments ?? [])
  const isTerminal = ['accepted', 'declined'].includes(responded ?? proposal.status)

  return (
    <div className="min-h-screen bg-slate-200 py-10 px-4 print:bg-white">
      <div className="mx-auto max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden text-gray-900">
        {/* Cover */}
        <div
          className="relative px-10 py-12 text-white text-center"
          style={{ background: `linear-gradient(135deg, ${proposal.cover_color} 0%, #4F8EF7 100%)` }}
        >
          {proposal.orgs?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proposal.orgs.logo_url} alt="Logo" className="mx-auto mb-4 h-12 w-auto object-contain" />
          )}
          <h1 className="text-3xl font-bold">{proposal.title}</h1>
          {proposal.subtitle && <p className="mt-2 text-lg text-white/80">{proposal.subtitle}</p>}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-6 border-b border-gray-200 px-10 py-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">From</p>
            <p className="mt-1 font-semibold">{proposal.orgs?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">To</p>
            <p className="mt-1 font-semibold">{proposal.sales_leads?.company_name ?? '—'}</p>
            <p className="text-gray-500">{proposal.sales_leads?.contact_person}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 bg-gray-50 px-10 py-4 text-sm">
          <div className="space-y-1">
            <div className="flex gap-2"><span className="w-28 text-gray-400">Proposal Date:</span><span className="font-medium">{proposal.proposal_date ? new Date(proposal.proposal_date).toLocaleDateString() : '—'}</span></div>
            <div className="flex gap-2"><span className="w-28 text-gray-400">Valid Until:</span><span className="font-medium">{proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString() : '—'}</span></div>
          </div>
          <div className="space-y-1">
            <div className="flex gap-2"><span className="w-28 text-gray-400">Proposal ID:</span><span className="font-mono font-medium">{proposal.proposal_number}</span></div>
            <div className="flex gap-2"><span className="w-28 text-gray-400">Prepared By:</span><span className="font-medium">{proposal.sales_users?.name ?? '—'}</span></div>
          </div>
        </div>

        {/* Line items */}
        {(proposal.proposal_line_items?.length ?? 0) > 0 && (
          <div className="px-10 py-6 border-b border-gray-200">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-2 text-left">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {proposal.proposal_line_items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{item.description}</td>
                    <td className="py-2 text-right text-gray-500">{item.qty} {item.unit}</td>
                    <td className="py-2 text-right text-gray-500">${item.rate.toLocaleString()}</td>
                    <td className="py-2 text-right font-medium">${(item.qty * item.rate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {proposal.proposal_adjustments.map((adj, i) => {
                  const sub = proposal.proposal_line_items.reduce((s, it) => s + it.qty * it.rate, 0)
                  const v = adj.value_type === 'percent' ? (sub * adj.value) / 100 : adj.value
                  return <tr key={i}><td colSpan={3} className="pt-1 text-right text-sm text-gray-400">{adj.label}</td>
                    <td className={`pt-1 text-right text-sm font-medium ${adj.adj_type === 'discount' ? 'text-green-600' : 'text-gray-700'}`}>
                      {adj.adj_type === 'discount' ? '-' : '+'} ${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td></tr>
                })}
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={3} className="pt-2 text-right font-bold">Total</td>
                  <td className="pt-2 text-right text-xl font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Body */}
        {proposal.body_html && (
          <div
            className="px-10 py-8 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: proposal.body_html }}
          />
        )}

        {/* Accept / Decline */}
        <div className="border-t border-gray-200 px-10 py-8">
          {responded === 'accepted' || (proposal.status === 'accepted' && !responded) ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-5 text-center">
              <p className="text-lg font-semibold text-green-700">✓ Proposal Accepted</p>
              <p className="mt-1 text-sm text-green-600">Thank you! We&apos;ll be in touch shortly.</p>
            </div>
          ) : responded === 'declined' || (proposal.status === 'declined' && !responded) ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-center">
              <p className="text-lg font-semibold text-red-700">Proposal Declined</p>
              <p className="mt-1 text-sm text-red-600">Thank you for letting us know.</p>
            </div>
          ) : !isTerminal ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-gray-500">Please review this proposal and let us know your decision.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => respond('accepted')}
                  disabled={responding}
                  className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white shadow hover:bg-green-700 disabled:opacity-60"
                >
                  ✓ Accept Proposal
                </button>
                <button
                  onClick={() => setShowDecline(true)}
                  disabled={responding}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            </div>
          ) : null}

          {showDecline && (
            <div className="mt-4 space-y-3">
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Reason for declining (optional)"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-red-300"
              />
              <div className="flex gap-3">
                <button onClick={() => respond('declined')} disabled={responding} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {responding ? 'Submitting…' : 'Confirm Decline'}
                </button>
                <button onClick={() => setShowDecline(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">Powered by Fadaa — Sales OS for Marketing Agencies</p>
    </div>
  )
}
