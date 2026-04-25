'use client'

import Link from 'next/link'
import { useState } from 'react'

const timestamps = [
  { time: '0:00', label: 'Dashboard overview & pipeline Kanban' },
  { time: '1:20', label: 'Adding a lead & AI scoring in action' },
  { time: '3:10', label: 'Creating and sending a branded proposal' },
  { time: '5:45', label: 'Meta Leads integration setup' },
  { time: '7:30', label: 'Team challenges & leaderboard' },
  { time: '9:00', label: 'Daily reports and manager analytics' },
]

const faqs = [
  {
    q: 'How long is the demo?',
    a: 'The recorded demo is about 11 minutes and covers all core features. The live demo call is 30 minutes and includes a Q&A session tailored to your agency.',
  },
  {
    q: 'Is the live demo free?',
    a: 'Yes, completely free and no obligation. We\'ll walk through how Fadaa fits your specific workflow and answer any questions.',
  },
  {
    q: 'Can I get a demo in Arabic?',
    a: 'Yes. Let us know in the "message" field that you prefer Arabic and we\'ll arrange an Arabic-language demo.',
  },
]

export default function DemoPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', agency: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.15),_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 text-center md:py-24">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            See Fadaa <span className="bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] bg-clip-text text-transparent">in action</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Watch the recorded demo or book a 30-minute live walkthrough with our team.
          </p>
        </div>
      </section>

      {/* Two-column: video + form */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Video + timestamps */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-white/30">Fadaa — Product Demo</span>
              </div>
              {/* Video embed placeholder — swap src for real YouTube/Loom URL */}
              <div className="relative aspect-video bg-gradient-to-br from-purple-900/40 to-blue-900/40">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-3xl backdrop-blur-sm transition hover:bg-white/20">
                    ▶
                  </div>
                  <p className="mt-4 text-sm text-white/50">Demo video coming soon</p>
                  <p className="mt-1 text-xs text-white/30">Book a live demo to see it now →</p>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">What&apos;s in the demo</h3>
              <div className="space-y-2">
                {timestamps.map((t) => (
                  <div key={t.time} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm">
                    <span className="w-12 flex-shrink-0 font-mono text-purple-400">{t.time}</span>
                    <span className="text-white/70">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live demo form */}
          <div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              {submitted ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="text-5xl">🎉</div>
                  <h3 className="mt-4 text-xl font-semibold">We&apos;ll be in touch soon!</h3>
                  <p className="mt-2 text-sm text-white/60">
                    Check your inbox for a calendar invite. Can&apos;t wait to show you Fadaa.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-6 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-6 py-3 text-sm font-semibold text-white"
                  >
                    Start Free Trial While You Wait →
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">Book a Live Demo</h2>
                  <p className="mt-1 text-sm text-white/60">
                    30-minute walkthrough with a Fadaa specialist. Free, no obligation.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/60">Your Name *</label>
                        <input
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Sarah Mahmoud"
                          className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/60">Agency Name *</label>
                        <input
                          required
                          value={form.agency}
                          onChange={(e) => setForm({ ...form, agency: e.target.value })}
                          placeholder="Pulse Marketing"
                          className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/60">Work Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="sarah@pulsemarketing.com"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/60">Phone / WhatsApp</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+966 5X XXX XXXX"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/60">Anything specific you want to see?</label>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={3}
                        placeholder="e.g. Meta integration, proposals, team challenges..."
                        className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:opacity-60"
                    >
                      {loading ? 'Sending...' : 'Schedule My Demo →'}
                    </button>
                  </form>
                  <p className="mt-3 text-center text-xs text-white/30">
                    We respond within 2 hours on business days.
                  </p>
                </>
              )}
            </div>

            {/* Trust signals */}
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              {[
                { stat: '< 2 hrs', label: 'Response time' },
                { stat: '30 min', label: 'Demo length' },
                { stat: 'Free', label: 'No obligation' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.02] py-4">
                  <div className="text-lg font-bold text-white">{item.stat}</div>
                  <div className="mt-1 text-xs text-white/50">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-6 text-center text-2xl font-bold">Questions about the demo</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
              <p className="font-medium">{faq.q}</p>
              <p className="mt-2 text-sm text-white/60">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24 text-center">
        <p className="text-white/50">Prefer to explore on your own?</p>
        <Link
          href="/signup"
          className="mt-3 inline-block rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Start 14-Day Free Trial — No Demo Required
        </Link>
      </section>
    </>
  )
}
