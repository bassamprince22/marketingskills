'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface AiPanelProps {
  leadId: string
  leadData: Record<string, unknown>
}

type Tab = 'score' | 'email' | 'meeting'

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  isTrial: boolean
}

function formatScoreResult(result: unknown) {
  if (!result || typeof result !== 'object') return typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  const score = result as { score?: number; reasons?: unknown; next_action?: string }
  const reasons = Array.isArray(score.reasons) ? score.reasons.map(String) : []

  return [
    `Score: ${score.score ?? '-'}/10`,
    '',
    'Reasons:',
    ...(reasons.length > 0 ? reasons.map((reason) => `- ${reason}`) : ['- No reasons returned.']),
    '',
    `Next action: ${score.next_action ?? 'Review lead and choose the next touchpoint.'}`,
  ].join('\n')
}

export default function AiPanel({ leadId, leadData }: AiPanelProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('score')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [upgrade, setUpgrade] = useState(false)
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open || usage) return
    fetch('/api/sales/ai/usage')
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => payload && setUsage(payload))
      .catch(() => {})
  }, [open, usage])

  async function run() {
    setLoading(true)
    setResult(null)
    setError(null)
    setUpgrade(false)

    const actionMap: Record<Tab, string> = {
      score: 'score_lead',
      email: 'draft_followup',
      meeting: 'summarize_meeting',
    }
    const contextMap: Record<Tab, Record<string, unknown>> = {
      score: { lead_id: leadId, ...leadData },
      email: { lead_id: leadId, lead: leadData, notes },
      meeting: { lead_id: leadId, notes, lead_name: leadData.contact_person ?? leadData.company_name },
    }

    try {
      const response = await fetch('/api/sales/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionMap[tab], context: contextMap[tab] }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (payload?.code === 'AI_LIMIT') {
          setUpgrade(Boolean(payload?.isTrial))
        }
        throw new Error(payload?.error ?? 'AI request failed.')
      }

      if (payload?.usage) setUsage(payload.usage)
      setResult(tab === 'score' ? formatScoreResult(payload?.result) : String(payload?.result ?? 'No response returned.'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed.')
    } finally {
      setLoading(false)
    }
  }

  const usagePct = usage && usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-400">AI</span>
          <span className="text-sm font-semibold">AI Assistant</span>
          <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-xs font-semibold text-purple-300">NEW</span>
          {usage && (
            <span className="text-xs text-white/30">
              {usage.remaining}/{usage.limit} calls left
            </span>
          )}
        </div>
        <span className="text-sm text-white/30">{open ? 'Collapse' : 'Open'}</span>
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 py-4">
          {usage && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-white/40">
                <span>{usage.isTrial ? 'Free trial AI calls' : 'AI calls this month'}</span>
                <span>{usage.used} / {usage.limit}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${usagePct}%`,
                    backgroundColor: usagePct >= 90 ? '#EF4444' : usagePct >= 70 ? '#F59E0B' : '#7C3AED',
                  }}
                />
              </div>
              {usage.isTrial && usage.remaining <= 3 && (
                <p className="mt-1 text-xs text-amber-400">
                  {usage.remaining === 0 ? 'No calls left. ' : `Only ${usage.remaining} left. `}
                  <Link href="/sales/billing" className="underline hover:text-amber-300">Upgrade for more -&gt;</Link>
                </p>
              )}
            </div>
          )}

          <div className="mb-4 flex gap-1">
            {([
              { key: 'score', label: 'Score Lead' },
              { key: 'email', label: 'Draft Email' },
              { key: 'meeting', label: 'Meeting Notes' },
            ] as { key: Tab; label: string }[]).map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTab(item.key)
                  setResult(null)
                  setError(null)
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  tab === item.key
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {(tab === 'email' || tab === 'meeting') && (
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder={tab === 'email' ? 'Add context about this lead (optional)...' : 'Paste raw meeting notes here...'}
              className="mb-3 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50"
            />
          )}

          <button
            onClick={run}
            disabled={loading || usage?.remaining === 0}
            className="w-full rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:shadow-purple-500/40 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate with AI'}
          </button>

          {error && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
              {upgrade && (
                <div className="mt-2">
                  <Link href="/sales/billing" className="inline-block rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-3 py-1.5 text-xs font-semibold text-white">
                    Upgrade to unlock more AI -&gt;
                  </Link>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-white/80">{result}</pre>
              <button
                onClick={() => navigator.clipboard.writeText(result)}
                className="mt-2 text-xs text-purple-400 hover:text-purple-300"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
