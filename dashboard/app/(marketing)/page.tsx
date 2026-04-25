import Link from 'next/link'

export const metadata = {
  title: 'Fadaa — The All-in-One Sales OS for Marketing Agencies',
  description: 'Pipeline, proposals, AI lead scoring, team challenges, and Meta Leads sync — all in one platform built for marketing agencies.',
}

const features = [
  { icon: '📊', title: 'CRM & Pipeline',     desc: 'Drag-and-drop Kanban board to manage every deal from lead to close.' },
  { icon: '🧠', title: 'AI Lead Scoring',    desc: 'GPT-powered instant qualification with reasoning and next-action suggestions.' },
  { icon: '📄', title: 'Proposals & Contracts', desc: 'Beautiful branded documents with one-click generation and e-signature.' },
  { icon: '⚡', title: 'Meta Leads Sync',    desc: 'Automatically pull leads from Meta lead-gen forms into your pipeline.' },
  { icon: '🏆', title: 'Team Challenges',    desc: 'Gamified sales contests with leaderboards and instant rewards.' },
  { icon: '📈', title: 'Daily Reports',      desc: 'Automated PDF/email reports of pipeline health, won deals, and team performance.' },
  { icon: '🌍', title: 'Multi-language',     desc: 'Full Arabic + English support, ready for MENA agencies.' },
  { icon: '🔒', title: 'Role-Based Access',  desc: 'Manager, rep, and viewer roles with fine-grained permissions.' },
]

const tiers = [
  { name: 'Starter',    price: 49,  seats: '3 seats',         features: ['Core CRM', 'Pipeline board', 'Basic reports'] },
  { name: 'Pro',        price: 99,  seats: '10 seats',        features: ['Everything in Starter', 'AI scoring & drafts', 'Proposals & contracts', 'Meta integration', 'Team challenges'], featured: true },
  { name: 'Enterprise', price: 249, seats: 'Unlimited seats', features: ['Everything in Pro', 'White-label', 'API access', 'Priority support'] },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.18),_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
          <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
            ✨ Built for marketing agencies
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight md:text-6xl">
            The All-in-One <span className="bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] bg-clip-text text-transparent">Sales OS</span>
            <br /> for Marketing Agencies
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-white/70">
            Pipeline, proposals, AI lead scoring, team challenges, and Meta Leads sync —
            in one platform that replaces your spreadsheets, CRM, and contract tools.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-6 py-3 text-base font-semibold text-white shadow-xl shadow-purple-500/30 transition hover:shadow-purple-500/50"
            >
              Start Free Trial — 14 Days Free
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Watch Demo →
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/40">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 text-center sm:grid-cols-3">
          <div>
            <div className="text-3xl font-bold text-white">10×</div>
            <div className="mt-1 text-sm text-white/60">Faster proposal generation</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">2×</div>
            <div className="mt-1 text-sm text-white/60">Pipeline visibility</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">100%</div>
            <div className="mt-1 text-sm text-white/60">Built for agencies</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Everything your agency needs</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Stop juggling 8 tools. Fadaa unifies your sales workflow into one place.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-purple-500/30 hover:bg-white/[0.05]"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">From signup to first deal in minutes</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">
              Three simple steps — no implementation team required.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { n: 1, title: 'Sign up & brand', desc: 'Create your workspace, upload your logo, and pick your colors. 2 minutes.' },
              { n: 2, title: 'Add your leads',  desc: 'Sync from Meta Ads, import a CSV, or enter manually. Fadaa auto-deduplicates.' },
              { n: 3, title: 'Close deals',     desc: 'Use AI scoring to prioritize, branded proposals to win, and dashboards to track.' },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-8">
                <div className="absolute -top-4 left-8 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F8EF7] text-sm font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-white/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Simple, transparent pricing</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Start free for 14 days. No credit card. Cancel anytime.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 ${
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
              <h3 className="text-xl font-semibold">{tier.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold">${tier.price}</span>
                <span className="text-white/60">/mo</span>
              </div>
              <p className="mt-1 text-sm text-white/50">{tier.seats}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-purple-400">✓</span>
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${tier.name.toLowerCase()}`}
                className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition ${
                  tier.featured
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                    : 'border border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Loved by agency teams</h2>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { quote: 'We replaced HubSpot, Notion, and DocSend with Fadaa. Our reps are 3× more productive.', name: 'Sarah Mahmoud', role: 'Founder, Pulse Marketing' },
              { quote: 'The Meta Leads integration alone saved us 10 hours a week of manual CSV exports.', name: 'Omar Khaled',     role: 'Sales Director, Loop Agency' },
              { quote: 'AI scoring helped us focus on the right leads. We closed 40% more deals last quarter.',     name: 'Lina Farah',      role: 'CRO, Riyadh Creative' },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="text-2xl text-purple-400">&ldquo;</div>
                <p className="mt-2 text-white/80">{t.quote}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-sm font-semibold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-white/50">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent p-12 text-center md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.2),_transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold md:text-5xl">Ready to close more deals?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Start your 14-day free trial. No credit card. Setup in 2 minutes.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-purple-500/40 transition hover:shadow-purple-500/60"
            >
              Start Free Trial →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
