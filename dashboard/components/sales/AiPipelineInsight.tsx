'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'
import type { ManagerStats, PipelineCount, RepPerformance } from '@/lib/sales/types'

interface AiPipelineInsightProps {
  stats: ManagerStats
  pipeline: PipelineCount[]
  topReps: RepPerformance[]
  overdueCount: number
  staleCount: number
  atRiskCount: number
  meetingsToday: number
}

type UsageInfo = {
  used: number
  limit: number
  remaining: number
  isTrial: boolean
}

export function AiPipelineInsight({
  stats,
  pipeline,
  topReps,
  overdueCount,
  staleCount,
  atRiskCount,
  meetingsToday,
}: AiPipelineInsightProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [upgrade, setUpgrade] = useState(false)

  async function analyze() {
    try {
      setLoading(true)
      setError('')
      setUpgrade(false)

      const response = await fetch('/api/sales/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_pipeline',
          context: {
            stats,
            pipeline,
            risk_signals: {
              overdue_followups: overdueCount,
              stale_leads: staleCount,
              deals_at_risk: atRiskCount,
              meetings_today: meetingsToday,
            },
            top_reps: topReps.slice(0, 5),
          },
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (payload?.code === 'AI_LIMIT') setUpgrade(Boolean(payload?.isTrial))
        throw new Error(payload?.error ?? 'AI analysis failed.')
      }

      if (payload?.usage) setUsage(payload.usage)
      setResult(String(payload?.result ?? 'No insight returned.'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const miniCardStyle: CSSProperties = {
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: '12px 14px',
  }
  const miniValueStyle: CSSProperties = {
    display: 'block',
    color: '#F4F7FF',
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1,
  }
  const miniLabelStyle: CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: 12,
    marginTop: 6,
  }

  return (
    <div className="fadaa-card" style={{ border: '1px solid rgba(124,58,237,0.28)', overflow: 'hidden' }}>
      <div className="card-header">
        <div>
          <p className="t-label" style={{ color: '#C5A8FF', marginBottom: 4 }}>AI Pipeline Intelligence</p>
          <h2 className="t-section-title">This week&apos;s sales readout</h2>
          <p className="t-caption" style={{ marginTop: 3 }}>Uses current dashboard data to find risks, opportunities, and next moves.</p>
        </div>
        <button
          onClick={analyze}
          disabled={loading || usage?.remaining === 0}
          className="fadaa-btn"
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? 'Analyzing...' : result ? 'Refresh Insight' : 'Analyze Pipeline'}
        </button>
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        {usage && (
          <p className="t-caption" style={{ marginBottom: 10 }}>
            AI usage: {usage.used} / {usage.limit} calls
          </p>
        )}

        {error && (
          <div style={{ border: '1px solid rgba(248,113,113,0.28)', background: 'rgba(248,113,113,0.08)', borderRadius: 12, padding: 12, color: '#FCA5A5', fontSize: 13 }}>
            {error}
            {upgrade && (
              <div style={{ marginTop: 8 }}>
                <Link href="/sales/billing" style={{ color: '#C5A8FF', fontWeight: 700, textDecoration: 'none' }}>Upgrade for more AI -&gt;</Link>
              </div>
            )}
          </div>
        )}

        {!result && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div style={miniCardStyle}>
              <span style={miniValueStyle}>{overdueCount}</span>
              <p style={miniLabelStyle}>overdue follow-ups</p>
            </div>
            <div style={miniCardStyle}>
              <span style={miniValueStyle}>{atRiskCount}</span>
              <p style={miniLabelStyle}>deals at risk</p>
            </div>
            <div style={miniCardStyle}>
              <span style={miniValueStyle}>{staleCount}</span>
              <p style={miniLabelStyle}>stale leads</p>
            </div>
            <div style={miniCardStyle}>
              <span style={miniValueStyle}>{meetingsToday}</span>
              <p style={miniLabelStyle}>meetings today</p>
            </div>
          </div>
        )}

        {result && (
          <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            {result}
          </pre>
        )}
      </div>
    </div>
  )
}
