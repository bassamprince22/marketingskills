'use client'

import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { CommissionsTable } from '@/components/sales/CommissionsTable'

export default function CommissionsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? 'rep'

  return (
    <SalesShell>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1 className="t-page-title">Commissions</h1>
          <p className="t-caption">
            {role === 'rep' ? 'Your commission earnings and status' : 'Team commissions — approve and mark paid'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1000 }}>
        <CommissionsTable role={role} />
      </div>
    </SalesShell>
  )
}
