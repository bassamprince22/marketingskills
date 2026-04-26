'use client'

import { useEffect, useRef, useState } from 'react'

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface AiChatDrawerProps {
  open:     boolean
  onClose:  () => void
  userRole?: string
}

const STARTERS = [
  { icon: '📊', text: 'Analyze my pipeline health' },
  { icon: '✉️', text: 'Help me draft a follow-up email' },
  { icon: '🎯', text: 'What should I focus on today?' },
  { icon: '📋', text: 'Help me write a proposal intro' },
  { icon: '💬', text: 'How do I handle a price objection?' },
  { icon: '🚨', text: 'Which leads are going cold?' },
]

export default function AiChatDrawer({ open, onClose, userRole = 'rep' }: AiChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [usage,    setUsage]    = useState<{ used: number; limit: number; remaining: number } | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/sales/ai/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUsage(d))
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  useEffect(() => {
    if (messages.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setLoading(true)

    try {
      const res = await fetch('/api/sales/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'chat', context: { message: trimmed, userRole } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'AI request failed')
        setMessages(p => p.slice(0, -1))
        return
      }
      if (data.usage) setUsage(data.usage)
      setMessages(prev => [...prev, { role: 'ai', text: typeof data.result === 'string' ? data.result : JSON.stringify(data.result) }])
    } catch {
      setError('Network error — please try again')
      setMessages(p => p.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const usagePct = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0
  const isEmpty  = messages.length === 0 && !loading && !error

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Fadaa AI Sales Copilot"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 400, maxWidth: '100vw',
          background: 'var(--surface-base, #0A0E1A)',
          borderLeft: '1px solid rgba(124,58,237,0.2)',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-12px 0 60px rgba(0,0,0,0.6)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '0 20px',
          height: 64,
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(79,142,247,0.08))',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED, #4F8EF7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 16px rgba(124,58,237,0.5)',
          }}>✨</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
              Fadaa AI Assistant
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Sales Copilot · GPT-4o mini
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600,
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}
          >×</button>
        </div>

        {/* ── Usage bar ── */}
        {usage && (
          <div style={{ padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              <span>AI calls this month</span>
              <span>{usage.used} / {usage.limit}</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, transition: 'width 0.4s',
                width: `${usagePct}%`,
                background: usagePct >= 90 ? '#EF4444' : usagePct >= 70 ? '#F59E0B' : 'linear-gradient(90deg,#7C3AED,#4F8EF7)',
              }} />
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Empty state */}
          {isEmpty && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center', paddingTop: 24 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,142,247,0.2))',
                  margin: '0 auto 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                }}>✨</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  How can I help?
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
                  Ask about your pipeline, leads,<br />follow-ups, meetings, or proposals.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {STARTERS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => send(s.text)}
                    style={{
                      textAlign: 'left', padding: '10px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, cursor: 'pointer',
                      color: 'rgba(255,255,255,0.65)', fontSize: 12,
                      transition: 'all 0.15s', lineHeight: 1.4,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = 'rgba(124,58,237,0.15)'
                      el.style.borderColor = 'rgba(124,58,237,0.35)'
                      el.style.color = '#fff'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = 'rgba(255,255,255,0.04)'
                      el.style.borderColor = 'rgba(255,255,255,0.08)'
                      el.style.color = 'rgba(255,255,255,0.65)'
                    }}
                  >
                    <span style={{ display: 'block', marginBottom: 3 }}>{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg,#7C3AED,#4F8EF7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: msg.role === 'user' ? 11 : 14, fontWeight: 700, color: '#fff',
              }}>
                {msg.role === 'user' ? 'U' : '✨'}
              </div>
              <div style={{
                maxWidth: '82%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                background: msg.role === 'user' ? 'linear-gradient(135deg,#7C3AED,#4F8EF7)' : 'rgba(255,255,255,0.06)',
                border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                fontSize: 13, lineHeight: 1.6,
                color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.85)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.text}
                {msg.role === 'ai' && (
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.text)}
                    style={{
                      display: 'block', marginTop: 6, background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: 0,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7C3AED' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)' }}
                  >Copy</button>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg,#7C3AED,#4F8EF7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
              }}>✨</div>
              <div style={{
                padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: '#7C3AED',
                    animation: `aiPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#FCA5A5', fontSize: 12,
            }}>{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{ padding: '12px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '8px 12px',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Ask anything… (Enter to send)"
              disabled={loading || usage?.remaining === 0}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', color: 'rgba(255,255,255,0.9)', fontSize: 13,
                lineHeight: 1.5, maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim() || usage?.remaining === 0}
              aria-label="Send"
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0, border: 'none',
                background: input.trim() && !loading ? 'linear-gradient(135deg,#7C3AED,#4F8EF7)' : 'rgba(255,255,255,0.07)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', color: '#fff',
                boxShadow: input.trim() && !loading ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
              </svg>
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aiPulse {
          0%,80%,100%{opacity:.3;transform:scale(.85)}
          40%{opacity:1;transform:scale(1.1)}
        }
      `}</style>
    </>
  )
}
