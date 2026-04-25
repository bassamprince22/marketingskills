'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

const PLANS = [
  {
    name: 'Starter',
    price: 49,
    seats: 3,
    ai: 0,
    features: ['Core CRM & pipeline', '3 seats', 'CSV import', 'Basic reports'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? '',
  },
  {
    name: 'Pro',
    price: 99,
    seats: 10,
    ai: 100,
    features: ['Everything in Starter', '10 seats', 'AI scoring (100/mo)', 'Proposals', 'Meta Leads', 'Challenges'],
    featured: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
  },
  {
    name: 'Enterprise',
    price: 249,
    seats: 9999,
    ai: 9999,
    features: ['Everything in Pro', 'Unlimited seats', 'Unlimited AI', 'White-label', 'API access'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? '',
  },
]

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#7C3AED'
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="font-medium text-white/80">
          {limit >= 9999 ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${limit >= 9999 ? 10 : pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function BillingContent() {
  const searchParams = useSearchParams()
  const expired = searchParams.get('expired') === '1'

  const [org, setOrg] = useState<{
    plan: string; trial_ends_at: string | null; status: string;
    ai_calls_used: number; ai_calls_limit: number; seats_used: number; seats_limit: number;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sales/billing')
      .then(r => r.json())
      .then(setOrg)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function startCheckout(planName: string) {
    setUpgrading(planName)
    try {
      const res = await fetch('/api/sales/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName.toLowerCase() }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Billing not yet configured. Add Stripe keys to enable payments.')
    } finally {
      setUpgrading(null)
    }
  }

  const trialDays = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  const currentPlan = org?.plan ?? 'trial'

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Trial expiry banner */}
      {expired && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4">
          <p className="font-semibold text-red-400">Your free trial has expired.</p>
          <p className="mt-1 text-sm text-white/60">Choose a plan below to continue using Fadaa.</p>
        </div>
      )}

      {/* Current plan + usage */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-4 text-lg font-semibold">Current Plan</h2>
        {loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold capitalize">{currentPlan}</span>
                  {currentPlan === 'trial' && trialDays !== null && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${trialDays <= 7 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {trialDays} days left
                    </span>
                  )}
                  {currentPlan !== 'trial' && (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400">Active</span>
                  )}
                </div>
                {currentPlan === 'trial' && (
                  <p className="mt-1 text-sm text-white/50">Free trial — upgrade to unlock all features</p>
                )}
              </div>
              {currentPlan !== 'trial' && (
                <Link
                  href="mailto:support@fadaa.io"
                  className="text-sm text-white/40 hover:text-white/70"
                >
                  Manage subscription →
                </Link>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <UsageMeter label="Team seats" used={org?.seats_used ?? 0} limit={org?.seats_limit ?? 5} />
              <UsageMeter label="AI calls this month" used={org?.ai_calls_used ?? 0} limit={org?.ai_calls_limit ?? 0} />
            </div>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div>
        <h2 className="mb-5 text-lg font-semibold">
          {currentPlan === 'trial' ? 'Choose your plan' : 'Change plan'}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase()
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.featured
                    ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-transparent'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-3 py-1 text-xs font-semibold">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-white/50">/mo</span>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-purple-400">✓</span>
                      <span className="text-white/70">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && startCheckout(plan.name)}
                  disabled={isCurrent || upgrading === plan.name}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    isCurrent
                      ? 'border border-white/10 bg-white/5 text-white/40 cursor-default'
                      : plan.featured
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                      : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : upgrading === plan.name ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-center text-xs text-white/30">
          Billed monthly · Cancel anytime · All plans include 14-day free trial
        </p>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  )
}
