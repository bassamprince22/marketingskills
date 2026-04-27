'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function TrialBanner() {
  const { data: session } = useSession()
  const [trialInfo, setTrialInfo] = useState<{ daysLeft: number; plan: string } | null>(null)

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/sales/onboarding')
      .then((r) => r.ok ? r.json() : Promise.resolve({}))
      .then((d) => {
        if (d.trial_ends_at && d.plan === 'trial') {
          const ms = new Date(d.trial_ends_at).getTime() - Date.now()
          const days = Math.max(0, Math.ceil(ms / 86400000))
          setTrialInfo({ daysLeft: days, plan: d.plan })
        }
      })
      .catch(() => {})
  }, [session])

  if (!trialInfo || trialInfo.plan !== 'trial') return null

  const urgent = trialInfo.daysLeft <= 7

  return (
    <div
      className={`flex items-center justify-center gap-4 px-4 py-2 text-sm font-medium ${
        urgent
          ? 'bg-red-500/20 text-red-300'
          : 'bg-amber-500/20 text-amber-300'
      }`}
    >
      <span>
        {urgent ? '🔴' : '⏳'}{' '}
        {trialInfo.daysLeft === 0
          ? 'Your free trial has expired'
          : `${trialInfo.daysLeft} day${trialInfo.daysLeft === 1 ? '' : 's'} left in your free trial`}
      </span>
      <Link
        href="/sales/billing"
        className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
          urgent
            ? 'bg-red-500/30 hover:bg-red-500/50'
            : 'bg-amber-500/30 hover:bg-amber-500/50'
        }`}
      >
        Upgrade Now →
      </Link>
    </div>
  )
}
