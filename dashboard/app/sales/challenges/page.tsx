'use client'

import { SalesShell } from '@/components/sales/SalesShell'
import { ChallengeRaceWidget } from '@/components/sales/ChallengeRaceWidget'

export default function ChallengesPage() {
  return (
    <SalesShell>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1 className="t-page-title">Challenges</h1>
          <p className="t-caption">Active sales race leaderboard</p>
        </div>
      </div>
      <ChallengeRaceWidget />
    </SalesShell>
  )
}
