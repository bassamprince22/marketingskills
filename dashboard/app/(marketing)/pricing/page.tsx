'use client'

import Link from 'next/link'
import { useState } from 'react'

const tiers = [
  {
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 39,
    seats: '3 seats',
    desc: 'Perfect for small agencies just getting started with a structured sales process.',
    features: [
      'Core CRM & pipeline board',
      'Up to 3 team seats',
      'Lead management (unlimited leads)',
      'CSV import & deduplication',
      '🧠 AI assistant — 20 calls/mo ✨ NEW',
      'Basic daily reports',
      'Email support',
    ],
    notIncluded: ['Proposals & contracts', 'Meta integration', 'Team challenges'],
    cta: 'Start Free Trial',
    href: '/signup?plan=starter',
  },
  {
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 79,
    seats: '10 seats',
    desc: 'The complete toolkit for growing agencies that want to win more deals, faster.',
    features: [
      'Everything in Starter',
      'Up to 10 team seats',
      '🧠 AI assistant — 100 calls/mo ✨ NEW',
      'AI lead scoring, email drafts, meeting summaries',
      'Proposals & contracts with public URL',
      'Meta Leads integration',
      'Team challenges & leaderboard',
      'Advanced reports & PDF export',
      'Priority email support',
    ],
    notIncluded: ['White-label', 'API access'],
    featured: true,
    cta: 'Start Free Trial',
    href: '/signup?plan=pro',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 249,
    annualPrice: 199,
    seats: 'Unlimited seats',
    desc: 'For established agencies that need unlimited scale and custom branding.',
    features: [
      'Everything in Pro',
      'Unlimited team seats',
      '🧠 Unlimited AI calls ✨ NEW',
      'White-label (your domain + logo)',
      'REST API access',
      'Custom contract templates',
      'Dedicated onboarding call',
      'SLA-backed priority support',
      'Custom reporting',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    href: '/demo',
  },
]

const faqs = [
  {
    q: 'Do I need a credit card to start the free trial?',
    a: 'No. You get 14 days free with no credit card required. We\'ll remind you 3 days before the trial ends so you can decide whether to upgrade.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your data is yours. If you cancel, you have 30 days to export everything — leads, proposals, reports — before the workspace is deleted.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, upgrade or downgrade at any time. Upgrades are prorated immediately. Downgrades take effect at the next billing cycle.',
  },
  {
    q: 'What counts as a "seat"?',
    a: 'A seat is one active team member (Admin, Manager, or Rep). Deactivated users do not count toward your seat limit.',
  },
  {
    q: 'Is there a setup or onboarding fee?',
    a: 'No setup fees on Starter or Pro. Enterprise includes a complimentary onboarding call at no extra charge.',
  },
  {
    q: 'Do you offer discounts for annual billing?',
    a: 'Yes — switching to annual billing saves 20% compared to monthly. Toggle above to see annual pricing.',
  },
  {
    q: 'Is the platform available in Arabic?',
    a: 'Yes. Fadaa supports full Arabic UI with right-to-left layout, Arabic proposals, and Arabic AI responses on all paid plans.',
  },
  {
    q: 'How does the Meta Leads integration work?',
    a: 'Connect your Meta Business account and leads from your Facebook/Instagram lead-gen forms sync automatically into your pipeline — no CSV exports needed.',
  },
  {
    q: 'How does the AI assistant work?',
    a: 'Fadaa uses OpenAI GPT-4o-mini to score leads 1–10, draft follow-up emails, summarise meeting notes, and analyse your pipeline. Every new trial account gets 10 free AI calls. Starter includes 20/mo, Pro 100/mo, Enterprise unlimited.',
  },
  {
    q: 'What happens to unused AI calls?',
    a: 'AI call counts reset at the start of each billing period. Unused calls do not roll over.',
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.15),_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center md:py-28">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Simple, <span className="bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] bg-clip-text text-transparent">transparent</span> pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Start free for 14 days. No credit card. Cancel anytime.
          </p>

          {/* Annual toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className={`text-sm font-medium transition ${!annual ? 'text-white' : 'text-white/50'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative h-6 w-11 rounded-full transition-colors ${annual ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7]' : 'bg-white/20'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm font-medium transition ${annual ? 'text-white' : 'text-white/50'}`}>
              Annual
              <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400">Save 20%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                tier.featured
                  ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-transparent shadow-2xl shadow-purple-500/20'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-3 py-1 text-xs font-semibold">
                  Most Popular
                </span>
              )}
              <div>
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className="mt-2 text-sm text-white/50">{tier.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold">
                    ${annual ? tier.annualPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-white/60">/mo</span>
                </div>
                {annual && (
                  <p className="mt-1 text-xs text-green-400">
                    Billed annually — save ${(tier.monthlyPrice - tier.annualPrice) * 12}/yr
                  </p>
                )}
                <p className="mt-1 text-sm text-white/50">{tier.seats}</p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-purple-400">✓</span>
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
                {tier.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 opacity-40">
                    <span className="mt-0.5">✕</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition ${
                  tier.featured
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                    : 'border border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-white/40">
          All plans include 14-day free trial · No credit card required · Cancel anytime
        </p>
        {/* AI trial callout */}
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-purple-500/30 bg-purple-500/10 px-6 py-4 text-center">
          <p className="text-sm font-medium text-purple-300">
            🧠 <span className="font-semibold">NEW:</span> Every free trial includes <span className="font-bold">10 free AI calls</span> — score leads, draft emails, and summarise meetings instantly with GPT-4o-mini.
          </p>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Plan comparison</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-6 py-4 text-left font-medium text-white/60">Feature</th>
                {tiers.map((t) => (
                  <th key={t.name} className="px-6 py-4 text-center font-semibold">
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['CRM & pipeline', true, true, true],
                ['Unlimited leads', true, true, true],
                ['CSV import', true, true, true],
                ['Daily reports', 'Basic', 'Advanced', 'Custom'],
                ['🧠 AI assistant ✨', '20/mo', '100/mo', 'Unlimited'],
                ['AI lead scoring', true, true, true],
                ['AI email drafts', true, true, true],
                ['Proposals & contracts', false, true, true],
                ['Meta Leads integration', false, true, true],
                ['Team challenges', false, true, true],
                ['White-label', false, false, true],
                ['API access', false, false, true],
                ['Team seats', '3', '10', 'Unlimited'],
                ['Support', 'Email', 'Priority email', 'Dedicated'],
              ].map(([feature, starter, pro, enterprise], i) => (
                <tr key={String(feature)} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-6 py-3 text-white/70">{feature}</td>
                  {[starter, pro, enterprise].map((val, j) => (
                    <td key={j} className="px-6 py-3 text-center">
                      {val === true ? (
                        <span className="text-purple-400">✓</span>
                      ) : val === false ? (
                        <span className="text-white/20">—</span>
                      ) : (
                        <span className="text-white/70">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Frequently asked questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium"
              >
                <span>{faq.q}</span>
                <span className={`ml-4 flex-shrink-0 text-white/40 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {openFaq === i && (
                <div className="border-t border-white/5 px-6 py-4 text-sm text-white/60 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent p-12 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.2),_transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold">Start your 14-day free trial today</h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">No credit card. No setup fees. Up and running in 2 minutes.</p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-purple-500/40 transition hover:shadow-purple-500/60"
            >
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
