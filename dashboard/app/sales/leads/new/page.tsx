import { SalesShell } from '@/components/sales/SalesShell'
import { LeadForm } from '@/components/sales/LeadForm'

export default function NewLeadPage() {
  return (
    <SalesShell>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>◎ New Lead</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            Add a new lead to your pipeline
          </p>
        </div>
        <LeadForm mode="create" />
      </div>
    </SalesShell>
  )
}
