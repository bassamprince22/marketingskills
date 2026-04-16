'use client'

import { SalesShell } from '@/components/sales/SalesShell'
import { AutoAssignCard } from '@/components/sales/AutoAssignCard'

export default function SettingsPage() {
  return (
    <SalesShell>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>⚙ Settings</h1>
        <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
          Lead assignment rules and system preferences
        </p>
      </div>

      <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AutoAssignCard />
      </div>
    </SalesShell>
  )
}
