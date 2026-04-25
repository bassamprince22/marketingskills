'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const steps = [
  {
    key: 'agency_type',
    title: 'What type of agency are you?',
    subtitle: 'This helps us personalise your Fadaa experience.',
    options: [
      { value: 'digital',      icon: '💻', label: 'Digital Marketing' },
      { value: 'creative',     icon: '🎨', label: 'Creative Agency' },
      { value: 'performance',  icon: '📈', label: 'Performance Marketing' },
      { value: 'full-service', icon: '🏢', label: 'Full-Service Agency' },
      { value: 'other',        icon: '✨', label: 'Other' },
    ],
  },
  {
    key: 'team_size',
    title: 'How big is your team?',
    subtitle: 'We\'ll set up the right defaults for your workspace.',
    options: [
      { value: '1',    icon: '👤', label: 'Just Me' },
      { value: '2-5',  icon: '👥', label: '2–5 people' },
      { value: '6-15', icon: '🏘️', label: '6–15 people' },
      { value: '16-50',icon: '🏙️', label: '16–50 people' },
      { value: '50+',  icon: '🌆', label: '50+ people' },
    ],
  },
  {
    key: 'primary_goal',
    title: "What's your main goal with Fadaa?",
    subtitle: 'Pick the one that matters most right now.',
    options: [
      { value: 'close_more_deals', icon: '🎯', label: 'Close more deals' },
      { value: 'manage_team',      icon: '👔', label: 'Manage my sales team' },
      { value: 'track_leads',      icon: '🔍', label: 'Track & organise leads' },
      { value: 'proposals',        icon: '📄', label: 'Send better proposals' },
      { value: 'all',              icon: '🚀', label: 'All of the above' },
    ],
  },
  {
    key: 'current_tool',
    title: 'What are you using today to manage sales?',
    subtitle: 'No judgement — we\'ve seen it all.',
    options: [
      { value: 'spreadsheets', icon: '📊', label: 'Spreadsheets' },
      { value: 'other_crm',    icon: '🗂️', label: 'Another CRM' },
      { value: 'nothing',      icon: '🤷', label: 'Nothing yet' },
      { value: 'other',        icon: '🔧', label: 'Other' },
    ],
  },
  {
    key: 'hear_about',
    title: 'How did you hear about us?',
    subtitle: 'Helps us understand where to improve.',
    options: [
      { value: 'google',   icon: '🔍', label: 'Google Search' },
      { value: 'meta_ad',  icon: '📱', label: 'Meta Ad' },
      { value: 'referral', icon: '🤝', label: 'Referral' },
      { value: 'linkedin', icon: '💼', label: 'LinkedIn' },
      { value: 'other',    icon: '✨', label: 'Other' },
    ],
  },
]

export default function SurveyPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const current = steps[step]
  const selected = answers[current.key]
  const isLast = step === steps.length - 1
  const progress = ((step + 1) / steps.length) * 100

  function select(value: string) {
    setAnswers({ ...answers, [current.key]: value })
  }

  async function next() {
    if (!selected) return
    if (!isLast) { setStep(step + 1); return }

    // Submit all answers
    setLoading(true)
    try {
      await fetch('/api/onboarding/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
    } catch { /* non-blocking */ }
    router.push('/onboarding/setup')
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-2 flex items-center justify-between text-xs text-white/40">
        <span>Step {step + 1} of {steps.length}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
      <div className="mb-10 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="text-center">
        <h1 className="text-2xl font-bold md:text-3xl">{current.title}</h1>
        <p className="mt-2 text-white/60">{current.subtitle}</p>
      </div>

      {/* Option cards */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {current.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => select(opt.value)}
            className={`flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition ${
              selected === opt.value
                ? 'border-purple-500/60 bg-gradient-to-b from-purple-500/20 to-purple-500/5 shadow-lg shadow-purple-500/20'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
            }`}
          >
            <span className="text-4xl">{opt.icon}</span>
            <span className="text-sm font-medium">{opt.label}</span>
            {selected === opt.value && (
              <span className="absolute top-3 right-3 text-xs text-purple-400">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          onClick={next}
          disabled={!selected || loading}
          className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:opacity-40"
        >
          {loading ? 'Saving...' : isLast ? "Let's Go! →" : 'Next →'}
        </button>
      </div>
    </div>
  )
}
