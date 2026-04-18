'use client'

import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { ChallengeRaceWidget } from '@/components/sales/ChallengeRaceWidget'
import { ChallengeAdminPanel } from '@/components/sales/ChallengeAdminPanel'

export default function ChallengesPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'
  const isPrivileged = role === 'manager' || role === 'admin'

  return (
    <SalesShell>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1 className="t-page-title">Challenges</h1>
          <p className="t-caption">
            {isPrivileged ? 'Create and manage sales challenges' : 'Active sales race leaderboard'}
          </p>
        </div>
      </div>

      <ChallengeRaceWidget />

      {isPrivileged && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Challenge Management
          </h2>
          <ChallengeAdminPanel />
        </div>
      )}
    </SalesShell>
  )
}
