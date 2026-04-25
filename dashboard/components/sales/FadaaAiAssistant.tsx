'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

type AiMessage = {
  role: 'user' | 'assistant'
  content: string
}

type Usage = {
  used: number
  limit: number
  remaining: number
  isTrial: boolean
}

type AssistantMode = 'launcher' | 'widget'

type FadaaAiAssistantProps = {
  mode?: AssistantMode
  context?: Record<string, unknown>
  starterPrompts?: string[]
}

const REP_PROMPTS = [
  'Build my follow-up plan for today.',
  'Draft a WhatsApp follow-up for a lead who did not answer.',
  'Turn my work today into a daily report draft.',
  'Help me qualify a new Meta lead quickly.',
]

const MANAGER_PROMPTS = [
  'Summarize today pipeline risks and priorities.',
  'Which reps or leads need attention first?',
  'Draft a short team update from this dashboard.',
  'Create coaching notes for overdue follow-ups.',
]

function SparkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 5 5.2 1.2-5.2 1.8L12 21l-1.8-10L5 9.2 10.2 8 12 3Z" />
      <path d="M19 3v4" />
      <path d="M21 5h-4" />
    </svg>
  )
}

function Capability({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mission-ai-capability">
      <span><SparkIcon /></span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}

export function FadaaAiAssistant({
  mode = 'launcher',
  context = {},
  starterPrompts,
}: FadaaAiAssistantProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(mode === 'widget')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<Usage | null>(null)
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      content: 'Welcome to Fadaa AI Assistant. Ask me for follow-ups, daily updates, lead next steps, meeting summaries, proposal wording, or admin pipeline actions.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'rep'
  const isManagerView = role === 'admin' || role === 'manager'
  const prompts = starterPrompts ?? (isManagerView ? MANAGER_PROMPTS : REP_PROMPTS)
  const visible = mode === 'widget' || open

  const quickIntro = useMemo(() => {
    if (isManagerView) {
      return 'Built for admin and manager decisions: pipeline risk, team focus, rep coaching, report wording, and assignment priorities.'
    }
    return 'Built for rep execution: follow-up scripts, daily report drafts, lead qualification, meeting prep, and next actions.'
  }, [isManagerView])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, visible])

  useEffect(() => {
    if (!visible) return
    let active = true
    fetch('/api/sales/ai/usage')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (active && data) setUsage(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [visible])

  useEffect(() => {
    if (mode === 'launcher' && open) {
      window.setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [mode, open])

  async function sendMessage(messageText = input.trim()) {
    const text = messageText.trim()
    if (!text || loading) return

    const nextMessages: AiMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/sales/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          context: {
            page: pathname,
            role,
            userName: session?.user?.name ?? '',
            message: text,
            messages: nextMessages,
            workspaceContext: context,
            assistantSurface: mode,
          },
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error ?? `AI request failed (${res.status})`)
      }

      if (payload?.usage) setUsage(payload.usage)
      const answer = String(payload?.result ?? '').trim()
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: answer || 'I did not receive an answer from the AI service. Please try again.',
        },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed.'
      setError(message)
      setMessages(current => [...current, { role: 'assistant', content: `I could not answer yet: ${message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  function renderPanel(surface: AssistantMode) {
    return (
      <aside
        className={`mission-ai-${surface === 'widget' ? 'widget' : 'panel'}`}
        aria-label="Fadaa AI Assistant"
        role={surface === 'launcher' ? 'dialog' : undefined}
        aria-modal={surface === 'launcher' ? true : undefined}
      >
        <div className="mission-ai-header">
          <div className="mission-ai-title-row">
            <span className="mission-ai-logo"><SparkIcon /></span>
            <div>
              <p className="mission-ai-eyebrow">Fadaa sales copilot</p>
              <h2>Fadaa AI Assistant</h2>
              <p>{quickIntro}</p>
            </div>
          </div>
          {surface === 'launcher' && (
            <button className="mission-ai-close" onClick={() => setOpen(false)} aria-label="Close">
              x
            </button>
          )}
        </div>

        {surface === 'widget' && (
          <div className="mission-ai-capability-grid">
            <Capability title="Follow-up help">Draft WhatsApp, email, and call notes using CRM context.</Capability>
            <Capability title="Daily updates">Turn sales work into a clean daily report draft.</Capability>
            <Capability title={isManagerView ? 'Team intelligence' : 'Next best action'}>
              {isManagerView ? 'Spot risk, assignments, and coaching priorities.' : 'Prioritize what to work on next and why.'}
            </Capability>
          </div>
        )}

        <div ref={scrollRef} className="mission-ai-messages">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`mission-ai-message ${message.role}`}>
              <div className="mission-ai-message-role">{message.role === 'assistant' ? 'Fadaa AI' : 'You'}</div>
              <div className="mission-ai-message-content">{message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="mission-ai-message assistant">
              <div className="mission-ai-message-role">Fadaa AI</div>
              <div className="mission-ai-message-content">Thinking through the best next move...</div>
            </div>
          )}
        </div>

        <div className="mission-ai-quick" aria-label="AI prompt examples">
          {prompts.map(prompt => (
            <button key={prompt} onClick={() => void sendMessage(prompt)} disabled={loading}>
              {prompt}
            </button>
          ))}
        </div>

        {error && <div className="mission-ai-error">{error}</div>}
        {usage && (
          <div className="mission-ai-usage">
            <span>AI usage: {usage.used} / {usage.limit} calls</span>
            {usage.remaining <= 0 && <strong>No calls remaining</strong>}
          </div>
        )}

        <form className="mission-ai-form" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Ask for a follow-up, daily update, meeting summary, proposal text, or next action..."
            rows={surface === 'widget' ? 2 : 3}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendMessage()
              }
            }}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </aside>
    )
  }

  if (mode === 'widget') {
    return renderPanel('widget')
  }

  return (
    <>
      <button
        className="mission-ai-btn"
        onClick={() => setOpen(true)}
        aria-label="Open Fadaa AI Assistant"
      >
        <span className="mission-ai-spark"><SparkIcon /></span>
        <span>Fadaa AI</span>
      </button>

      {mounted && open
        ? createPortal(
          <>
            <button className="mission-ai-scrim" onClick={() => setOpen(false)} aria-label="Close Fadaa AI Assistant" />
            {renderPanel('launcher')}
          </>,
          document.body
        )
        : null}
    </>
  )
}
