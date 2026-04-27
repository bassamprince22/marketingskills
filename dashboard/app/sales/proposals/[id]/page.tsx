'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'

type LineItem = { id?: string; sort_order: number; description: string; qty: number; unit: string; rate: number }
type Adjustment = { id?: string; adj_type: 'tax' | 'discount' | 'adjustment'; label: string; value_type: 'percent' | 'fixed'; value: number }

type Lead = { id: string; company_name: string; contact_person: string; email: string; phone: string }
type Proposal = {
  id: string; proposal_number: string; title: string; subtitle: string | null;
  status: string; proposal_date: string; valid_until: string | null;
  body_html: string | null; cover_color: string; public_token: string;
  sales_leads: Lead | null; sales_users: { name: string } | null;
  orgs: { name: string } | null;
  proposal_line_items: LineItem[]
  proposal_adjustments: Adjustment[]
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-white/10 text-white/60', draft: 'bg-amber-500/20 text-amber-400',
  sent: 'bg-blue-500/20 text-blue-400', accepted: 'bg-green-500/20 text-green-400',
  declined: 'bg-red-500/20 text-red-400', revised: 'bg-orange-500/20 text-orange-400',
}

function calcTotal(items: LineItem[], adjs: Adjustment[]): number {
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0)
  let total = subtotal
  for (const adj of adjs) {
    const v = adj.value_type === 'percent' ? (subtotal * adj.value) / 100 : adj.value
    if (adj.adj_type === 'discount') total -= v
    else total += v
  }
  return total
}

export default function ProposalEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [panel,   setPanel]     = useState<'pricing' | 'variables' | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  const [lineItems, setLineItems]   = useState<LineItem[]>([])
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])

  const [bodyHtml, setBodyHtml]     = useState('')
  const [title, setTitle]           = useState('')
  const [subtitle, setSubtitle]     = useState('')
  const [coverColor, setCoverColor] = useState('#7C3AED')
  const [status, setStatus]         = useState('new')
  const [showSend, setShowSend]     = useState(false)
  const [sendForm, setSendForm]     = useState({ to: '', subject: '', message: '' })
  const [sendLoading, setSendLoading] = useState(false)
  const [showClone, setShowClone]   = useState(false)
  const [cloneTitle, setCloneTitle] = useState('')

  const bodyRef = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/sales/proposals/${id}`)
      .then(r => r.ok ? r.json() : Promise.resolve({}))
      .then((data: Proposal) => {
        setProposal(data)
        setTitle(data.title)
        setSubtitle(data.subtitle ?? '')
        setCoverColor(data.cover_color)
        setStatus(data.status)
        setBodyHtml(data.body_html ?? '')
        setLineItems(data.proposal_line_items ?? [])
        setAdjustments(data.proposal_adjustments ?? [])
        setSendForm(f => ({ ...f, to: data.sales_leads?.email ?? '', subject: `Proposal: ${data.title}` }))
        setCloneTitle(`Copy of ${data.title}`)
        if (bodyRef.current) bodyRef.current.innerHTML = data.body_html ?? '<p>Start writing your proposal here…</p>'
      })
      .finally(() => setLoading(false))
  }, [id])

  function scheduleAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveProposal(), 2000)
  }

  async function saveProposal(extraFields: Record<string, unknown> = {}) {
    setSaving(true)
    const html = bodyRef.current?.innerHTML ?? bodyHtml
    await fetch(`/api/sales/proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subtitle, cover_color: coverColor, body_html: html, status, ...extraFields }),
    })
    setSaving(false)
  }

  async function saveLineItems() {
    await fetch(`/api/sales/proposals/${id}/line-items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lineItems),
    })
  }

  async function saveAdjustments() {
    await fetch(`/api/sales/proposals/${id}/adjustments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adjustments),
    })
  }

  async function markAs(newStatus: string) {
    setStatus(newStatus)
    await saveProposal({ status: newStatus })
    setShowMenu(false)
  }

  async function sendProposal() {
    setSendLoading(true)
    await fetch(`/api/sales/proposals/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendForm),
    })
    setStatus('sent')
    setShowSend(false)
    setSendLoading(false)
  }

  async function cloneProposal() {
    const res = await fetch(`/api/sales/proposals/${id}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: cloneTitle }),
    })
    const data = await res.json()
    if (data.id) router.push(`/sales/proposals/${data.id}`)
    setShowClone(false)
  }

  async function deleteProposal() {
    if (!confirm('Delete this proposal? This cannot be undone.')) return
    await fetch(`/api/sales/proposals/${id}`, { method: 'DELETE' })
    router.push('/sales/proposals')
  }

  function insertVariable(v: string) {
    if (!bodyRef.current) return
    bodyRef.current.focus()
    document.execCommand('insertText', false, `{${v}}`)
    scheduleAutoSave()
  }

  const total = calcTotal(lineItems, adjustments)
  const publicUrl = proposal ? `${window.location.origin}/p/${proposal.public_token}` : ''

  const VARIABLES = [
    'company_name','client_company_name','client_first_name','client_last_name',
    'client_phone','client_email','proposal_id','title','proposal_date',
    'expiry_date','prepared_by_name','pricing_table','pricing_total','todays_date',
  ]

  if (loading) {
    return (
      <SalesShell>
        <div className="flex h-64 items-center justify-center text-white/40">Loading proposal...</div>
      </SalesShell>
    )
  }

  if (!proposal) {
    return (
      <SalesShell>
        <div className="p-8 text-white/40">Proposal not found.</div>
      </SalesShell>
    )
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-white/40">Loading proposal…</div>
  if (!proposal) return <div className="p-8 text-white/40">Proposal not found.</div>

  return (
    <SalesShell>
      <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0A0E1A]/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <button onClick={() => router.push('/sales/proposals')} className="hover:text-white">Proposals</button>
          <span>/</span>
          <span className="font-mono text-white/70">{proposal.proposal_number}</span>
          {saving && <span className="text-xs text-white/30">Saving…</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.new}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <button onClick={() => setShowSend(true)} title="Send" className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
            ✉
          </button>
          <button onClick={() => window.print()} title="Print" className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
            🖨
          </button>
          <button onClick={() => setPanel(panel === 'pricing' ? null : 'pricing')} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${panel === 'pricing' ? 'border-purple-500/50 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/60 hover:text-white'}`}>
            Pricing
          </button>
          <button onClick={() => setPanel(panel === 'variables' ? null : 'variables')} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${panel === 'variables' ? 'border-purple-500/50 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/60 hover:text-white'}`}>
            Variables
          </button>
          <button onClick={() => setShowClone(true)} title="Clone" className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">⧉</button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white">⋯</button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-50 w-48 rounded-xl border border-white/10 bg-[#111827] py-1 shadow-2xl">
                <button onClick={() => { navigator.clipboard.writeText(publicUrl); setShowMenu(false) }} className="block w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5">Copy Proposal URL</button>
                <hr className="my-1 border-white/10" />
                {['accepted','declined','revised'].map(s => (
                  <button key={s} onClick={() => markAs(s)} className="block w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 capitalize">
                    Mark as {s}
                  </button>
                ))}
                <hr className="my-1 border-white/10" />
                <button onClick={deleteProposal} className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5">Delete Proposal</button>
              </div>
            )}
          </div>
          <button onClick={() => saveProposal()} disabled={saving} className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Document canvas */}
        <div className={`flex-1 overflow-auto bg-slate-200 py-10 px-4 print:bg-white`}>
          <div className="mx-auto max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden text-gray-900">
            {/* Cover banner */}
            <div
              className="relative px-10 py-12 text-white text-center"
              style={{ background: `linear-gradient(135deg, ${coverColor} 0%, #4F8EF7 100%)` }}
            >
              <span className={`absolute top-4 left-6 rounded-full px-3 py-1 text-xs font-semibold bg-white/20`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); scheduleAutoSave() }}
                className="w-full bg-transparent text-center text-3xl font-bold text-white placeholder-white/50 outline-none"
                placeholder="Proposal Title"
              />
              <input
                value={subtitle}
                onChange={e => { setSubtitle(e.target.value); scheduleAutoSave() }}
                className="mt-2 w-full bg-transparent text-center text-lg text-white/80 placeholder-white/40 outline-none"
                placeholder="Subtitle (optional)"
              />
              <div className="mt-4 flex items-center justify-center gap-2">
                <label className="text-xs text-white/60">Color:</label>
                <input type="color" value={coverColor} onChange={e => { setCoverColor(e.target.value); scheduleAutoSave() }} className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent" />
              </div>
            </div>

            {/* Metadata block */}
            <div className="grid grid-cols-2 gap-6 border-b border-gray-200 px-10 py-6 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Service Provider</p>
                <p className="mt-1 font-semibold text-gray-800">{proposal.orgs?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Client</p>
                <p className="mt-1 font-semibold text-gray-800">{proposal.sales_leads?.company_name ?? '—'}</p>
                <p className="text-gray-500">{proposal.sales_leads?.contact_person}</p>
              </div>
            </div>

            {/* Date row */}
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 bg-gray-50 px-10 py-4 text-sm">
              <div className="space-y-1.5">
                <div className="flex gap-2"><span className="text-gray-400 w-28">Proposal Date:</span><span className="font-medium text-gray-700">{proposal.proposal_date ? new Date(proposal.proposal_date).toLocaleDateString() : '—'}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-28">Valid Until:</span><span className="font-medium text-gray-700">{proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString() : '—'}</span></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex gap-2"><span className="text-gray-400 w-28">Proposal ID:</span><span className="font-mono font-medium text-gray-700">{proposal.proposal_number}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-28">Prepared By:</span><span className="font-medium text-gray-700">{proposal.sales_users?.name ?? '—'}</span></div>
              </div>
            </div>

            {/* Pricing table (rendered if body contains {pricing_table}) */}
            {lineItems.length > 0 && (
              <div className="px-10 py-6 border-b border-gray-200">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2 text-left">Description</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr></thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-700">{item.description || <span className="text-gray-300">—</span>}</td>
                        <td className="py-2 text-right text-gray-500">{item.qty} {item.unit}</td>
                        <td className="py-2 text-right text-gray-500">${item.rate.toLocaleString()}</td>
                        <td className="py-2 text-right font-medium text-gray-800">${(item.qty * item.rate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {adjustments.map((adj, i) => {
                      const sub = lineItems.reduce((s, it) => s + it.qty * it.rate, 0)
                      const v = adj.value_type === 'percent' ? (sub * adj.value) / 100 : adj.value
                      return (
                        <tr key={i}><td colSpan={3} className="pt-1 text-right text-sm text-gray-400">{adj.label}</td>
                          <td className={`pt-1 text-right text-sm font-medium ${adj.adj_type === 'discount' ? 'text-green-600' : 'text-gray-700'}`}>
                            {adj.adj_type === 'discount' ? '-' : '+'} ${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={3} className="pt-2 text-right font-bold text-gray-800">Total</td>
                      <td className="pt-2 text-right text-xl font-bold text-gray-900">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Rich text body */}
            <div className="px-10 py-8">
              <div
                ref={bodyRef}
                contentEditable
                suppressContentEditableWarning
                onInput={scheduleAutoSave}
                className="min-h-48 text-sm text-gray-700 leading-relaxed outline-none focus:outline-none prose prose-sm max-w-none"
                style={{ lineHeight: 1.8 }}
              />
            </div>
          </div>
        </div>

        {/* Right panel: Pricing */}
        {panel === 'pricing' && (
          <div className="w-80 border-l border-white/10 bg-[#0D1017] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="font-semibold text-sm">Pricing</span>
              <button onClick={() => setPanel(null)} className="text-white/40 hover:text-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                  <input
                    value={item.description}
                    onChange={e => setLineItems(items => items.map((it, j) => j === i ? { ...it, description: e.target.value } : it))}
                    placeholder="Description"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder-white/30 border-b border-white/10 pb-1"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-white/40">Qty</label>
                      <input type="number" value={item.qty} onChange={e => setLineItems(items => items.map((it, j) => j === i ? { ...it, qty: Number(e.target.value) } : it))}
                        className="w-full rounded bg-white/5 px-2 py-1 text-sm text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-white/40">Rate ($)</label>
                      <input type="number" value={item.rate} onChange={e => setLineItems(items => items.map((it, j) => j === i ? { ...it, rate: Number(e.target.value) } : it))}
                        className="w-full rounded bg-white/5 px-2 py-1 text-sm text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-white/40">Total</label>
                      <p className="py-1 text-sm font-semibold text-white">${(item.qty * item.rate).toLocaleString()}</p>
                    </div>
                  </div>
                  <button onClick={() => setLineItems(items => items.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))}
              <button onClick={() => setLineItems(items => [...items, { sort_order: items.length, description: '', qty: 1, unit: '', rate: 0 }])}
                className="w-full rounded-lg border border-dashed border-white/15 py-2 text-sm text-white/40 hover:border-purple-500/40 hover:text-white/60">
                + Add Line Item
              </button>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/30 mb-2">Adjustments</p>
                {adjustments.map((adj, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={adj.label} onChange={e => setAdjustments(adjs => adjs.map((a, j) => j === i ? { ...a, label: e.target.value } : a))}
                      placeholder="Label" className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white outline-none" />
                    <input type="number" value={adj.value} onChange={e => setAdjustments(adjs => adjs.map((a, j) => j === i ? { ...a, value: Number(e.target.value) } : a))}
                      className="w-16 rounded bg-white/5 px-2 py-1 text-xs text-white outline-none" />
                    <button onClick={() => setAdjustments(adjs => adjs.filter((_, j) => j !== i))} className="text-red-400 text-xs">×</button>
                  </div>
                ))}
                <button onClick={() => setAdjustments(adjs => [...adjs, { adj_type: 'tax', label: 'Tax (15%)', value_type: 'percent', value: 15 }])}
                  className="text-xs text-purple-400 hover:text-purple-300">+ Add Adjustment</button>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-lg font-bold text-white">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="border-t border-white/10 p-4">
              <button onClick={() => { saveLineItems(); saveAdjustments() }}
                className="w-full rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] py-2.5 text-sm font-semibold text-white">
                Save Changes
              </button>
              <p className="mt-2 text-center text-xs text-white/30">Insert <code className="text-purple-400">{`{pricing_table}`}</code> in body to embed</p>
            </div>
          </div>
        )}

        {/* Right panel: Variables */}
        {panel === 'variables' && (
          <div className="w-72 border-l border-white/10 bg-[#0D1017] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="font-semibold text-sm">Variables</span>
              <button onClick={() => setPanel(null)} className="text-white/40 hover:text-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-4 text-xs text-white/40">Click a variable to insert it at the cursor position in the document body.</p>
              <div className="space-y-1.5">
                {VARIABLES.map(v => (
                  <button key={v} onClick={() => insertVariable(v)}
                    className="block w-full rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-left font-mono text-xs text-purple-300 hover:border-purple-500/30 hover:bg-purple-500/10">
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h3 className="mb-4 text-lg font-semibold">Send Proposal</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-white/50">To</label>
                <input value={sendForm.to} onChange={e => setSendForm(f => ({ ...f, to: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" /></div>
              <div><label className="text-xs text-white/50">Subject</label>
                <input value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" /></div>
              <div><label className="text-xs text-white/50">Message (optional)</label>
                <textarea value={sendForm.message} onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))} rows={3}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" /></div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowSend(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60">Cancel</button>
              <button onClick={sendProposal} disabled={sendLoading} className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {sendLoading ? 'Sending…' : 'Send →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone modal */}
      {showClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h3 className="mb-4 text-lg font-semibold">Clone Proposal</h3>
            <div><label className="text-xs text-white/50">New Title</label>
              <input value={cloneTitle} onChange={e => setCloneTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" /></div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowClone(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60">Cancel</button>
              <button onClick={cloneProposal} className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-4 py-2 text-sm font-semibold text-white">Clone →</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </SalesShell>
  )
}
