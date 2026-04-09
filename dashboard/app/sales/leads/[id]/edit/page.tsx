'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SalesShell } from '@/components/sales/SalesShell'
import { LeadForm } from '@/components/sales/LeadForm'
import type { Lead } from '@/lib/sales/types'

export default function EditLeadPage() {
  const params = useParams()
  const id     = params.id as string
  const [lead, setLead] = useState<Lead | null>(null)

  useEffect(() => {
    fetch(`/api/sales/leads/${id}`)
      .then(r => r.json())
      .then(d => setLead(d.lead))
  }, [id])

  if (!lead) {
    return (
      <SalesShell>
        <div className="fadaa-card" style={{ height: 200 }} />
      </SalesShell>
    )
  }

  return (
    <SalesShell>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href={`/sales/leads/${id}`} style={{ color: '#64748B', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
          ← Back to Lead
        </Link>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>✎ Edit Lead</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{lead.company_name}</p>
        </div>
        <LeadForm mode="edit" initial={lead} leadId={id} />
      </div>
    </SalesShell>
  )
}
