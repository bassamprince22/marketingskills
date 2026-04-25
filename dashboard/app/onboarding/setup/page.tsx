'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const STEPS = ['Brand', 'Invite Team', 'First Lead', 'All Set!']

type LeadForm = { name: string; company: string; email: string; phone: string }
type InviteRow = { email: string; role: 'manager' | 'rep' }

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1 — brand
  const [brandColor, setBrandColor] = useState('#7C3AED')
  const [agencyName, setAgencyName] = useState('')
  const [brandSaving, setBrandSaving] = useState(false)

  // Step 2 — invites
  const [invites, setInvites] = useState<InviteRow[]>([{ email: '', role: 'rep' }])
  const [inviteSaving, setInviteSaving] = useState(false)

  // Step 3 — first lead
  const [lead, setLead] = useState<LeadForm>({ name: '', company: '', email: '', phone: '' })
  const [leadSaving, setLeadSaving] = useState(false)

  const progress = ((step + 1) / STEPS.length) * 100

  async function saveBrand() {
    setBrandSaving(true)
    try {
      await fetch('/api/sales/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandColor, agencyName, step: 'brand_set' }),
      })
    } catch { /* non-blocking */ }
    setBrandSaving(false)
    setStep(1)
  }

  async function saveInvites() {
    setInviteSaving(true)
    const validInvites = invites.filter(i => i.email.includes('@'))
    if (validInvites.length) {
      try {
        await fetch('/api/sales/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invites: validInvites }),
        })
      } catch { /* non-blocking */ }
    }
    setInviteSaving(false)
    setStep(2)
  }

  async function saveLead() {
    setLeadSaving(true)
    if (lead.company || lead.name) {
      try {
        await fetch('/api/sales/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name:   lead.company || lead.name,
            contact_person: lead.name || lead.company,
            email:          lead.email,
            phone:          lead.phone,
            pipeline_stage: 'new_lead',
            lead_source:    'manual',
            service_type:   'marketing',
          }),
        })
        await fetch('/api/sales/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'first_lead' }),
        })
      } catch { /* non-blocking */ }
    }
    setLeadSaving(false)
    setStep(3)
  }

  return (
    <div>
      {/* Progress */}
      <div className="mb-2 flex items-center justify-between text-xs text-white/40">
        <span>Setup — Step {step + 1} of {STEPS.length}</span>
        <span>{STEPS[step]}</span>
      </div>
      <div className="mb-10 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step 0 — Brand */}
      {step === 0 && (
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Brand your workspace</h1>
          <p className="mt-2 text-white/60">Your team will see this every time they log in.</p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/60">Agency Name</label>
              <input
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Pulse Marketing"
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/60">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <span className="text-sm text-white/50">{brandColor}</span>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-3 text-xs text-white/40">Preview</p>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <div
                  className="flex h-12 items-center gap-3 px-4 text-sm font-semibold"
                  style={{ background: `linear-gradient(to right, ${brandColor}33, transparent)` }}
                >
                  <div
                    className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {(agencyName || 'A').charAt(0).toUpperCase()}
                  </div>
                  <span>{agencyName || 'Your Agency Name'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-white/40 hover:text-white/60"
            >
              Skip for now →
            </button>
            <button
              onClick={saveBrand}
              disabled={brandSaving}
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
            >
              {brandSaving ? 'Saving...' : 'Save & Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — Invite Team */}
      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Invite your team</h1>
          <p className="mt-2 text-white/60">Invite up to 3 team members to get started. You can always add more later.</p>

          <div className="mt-8 space-y-3">
            {invites.map((inv, i) => (
              <div key={i} className="flex gap-3">
                <input
                  type="email"
                  value={inv.email}
                  onChange={(e) => {
                    const updated = [...invites]
                    updated[i] = { ...updated[i], email: e.target.value }
                    setInvites(updated)
                  }}
                  placeholder="colleague@agency.com"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
                <select
                  value={inv.role}
                  onChange={(e) => {
                    const updated = [...invites]
                    updated[i] = { ...updated[i], role: e.target.value as 'manager' | 'rep' }
                    setInvites(updated)
                  }}
                  className="rounded-lg border border-white/10 bg-[#0A0E1A] px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/50"
                >
                  <option value="rep">Rep</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            ))}
            {invites.length < 3 && (
              <button
                onClick={() => setInvites([...invites, { email: '', role: 'rep' }])}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                + Add another
              </button>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => { setStep(2) }}
              className="text-sm text-white/40 hover:text-white/60"
            >
              Skip for now →
            </button>
            <button
              onClick={saveInvites}
              disabled={inviteSaving}
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
            >
              {inviteSaving ? 'Inviting...' : 'Send Invites →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — First Lead */}
      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Add your first lead</h1>
          <p className="mt-2 text-white/60">Start your pipeline with one real lead. Takes 30 seconds.</p>

          <div className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Contact Name</label>
                <input
                  value={lead.name}
                  onChange={(e) => setLead({ ...lead, name: e.target.value })}
                  placeholder="Omar Khaled"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Company Name</label>
                <input
                  value={lead.company}
                  onChange={(e) => setLead({ ...lead, company: e.target.value })}
                  placeholder="Loop Agency"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Email</label>
                <input
                  type="email"
                  value={lead.email}
                  onChange={(e) => setLead({ ...lead, email: e.target.value })}
                  placeholder="omar@loop.com"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Phone</label>
                <input
                  type="tel"
                  value={lead.phone}
                  onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                  placeholder="+966 5X XXX XXXX"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="text-sm text-white/40 hover:text-white/60"
            >
              Skip for now →
            </button>
            <button
              onClick={saveLead}
              disabled={leadSaving}
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
            >
              {leadSaving ? 'Saving...' : 'Add Lead & Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="text-center">
          <div className="text-6xl">🎉</div>
          <h1 className="mt-4 text-3xl font-bold">You&apos;re all set!</h1>
          <p className="mx-auto mt-3 max-w-md text-white/60">
            Your Fadaa workspace is ready. Your 14-day free trial is now active.
          </p>

          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-4">
            <p className="text-sm font-semibold text-green-400">✓ 14-day free trial active</p>
            <p className="mt-1 text-xs text-white/50">No credit card needed. Cancel anytime before your trial ends.</p>
          </div>

          <div className="mx-auto mt-6 max-w-sm space-y-2">
            {[
              { label: 'Workspace created', done: true },
              { label: 'Brand configured', done: !!agencyName || !!brandColor },
              { label: 'Team invited', done: invites.some(i => i.email.includes('@')) },
              { label: 'First lead added', done: !!(lead.company || lead.name) },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${item.done ? 'bg-purple-500/20 text-purple-400' : 'border border-white/20 text-white/20'}`}>
                  {item.done ? '✓' : '○'}
                </span>
                <span className={item.done ? 'text-white/80' : 'text-white/30'}>{item.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/sales/dashboard')}
            className="mt-10 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-purple-500/40 transition hover:shadow-purple-500/60"
          >
            Go to Dashboard →
          </button>
        </div>
      )}
    </div>
  )
}
