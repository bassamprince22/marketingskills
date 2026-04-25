'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface AiPanelProps {
  leadId:   string
  leadData: Record<string, unknown>
}

type Tab = 'score' | 'email' | 'meeting'

interface UsageInfo {
  used:      number
  limit:     number
  remaining: number
  isTrial:   boolean
}

export default function AiPanel({ leadId, leadData }: AiPanelProps) {
  const [open,    setOpen]    = useState(false)
  const [tab,     setTab]     = useState<Tab>('score')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [upgrade, setUpgrade] = useState(false)
  const [usage,   setUsage]   = useState<UsageInfo | null>(null)
  const [notes,   setNotes]   = useState('')

  useEffect(() => {
    if (open && !usage) {
      fetch('/api/sales/ai/usage')
        .then(r => r.json())
        .then(setUsage)
        .catch(() => {})
    }
  }, [open, usage])

  async function run() {
    setLoading(true)
    setResult(null)
    setError(null)
    setUpgrade(false)

    const actionMap: Record<Tab, string> = {
      score:   'score_lead',
      email:   'draft_followup',
      meeting: 'summarize_meeting',
    }
    const contextMap: Record<Tab, Record<string, unknown>> = {
      score:   leadData,
      email:   { lead: leadData, notes },
      meeting: { notes, lead_name: leadData.contact_person ?? leadData.company_name },
    }

    const res = await fetch('/api/sales/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionMap[tab], context: contextMap[tab] }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      if (data.code === 'AI_LIMIT') { setError(data.error); setUpgrade(data.isTrial); return }
      setError(data.error ?? 'AI request failed')
      return
    }

    if (data.usage) setUsage(data.usage)

    if (tab === 'score' && typeof data.result === 'object' && data.result !== null) {
      const r = data.result as { score: number; reasons: string[]; next_action: string }
      setResult(`Score: ${r.score}/10\n\nReasons:\n${r.reasons.map((x: string) => `• ${x}`).join('\n')}\n\nNext Action: ${r.next_action}`)
    } else {
      setResult(typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2))
    }
  }

  const usagePct = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-400">🧠</span>
          <span className="font-semibold text-sm">AI Assistant</span>
          <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-xs font-semibold text-purple-300">NEW</span>
          {usage && (
            <span className="text-xs text-white/30">
              {usage.remaining}/{usage.limit} calls left
            </span>
          )}
        </div>
        <span className="text-white/30 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 py-4">
          {/* Usage bar */}
          {usage && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-white/40">
                <span>{usage.isTrial ? '🎁 Free trial AI calls' : 'AI calls this month'}</span>
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
                  <Link href="/sales/billing" className="underline hover:text-amber-300">Upgrade for more →</Link>
                </p>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-4 flex gap-1">
            {([
              { key: 'score',   label: 'Score Lead' },
              { key: 'email',   label: 'Draft Email' },
              { key: 'meeting', label: 'Meeting Notes' },
            ] as { key: Tab; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setResult(null); setError(null) }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  tab === t.key
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Notes input for email/meeting tabs */}
          {(tab === 'email' || tab === 'meeting') && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={tab === 'email' ? 'Add context about this lead (optional)…' : 'Paste raw meeting notes here…'}
              className="mb-3 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50"
            />
          )}

          {/* Generate button */}
          <button
            onClick={run}
            disabled={loading || (usage?.remaining === 0)}
            className="w-full rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 disabled:opacity-50 transition hover:shadow-purple-500/40"
          >
            {loading ? 'Generating…' : `✨ Generate with AI`}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
              {upgrade && (
                <div className="mt-2">
                  <Link href="/sales/billing" className="inline-block rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-3 py-1.5 text-xs font-semibold text-white">
                    Upgrade to unlock unlimited AI →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3">
              <pre className="whitespace-pre-wrap text-xs text-white/80 leading-relaxed">{result}</pre>
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
