'use client'

interface FunnelData {
  leads:     number
  qualified: number
  meetings:  number
  proposals: number
  won:       number
  rates: {
    qualified_rate: number
    meeting_rate:   number
    proposal_rate:  number
    close_rate:     number
  }
}

const STAGES = [
  { key: 'leads',     label: 'Total Leads',   color: 'var(--brand-primary)' },
  { key: 'qualified', label: 'Qualified',      color: 'var(--brand-secondary)' },
  { key: 'meetings',  label: 'Meetings',       color: 'var(--brand-cyan)' },
  { key: 'proposals', label: 'Proposals Sent', color: 'var(--brand-amber)' },
  { key: 'won',       label: 'Won',            color: 'var(--brand-green)' },
] as const

const RATE_LABELS = [
  'Qualification Rate',
  'Meeting Rate',
  'Proposal Rate',
  'Close Rate',
]

export function MarketingFunnel({ data }: { data: FunnelData | null }) {
  if (!data) return <div className="skeleton" style={{ height: 240, borderRadius: 10 }} />

  const max = data.leads || 1
  const rates = [data.rates.qualified_rate, data.rates.meeting_rate, data.rates.proposal_rate, data.rates.close_rate]

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 520 }}>
        {STAGES.map((stage, i) => {
          const value = data[stage.key]
          const pct   = (value / max) * 100
          return (
            <div key={stage.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="t-body" style={{ fontWeight: 500 }}>{stage.label}</span>
                <span className="t-mono" style={{ fontSize: 14, fontWeight: 700, color: stage.color }}>{value.toLocaleString()}</span>
              </div>
              <div style={{ height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', marginBottom: 2 }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: stage.color,
                  borderRadius: 6,
                  opacity: 0.85,
                  transition: 'width 0.8s ease-out',
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                  minWidth: value > 0 ? 32 : 0,
                }}>
                  {pct > 15 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{pct.toFixed(0)}%</span>
                  )}
                </div>
              </div>
              {i < rates.length && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {RATE_LABELS[i]}: <strong style={{ color: 'var(--text-secondary)' }}>{rates[i].toFixed(1)}%</strong>
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
        {rates.map((r, i) => (
          <div key={i}>
            <p className="t-caption">{RATE_LABELS[i]}</p>
            <p className="t-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{r.toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}
