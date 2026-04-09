'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SalesShell } from '@/components/sales/SalesShell'
import { StageBadge } from '@/components/sales/StageBadge'
import { ActivityFeed } from '@/components/sales/ActivityFeed'
import type { Lead, Meeting, Document as Doc, Activity, Qualification } from '@/lib/sales/types'
import { STAGE_LABELS, PIPELINE_STAGES, SERVICE_LABELS, SOURCE_LABELS, PRIORITY_LABELS } from '@/lib/sales/types'

type Tab = 'overview' | 'meetings' | 'documents' | 'activity'

function InfoRow({ label, value }: { label: string; value?: string | null | number }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #1E2D4A20' }}>
      <span style={{ color: '#64748B', fontSize: 12, minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#E2E8F0', fontSize: 13 }}>{value}</span>
    </div>
  )
}

export default function LeadDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const { data: session } = useSession()
  const role    = (session?.user as { role?: string })?.role ?? 'rep'
  const userId  = (session?.user as { id?: string })?.id ?? ''

  const [lead,    setLead]    = useState<Lead | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [docs,    setDocs]    = useState<Doc[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [qualification, setQual]    = useState<Qualification | null>(null)
  const [tab,     setTab]     = useState<Tab>('overview')
  const [stage,   setStage]   = useState('')
  const [updatingStage, setUpdatingStage] = useState(false)
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales/leads/${id}`).then(r => r.json()),
      fetch(`/api/sales/meetings?leadId=${id}`).then(r => r.json()),
      fetch(`/api/sales/documents?leadId=${id}`).then(r => r.json()),
      fetch(`/api/sales/activities?leadId=${id}`).then(r => r.json()),
    ]).then(([l, m, d, a]) => {
      setLead(l.lead)
      setStage(l.lead?.pipeline_stage ?? '')
      setMeetings(m.meetings ?? [])
      setDocs(d.documents ?? [])
      setActivities(a.activities ?? [])
      setLoading(false)
    })
  }, [id])

  async function handleStageChange(newStage: string) {
    setUpdatingStage(true)
    const res = await fetch(`/api/sales/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: newStage }),
    })
    if (res.ok) {
      setStage(newStage)
      setLead(prev => prev ? { ...prev, pipeline_stage: newStage as any } : prev)
    }
    setUpdatingStage(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete lead "${lead?.company_name}"? This cannot be undone.`)) return
    await fetch(`/api/sales/leads/${id}`, { method: 'DELETE' })
    router.push('/sales/leads')
  }

  const TAB_STYLE = (t: Tab): React.CSSProperties => ({
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: tab === t ? 600 : 400,
    color:     tab === t ? '#4F8EF7' : '#64748B',
    borderBottom: tab === t ? '2px solid #4F8EF7' : '2px solid transparent',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    transition: 'color 0.15s',
  })

  if (loading) {
    return (
      <SalesShell>
        <div className="fadaa-card" style={{ height: 300 }} />
      </SalesShell>
    )
  }

  if (!lead) {
    return (
      <SalesShell>
        <div className="fadaa-card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: '#F87171' }}>Lead not found</p>
          <Link href="/sales/leads" style={{ color: '#4F8EF7' }}>← Back to leads</Link>
        </div>
      </SalesShell>
    )
  }

  return (
    <SalesShell>
      {/* Back */}
      <Link href="/sales/leads" style={{ color: '#64748B', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        ← All Leads
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>{lead.company_name}</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{lead.contact_person}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <StageBadge stage={lead.pipeline_stage} />
            <span className={`service-${lead.service_type}`} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999 }}>
              {SERVICE_LABELS[lead.service_type]}
            </span>
            <span className={`priority-${lead.priority}`} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999 }}>
              {PRIORITY_LABELS[lead.priority]}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <Link href={`/sales/leads/${id}/edit`} className="fadaa-btn-ghost" style={{ textDecoration: 'none' }}>
            ✎ Edit
          </Link>
          {(role === 'manager' || role === 'admin') && (
            <button onClick={handleDelete} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Quick stage update */}
      <div className="fadaa-card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: '#64748B', fontSize: 13, flexShrink: 0 }}>Move to stage:</span>
        <select
          className="fadaa-input"
          style={{ maxWidth: 220 }}
          value={stage}
          onChange={e => handleStageChange(e.target.value)}
          disabled={updatingStage}
        >
          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        {updatingStage && <span style={{ color: '#4F8EF7', fontSize: 12 }}>Updating…</span>}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1E2D4A', marginBottom: 20, display: 'flex' }}>
        {(['overview', 'meetings', 'documents', 'activity'] as Tab[]).map(t => (
          <button key={t} style={TAB_STYLE(t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'meetings'  && meetings.length  > 0 ? ` (${meetings.length})`  : ''}
            {t === 'documents' && docs.length      > 0 ? ` (${docs.length})`      : ''}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="fadaa-card" style={{ padding: 24 }}>
            <h3 style={{ color: '#4F8EF7', fontSize: 13, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Contact</h3>
            <InfoRow label="Company"     value={lead.company_name} />
            <InfoRow label="Contact"     value={lead.contact_person} />
            <InfoRow label="Phone"       value={lead.phone} />
            <InfoRow label="Email"       value={lead.email} />
          </div>
          <div className="fadaa-card" style={{ padding: 24 }}>
            <h3 style={{ color: '#A78BFA', fontSize: 13, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Lead Info</h3>
            <InfoRow label="Source"      value={SOURCE_LABELS[lead.lead_source]} />
            <InfoRow label="Service"     value={SERVICE_LABELS[lead.service_type]} />
            <InfoRow label="Budget"      value={lead.budget_range} />
            <InfoRow label="Est. Value"  value={lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : null} />
            <InfoRow label="Deal Type"   value={lead.deal_type === 'retainer' ? 'Monthly Retainer' : 'One-time Project'} />
            <InfoRow label="Assigned To" value={lead.assigned_rep?.name} />
            <InfoRow label="Follow-up"   value={lead.next_follow_up_date} />
            <InfoRow label="Close Date"  value={lead.expected_close_date} />
            {lead.is_qualified && <InfoRow label="Status" value="✦ Qualified Lead" />}
          </div>
          {(lead.marketing_package || lead.software_scope_notes) && (
            <div className="fadaa-card" style={{ padding: 24, gridColumn: '1/-1' }}>
              <h3 style={{ color: '#22D3EE', fontSize: 13, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Service Details</h3>
              <InfoRow label="Marketing Package"  value={lead.marketing_package} />
              <InfoRow label="Software Scope"     value={lead.software_scope_notes} />
            </div>
          )}
          {lead.notes && (
            <div className="fadaa-card" style={{ padding: 24, gridColumn: '1/-1' }}>
              <h3 style={{ color: '#FCD34D', fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Notes</h3>
              <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{lead.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'meetings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Link href={`/sales/meetings?leadId=${id}`} className="fadaa-btn" style={{ textDecoration: 'none' }}>
              + Log Meeting
            </Link>
          </div>
          {meetings.length === 0 ? (
            <div className="fadaa-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>No meetings logged yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {meetings.map(m => (
                <div key={m.id} className="fadaa-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14 }}>
                        {m.meeting_type.charAt(0).toUpperCase() + m.meeting_type.slice(1)} Meeting
                      </p>
                      <p style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                        {new Date(m.meeting_date).toLocaleString()}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 999,
                      background: m.status === 'completed' ? 'rgba(74,222,128,0.1)' : m.status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(79,142,247,0.1)',
                      color:      m.status === 'completed' ? '#4ADE80'              : m.status === 'cancelled' ? '#F87171'              : '#60A5FA',
                    }}>
                      {m.status}
                    </span>
                  </div>
                  {m.notes    && <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 10 }}>📝 {m.notes}</p>}
                  {m.outcome  && <p style={{ color: '#34D399', fontSize: 13, marginTop: 6 }}>✓ Outcome: {m.outcome}</p>}
                  {m.next_action && <p style={{ color: '#FCD34D', fontSize: 13, marginTop: 6 }}>→ Next: {m.next_action}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Link href={`/sales/documents?leadId=${id}`} className="fadaa-btn" style={{ textDecoration: 'none' }}>
              ↑ Upload Document
            </Link>
          </div>
          {docs.length === 0 ? (
            <div className="fadaa-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>No documents yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {docs.map(d => (
                <div key={d.id} className="fadaa-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 13 }}>{d.file_name}</p>
                    <p style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>
                      {d.doc_type} · {d.version} · {new Date(d.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 999,
                      background: d.status === 'signed' ? 'rgba(74,222,128,0.1)' : 'rgba(79,142,247,0.1)',
                      color:      d.status === 'signed' ? '#4ADE80'              : '#60A5FA',
                    }}>
                      {d.status}
                    </span>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="fadaa-btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
                        ↗ Open
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="fadaa-card" style={{ padding: 24 }}>
          <ActivityFeed activities={activities} />
        </div>
      )}
    </SalesShell>
  )
}
