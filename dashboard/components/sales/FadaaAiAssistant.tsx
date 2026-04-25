'use client'

import { useEffect, useRef, useState } from 'react'
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

const STARTER_PROMPTS = [
  'Draft a WhatsApp follow-up for a lead who did not answer.',
  'Help me write today sales update in a nutshell.',
  'What should I follow up on next?',
  'Turn these rough meeting notes into next steps.',
]

export function FadaaAiAssistant() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<Usage | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      content: 'Hi, I am Fadaa AI Assistance. I can help with follow-ups, daily updates, meeting notes, lead next steps, and proposal wording.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  async function sendMessage(messageText = input.trim()) {
    if (!messageText || loading) return

    const nextMessages: AiMessage[] = [...messages, { role: 'user', content: messageText }]
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
            role: (session?.user as { role?: string } | undefined)?.role ?? 'rep',
            userName: session?.user?.name ?? '',
            messages: nextMessages,
          },
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error ?? `AI request failed (${res.status})`)
      }

      if (payload?.usage) setUsage(payload.usage)
      setMessages(current => [...current, { role: 'assistant', content: String(payload?.result ?? '') }])
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

  return (
    <>
      <button
        className="mission-ai-btn"
        onClick={() => setOpen(true)}
        aria-label="Open Fadaa AI Assistance"
      >
        <span className="mission-ai-spark">AI</span>
        <span>Fadaa AI</span>
      </button>

      {open && (
        <>
          <button className="mission-ai-scrim" onClick={() => setOpen(false)} aria-label="Close Fadaa AI Assistance" />
          <aside className="mission-ai-panel" aria-label="Fadaa AI Assistance">
            <div className="mission-ai-header">
              <div>
                <p className="mission-ai-eyebrow">Sales copilot</p>
                <h2>Fadaa AI Assistance</h2>
                <p>Follow-ups, updates, notes, and next-step guidance.</p>
              </div>
              <button className="mission-ai-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

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

            <div className="mission-ai-quick">
              {STARTER_PROMPTS.map(prompt => (
                <button key={prompt} onClick={() => void sendMessage(prompt)} disabled={loading}>
                  {prompt}
                </button>
              ))}
            </div>

            {error && <div className="mission-ai-error">{error}</div>}
            {usage && (
              <div className="mission-ai-usage">
                AI usage: {usage.used} / {usage.limit} calls
                {usage.isTrial ? ' on trial' : ''}
              </div>
            )}

            <form className="mission-ai-form" onSubmit={handleSubmit}>
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Ask for a follow-up, daily update, meeting summary, or next action..."
                rows={3}
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
        </>
      )}
    </>
  )
}
