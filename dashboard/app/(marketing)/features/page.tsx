import Link from 'next/link'

export const metadata = {
  title: 'Features — Fadaa Sales OS for Marketing Agencies',
  description: 'Explore every feature: CRM pipeline, AI lead scoring, proposals, Meta integration, team challenges, and daily reports — all built for marketing agencies.',
}

const sections = [
  {
    id: 'pipeline',
    icon: '📊',
    title: 'CRM & Pipeline',
    tagline: 'See every deal. Move fast. Close more.',
    body: 'Fadaa\'s drag-and-drop Kanban board gives every sales rep a live view of their pipeline — from first contact to signed contract. Custom stages, deal values, expected close dates, and color-coded priority flags keep the whole team aligned. Managers get an instant aggregate view across all reps.',
    bullets: [
      'Drag-and-drop Kanban with custom stages',
      'Deal value tracking + weighted pipeline value',
      'Expected close date with overdue alerts',
      'Per-rep and team-wide pipeline views',
      'One-click stage change with activity log',
    ],
  },
  {
    id: 'ai-scoring',
    icon: '🧠',
    title: 'AI Lead Scoring',
    tagline: 'Know which leads to call first — before you even pick up the phone.',
    body: 'Powered by GPT-4o-mini, Fadaa analyses every lead — company size, industry, budget signals, past activity — and returns a 1–10 quality score with plain-English reasoning. Reps see exactly why a lead is hot or cold, and get a suggested next action instantly. No more gut-feel prioritization.',
    bullets: [
      'Instant 1–10 score with reasoning on every lead',
      'Suggested next action (call, email, follow-up)',
      'Bulk re-score your entire pipeline at once',
      'AI call usage tracked per org, no surprise bills',
      'Works in Arabic and English',
    ],
    reverse: true,
  },
  {
    id: 'proposals',
    icon: '📄',
    title: 'Proposals & Contracts',
    tagline: 'Send a branded proposal in 60 seconds. Get it signed the same day.',
    body: 'Create beautiful, client-ready proposals directly inside Fadaa. Add your logo, brand colors, and a pricing table — then share a public link or send via email. Clients can accept or decline online with one click. No Word files. No PDFs emailed back and forth. No DocuSign account needed.',
    bullets: [
      'Branded cover with your logo and colors',
      'Inline pricing table builder with line items and taxes',
      'Public shareable URL — no login required for clients',
      'Client accept / decline with e-signature flow',
      'Full history: draft → sent → accepted',
    ],
  },
  {
    id: 'meta',
    icon: '⚡',
    title: 'Meta Leads Integration',
    tagline: 'Your Meta lead-gen ads pipe directly into your CRM.',
    body: 'Connect your Meta Business account and every lead from your Facebook and Instagram lead-gen forms arrives in your pipeline automatically — no CSV exports, no manual copy-pasting. Fadaa deduplicates by phone and email, assigns the lead to the right rep, and logs the source.',
    bullets: [
      'Automatic pull from Meta lead-gen forms',
      'Instant deduplication by email and phone',
      'Auto-assign to rep (round-robin or manual)',
      'Lead source tagged: "Meta" vs CSV vs manual',
      'Saves 10+ hours/week of manual data entry',
    ],
    reverse: true,
  },
  {
    id: 'challenges',
    icon: '🏆',
    title: 'Team Challenges',
    tagline: 'Friendly competition drives real results.',
    body: 'Set weekly or monthly sales challenges — most calls made, most deals closed, biggest contract value — and watch your team compete on a live leaderboard. Rewards and badges make hitting quota something reps look forward to rather than dread.',
    bullets: [
      'Manager-defined challenges with custom metrics',
      'Live leaderboard visible to the whole team',
      'Badges and rewards for milestone achievements',
      'Historical challenge results and winners',
      'Boosts rep engagement and accountability',
    ],
  },
  {
    id: 'reports',
    icon: '📈',
    title: 'Daily Reports',
    tagline: 'Every morning, a full picture of yesterday\'s performance — zero manual work.',
    body: 'Fadaa automatically generates a daily performance report for managers: pipeline health, new leads added, deals won, meetings completed, and rep activity scores. Reports are sent by email and available as PDF. No spreadsheet wrangling, no waiting for reps to update their CRM.',
    bullets: [
      'Automated daily PDF/email report',
      'Pipeline health: total value, stage breakdown',
      'Rep performance: leads contacted, proposals sent, deals won',
      'Configurable send time and recipient list',
      'Historical report archive inside the app',
    ],
    reverse: true,
  },
  {
    id: 'multilang',
    icon: '🌍',
    title: 'Arabic & English Support',
    tagline: 'Built for MENA agencies from day one.',
    body: 'Fadaa ships with full Arabic and English support across every page — UI, reports, emails, and proposals. The interface adapts to right-to-left layout automatically. Your team works in the language they\'re comfortable in, without switching between separate platforms.',
    bullets: [
      'Full RTL support for Arabic interface',
      'Proposals generated in Arabic or English',
      'AI scoring and email drafts in the lead\'s language',
      'Arabic numerals and date formats supported',
      'Designed for agencies in KSA, UAE, Egypt, and beyond',
    ],
  },
  {
    id: 'access',
    icon: '🔒',
    title: 'Role-Based Access',
    tagline: 'The right permissions for every person on your team.',
    body: 'Assign every team member a role — Admin, Manager, or Rep — and Fadaa automatically enforces what they can see and do. Reps see only their own leads. Managers see their team\'s data. Admins control the whole workspace. No accidental edits, no data leaks, no awkward situations.',
    bullets: [
      'Three built-in roles: Admin, Manager, Rep',
      'Reps see only their own assigned leads',
      'Managers see all rep activity without editing rights',
      'Admins control billing, team, and settings',
      'Audit log on every sensitive action',
    ],
    reverse: true,
  },
]

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.15),_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
            Everything included
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
            One platform. <span className="bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] bg-clip-text text-transparent">Every feature</span> you need.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Fadaa replaces your CRM, proposal tool, e-sign software, analytics dashboard, and team management app — with one platform built specifically for marketing agencies.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-6 py-3 text-base font-semibold text-white shadow-xl shadow-purple-500/30 transition hover:shadow-purple-500/50"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              View Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* Feature sections (alternating layout) */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="py-16 md:py-24">
            <div className={`flex flex-col gap-12 md:flex-row md:items-center ${s.reverse ? 'md:flex-row-reverse' : ''}`}>
              {/* Text */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{s.icon}</span>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
                    Feature {i + 1} of {sections.length}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-bold md:text-4xl">{s.title}</h2>
                <p className="mt-2 text-lg font-medium text-purple-300">{s.tagline}</p>
                <p className="mt-4 text-white/70 leading-relaxed">{s.body}</p>
                <ul className="mt-6 space-y-3">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-white/80">
                      <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-purple-500/20 text-xs text-purple-400">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mock screenshot */}
              <div className="flex-1">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <div className="h-3 w-3 rounded-full bg-green-500/60" />
                    <div className="ml-auto text-xs text-white/30">{s.title}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-8 w-full rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/10" />
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <div className="h-2 w-3/4 rounded bg-white/20" />
                          <div className="mt-2 h-6 w-1/2 rounded bg-purple-500/30" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30" />
                          <div className="flex-1 space-y-1">
                            <div className={`h-2 rounded bg-white/20 ${n % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
                            <div className="h-1.5 w-1/3 rounded bg-white/10" />
                          </div>
                          <div className="h-5 w-12 rounded-full bg-purple-500/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {i < sections.length - 1 && (
              <div className="mt-16 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            )}
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent p-12 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.2),_transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold md:text-4xl">All this. One platform. 14-day free trial.</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              No credit card required. Set up in 2 minutes. Cancel anytime.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-purple-500/40 transition hover:shadow-purple-500/60"
              >
                Start Free Trial →
              </Link>
              <Link
                href="/demo"
                className="rounded-lg border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
