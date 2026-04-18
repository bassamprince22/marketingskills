'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SalesShell } from '@/components/sales/SalesShell'
import { StageBadge } from '@/components/sales/StageBadge'
import { ActivityFeed } from '@/components/sales/ActivityFeed'
import { ContractEditor } from '@/components/sales/ContractEditor'
import type { Lead, Meeting, Document as Doc, Activity } from '@/lib/sales/types'
import { STAGE_LABELS, PIPELINE_STAGES, SERVICE_LABELS, SOURCE_LABELS, PRIORITY_LABELS } from '@/lib/sales/types'

type Tab = 'overview' | 'meetings' | 'documents' | 'activity'

function InfoRow({ label, value }: { label: string; value?: string | null | number }) {
  if (!value && value !== 0) return null
  return (
    <div className="info-row">
      <span className="info-row-label">{label}</span>
      <span className="info-row-value">{value}</span>
    </div>
  )
}

function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-desc">{desc}</p>
      {action}
    </div>
  )
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const role   = (session?.user as { role?: string })?.role ?? 'rep'

  const [lead,       setLead]       = useState<Lead | null>(null)
  const [meetings,   setMeetings]   = useState<Meeting[]>([])
  const [docs,       setDocs]       = useState<Doc[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [tab,        setTab]        = useState<Tab>('overview')
  const [stage,      setStage]      = useState('')
  const [updatingStage, setUpdatingStage] = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [showContract, setShowContract] = useState(false)

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

  if (loading) {
    return (
      <SalesShell>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 28, width: 160, borderRadius: 8 }} />
          <div className="skeleton fadaa-card" style={{ height: 140 }} />
          <div className="skeleton fadaa-card" style={{ height: 60 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="skeleton fadaa-card" style={{ height: 200 }} />
            <div className="skeleton fadaa-card" style={{ height: 200 }} />
          </div>
        </div>
      </SalesShell>
    )
  }

  if (!lead) {
    return (
      <SalesShell>
        <div className="fadaa-card">
          <EmptyState icon="◎" title="Lead not found" desc="This lead may have been deleted or you don't have access." action={<Link href="/sales/leads" className="fadaa-btn" style={{ textDecoration: 'none' }}>← Back to Leads</Link>} />
        </div>
      </SalesShell>
    )
  }

  const TABS = [
    { key: 'overview',   label: 'Overview' },
    { key: 'meetings',   label: `Meetings${meetings.length > 0 ? ` (${meetings.length})` : ''}` },
    { key: 'documents',  label: `Documents${docs.length > 0 ? ` (${docs.length})` : ''}` },
    { key: 'activity',   label: 'Activity' },
  ] as const

  return (
    <SalesShell>
      {/* Back link */}
      <Link href="/sales/leads" className="back-link">← All Leads</Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 className="t-page-title">{lead.company_name}</h1>
          <p className="t-body" style={{ marginTop: 4 }}>{lead.contact_person}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <StageBadge stage={lead.pipeline_stage} />
            <span className={`badge service-${lead.service_type}`}>{SERVICE_LABELS[lead.service_type]}</span>
            <span className={`badge priority-${lead.priority}`}>{PRIORITY_LABELS[lead.priority]}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {(role === 'manager' || role === 'admin') && (
            <button
              onClick={() => setShowContract(true)}
              className="fadaa-btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              📄 Generate Contract
            </button>
          )}
          <Link href={`/sales/leads/${id}/edit`} className="fadaa-btn-ghost" style={{ textDecoration: 'none' }}>
            ✎ Edit
          </Link>
          {(role === 'manager' || role === 'admin') && (
            <button onClick={handleDelete} className="fadaa-btn-danger fadaa-btn-sm">Delete</button>
          )}
        </div>
      </div>

      {/* Quick stage update */}
      <div className="fadaa-card" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="t-label" style={{ flexShrink: 0, textTransform: 'none', letterSpacing: 0 }}>Move to stage:</span>
        <select
          className="fadaa-input"
          style={{ maxWidth: 220 }}
          value={stage}
          onChange={e => handleStageChange(e.target.value)}
          disabled={updatingStage}
        >
          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        {updatingStage && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-primary)', fontSize: 12 }}>
            <span className="spinner spinner-sm" />Updating…
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-underline-bar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tab-underline${tab === t.key ? ' active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="fadaa-card">
            <div className="card-header">
              <h3 className="t-label" style={{ color: 'var(--brand-primary)' }}>Contact</h3>
            </div>
            <div style={{ padding: '12px 20px' }}>
              <InfoRow label="Company"  value={lead.company_name} />
              <InfoRow label="Contact"  value={lead.contact_person} />
              <InfoRow label="Phone"    value={lead.phone} />
              <InfoRow label="Email"    value={lead.email} />
            </div>
          </div>

          <div className="fadaa-card">
            <div className="card-header">
              <h3 className="t-label" style={{ color: '#A78BFA' }}>Lead Info</h3>
            </div>
            <div style={{ padding: '12px 20px' }}>
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
          </div>

          {(lead.marketing_package || lead.software_scope_notes) && (
            <div className="fadaa-card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header">
                <h3 className="t-label" style={{ color: '#22D3EE' }}>Service Details</h3>
              </div>
              <div style={{ padding: '12px 20px' }}>
                <InfoRow label="Marketing Package" value={lead.marketing_package} />
                <InfoRow label="Software Scope"    value={lead.software_scope_notes} />
              </div>
            </div>
          )}

          {lead.lead_source === 'meta' && lead.meta_raw_payload && Object.keys(lead.meta_raw_payload.fields ?? {}).length > 0 && (
            <div className="fadaa-card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="t-label" style={{ color: '#4F8EF7' }}>⚡ Meta Form Answers</h3>
                {(lead.meta_raw_payload.ad_name || lead.meta_raw_payload.form_name) && (
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto', paddingRight: 20 }}>
                    {lead.meta_raw_payload.form_name ? `Form: ${lead.meta_raw_payload.form_name}` : ''}
                    {lead.meta_raw_payload.form_name && lead.meta_raw_payload.ad_name ? ' · ' : ''}
                    {lead.meta_raw_payload.ad_name ? `Ad: ${lead.meta_raw_payload.ad_name}` : ''}
                  </span>
                )}
              </div>
              <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 0' }}>
                {Object.entries(lead.meta_raw_payload.fields).map(([key, value]) => {
                  if (!value) return null
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase())
                  return (
                    <div key={key} className="info-row" style={{ gridColumn: 'span 1' }}>
                      <span className="info-row-label">{label}</span>
                      <span className="info-row-value" style={{ wordBreak: 'break-word' }}>{value}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {lead.notes && (
            <div className="fadaa-card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header">
                <h3 className="t-label" style={{ color: '#F59E0B' }}>Notes</h3>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <p className="t-body" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{lead.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meetings tab */}
      {tab === 'meetings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Link href={`/sales/meetings?leadId=${id}`} className="fadaa-btn" style={{ textDecoration: 'none' }}>+ Log Meeting</Link>
          </div>
          {meetings.length === 0 ? (
            <div className="fadaa-card">
              <EmptyState icon="◷" title="No meetings yet" desc="Log your first meeting with this lead." action={<Link href={`/sales/meetings?leadId=${id}`} className="fadaa-btn" style={{ textDecoration: 'none' }}>+ Log Meeting</Link>} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meetings.map(m => (
                <div key={m.id} className="fadaa-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p className="t-card-title">{m.meeting_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Meeting</p>
                      <p className="t-caption" style={{ marginTop: 3 }}>{new Date(m.meeting_date).toLocaleString()}</p>
                    </div>
                    <span className={`badge badge-${m.status}`}>{m.status}</span>
                  </div>
                  {m.notes     && <p className="t-body" style={{ marginTop: 8 }}>📝 {m.notes}</p>}
                  {m.outcome   && <p style={{ color: '#4ADE80', fontSize: 13, marginTop: 6 }}>✓ {m.outcome}</p>}
                  {m.next_action && <p style={{ color: '#F59E0B', fontSize: 13, marginTop: 6 }}>→ Next: {m.next_action}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Link href={`/sales/documents?leadId=${id}`} className="fadaa-btn" style={{ textDecoration: 'none' }}>↑ Upload Document</Link>
          </div>
          {docs.length === 0 ? (
            <div className="fadaa-card">
              <EmptyState icon="⎗" title="No documents yet" desc="Upload quotations, contracts, or proposals for this lead." action={<Link href={`/sales/documents?leadId=${id}`} className="fadaa-btn" style={{ textDecoration: 'none' }}>↑ Upload</Link>} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map(d => (
                <div key={d.id} className="fadaa-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="t-card-title t-truncate">{d.file_name}</p>
                    <p className="t-caption" style={{ marginTop: 3 }}>
                      {d.doc_type} · {d.version} · {new Date(d.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                    <span className={`badge badge-${d.status}`}>{d.status}</span>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="fadaa-btn-ghost fadaa-btn-sm" style={{ textDecoration: 'none' }}>
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

      {/* Activity tab */}
      {tab === 'activity' && (
        <div className="fadaa-card" style={{ padding: 24 }}>
          <ActivityFeed activities={activities} />
        </div>
      )}

      {showContract && lead && (
        <ContractEditor
          lead={lead}
          onClose={() => setShowContract(false)}
          onSaved={() => setShowContract(false)}
        />
      )}
    </SalesShell>
  )
}
