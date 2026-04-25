'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

const plans = [
  { value: 'starter', label: 'Starter', price: '$49/mo', desc: '3 seats · Core CRM' },
  { value: 'pro',     label: 'Pro',     price: '$99/mo', desc: '10 seats · AI + Proposals', popular: true },
  { value: 'enterprise', label: 'Enterprise', price: '$249/mo', desc: 'Unlimited · White-label' },
]

const perks = [
  '14-day free trial — no credit card',
  'AI lead scoring (GPT-4o-mini)',
  'Proposals with client-facing URL',
  'Meta Leads integration',
  'Team challenges & leaderboard',
  'Arabic + English support',
  'Cancel anytime, export your data',
]

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') ?? 'pro'

  const [form, setForm] = useState({
    agencyName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    plan: planParam,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!form.agencyName.trim()) e.agencyName = 'Agency name is required'
    if (!form.fullName.trim()) e.fullName = 'Your name is required'
    if (!form.email.includes('@')) e.email = 'Valid email required'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setServerError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: form.agencyName,
          fullName:   form.fullName,
          email:      form.email,
          password:   form.password,
          plan:       form.plan,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setServerError(data.error ?? 'Signup failed'); return }
      router.push('/onboarding/survey')
    } catch {
      setServerError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white antialiased">
      <div className="mx-auto grid max-w-6xl min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: form */}
        <div className="flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F8EF7] text-sm font-bold">
                F
              </div>
              <span className="text-lg font-semibold tracking-tight">Fadaa</span>
            </Link>

            <h1 className="text-2xl font-bold">Start your free trial</h1>
            <p className="mt-1 text-sm text-white/60">14 days free. No credit card required.</p>

            {serverError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Agency name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Agency / Company Name *</label>
                <input
                  value={form.agencyName}
                  onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                  placeholder="Pulse Marketing"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
                {errors.agencyName && <p className="mt-1 text-xs text-red-400">{errors.agencyName}</p>}
              </div>

              {/* Full name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Your Full Name *</label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Sarah Mahmoud"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Work Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="sarah@pulsemarketing.com"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Confirm Password *</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Plan selector */}
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">Select Plan *</label>
                <div className="grid gap-2">
                  {plans.map((p) => (
                    <label
                      key={p.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                        form.plan === p.value
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={p.value}
                        checked={form.plan === p.value}
                        onChange={() => setForm({ ...form, plan: p.value })}
                        className="accent-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {p.label}
                          {p.popular && (
                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                              Most Popular
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-white/50">{p.desc}</div>
                      </div>
                      <span className="text-sm font-semibold text-white/70">{p.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:opacity-60"
              >
                {loading ? 'Creating your account...' : 'Start Free Trial →'}
              </button>

              <p className="text-center text-xs text-white/40">
                No credit card required · 14-day free trial · Cancel anytime
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-white/50">
              Already have an account?{' '}
              <Link href="/sales/login" className="text-purple-400 hover:text-purple-300">
                Sign In
              </Link>
            </p>

            <p className="mt-4 text-center text-xs text-white/30">
              By signing up you agree to our{' '}
              <Link href="/terms" className="underline hover:text-white/60">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-white/60">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        {/* Right: perks panel */}
        <div className="hidden items-center justify-center border-l border-white/5 bg-white/[0.02] px-12 lg:flex">
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold">Everything you need to close more deals</h2>
              <p className="mt-2 text-sm text-white/60">Join agencies across MENA using Fadaa to grow their sales.</p>
            </div>
            <ul className="space-y-4">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-purple-500/20 text-xs text-purple-400">
                    ✓
                  </span>
                  <span className="text-white/80">{perk}</span>
                </li>
              ))}
            </ul>

            {/* Testimonial */}
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm italic text-white/70">
                &ldquo;We replaced three tools with Fadaa. Our reps are 3× more productive and we&apos;re sending proposals in under a minute.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-sm font-semibold">
                  S
                </div>
                <div>
                  <div className="text-sm font-semibold">Sarah Mahmoud</div>
                  <div className="text-xs text-white/50">Founder, Pulse Marketing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
