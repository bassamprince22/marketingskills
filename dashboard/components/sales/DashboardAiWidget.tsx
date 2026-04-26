'use client'

import { useRef, useState } from 'react'

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface DashboardAiWidgetProps {
  role: 'admin' | 'manager' | 'rep'
}

const ADMIN_PROMPTS = [
  { icon: '📊', text: 'Analyze my pipeline health' },
  { icon: '🚨', text: 'Which leads are going cold this week?' },
  { icon: '👥', text: 'How is my team performing?' },
  { icon: '💰', text: 'Forecast this month\'s revenue' },
  { icon: '⚡', text: 'What should I focus on today?' },
  { icon: '📝', text: 'Draft a team performance update' },
]

const REP_PROMPTS = [
  { icon: '✉️', text: 'Help me draft a follow-up email' },
  { icon: '🎯', text: 'How do I qualify this lead faster?' },
  { icon: '📅', text: 'Prepare me for my next meeting' },
  { icon: '📋', text: 'Help me write a proposal intro' },
  { icon: '💬', text: 'How do I handle a price objection?' },
  { icon: '⚡', text: 'What should I prioritize today?' },
]

export default function DashboardAiWidget({ role }: DashboardAiWidgetProps) {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [collapsed,  setCollapsed]  = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isManager = role === 'admin' || role === 'manager'
  const prompts = isManager ? ADMIN_PROMPTS : REP_PROMPTS

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setLoading(true)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    try {
      const res = await fetch('/api/sales/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:  'chat',
          context: { message: trimmed, userRole: role },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'AI request failed'); setMessages(p => p.slice(0, -1)); return }
      const reply = typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
      setMessages(prev => [...prev, { role: 'ai', text: reply }])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
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

  return (
    <div style={{
      borderRadius: 20,
      border: '1px solid rgba(124,58,237,0.25)',
      background: 'linear-gradient(160deg, rgba(124,58,237,0.08) 0%, rgba(10,14,26,0.95) 60%)',
      overflow: 'hidden',
      boxShadow: '0 0 40px rgba(124,58,237,0.08)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 22px',
        borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(90deg, rgba(124,58,237,0.15), rgba(79,142,247,0.08))',
        cursor: 'pointer',
      }} onClick={() => setCollapsed(c => !c)}>
        {/* Animated AI orb */}
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7C3AED, #4F8EF7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(124,58,237,0.5)',
          fontSize: 18,
        }}>
          ✨
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              Fadaa AI Assistant
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: 'linear-gradient(90deg, #7C3AED, #4F8EF7)',
              color: '#fff', letterSpacing: '0.05em',
            }}>
              NEW
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            {isManager
              ? 'Pipeline intelligence, team insights & forecasting'
              : 'Follow-ups, meeting prep & proposal assistance'}
          </div>
        </div>
        <button
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
          }}
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c) }}
        >
          {collapsed ? 'Open' : 'Minimize'}
        </button>
      </div>

      {!collapsed && (
        <div>
          {/* Quick prompts — always visible */}
          <div style={{ padding: '16px 22px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>
              Quick actions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {prompts.map(p => (
                <button
                  key={p.text}
                  onClick={() => send(p.text)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 20,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = 'rgba(124,58,237,0.2)'
                      el.style.borderColor = 'rgba(124,58,237,0.4)'
                      el.style.color = '#fff'
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'rgba(255,255,255,0.05)'
                    el.style.borderColor = 'rgba(255,255,255,0.1)'
                    el.style.color = 'rgba(255,255,255,0.7)'
                  }}
                >
                  <span>{p.icon}</span>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat messages — only shown after interaction */}
          {(messages.length > 0 || loading || error) && (
            <div style={{
              maxHeight: 380, overflowY: 'auto',
              padding: '16px 22px',
              display: 'flex', flexDirection: 'column', gap: 12,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user'
                      ? 'rgba(255,255,255,0.1)'
                      : 'linear-gradient(135deg, #7C3AED, #4F8EF7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: msg.role === 'user' ? 12 : 14,
                    fontWeight: 700, color: '#fff',
                  }}>
                    {msg.role === 'user' ? 'U' : '✨'}
                  </div>
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #7C3AED, #4F8EF7)'
                      : 'rgba(255,255,255,0.06)',
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
                          display: 'block', marginTop: 8,
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: 'rgba(255,255,255,0.3)',
                          padding: 0,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7C3AED' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7C3AED, #4F8EF7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>✨</div>
                  <div style={{
                    padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', gap: 5, alignItems: 'center',
                  }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#7C3AED',
                        animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#FCA5A5', fontSize: 12,
                }}>
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {/* Empty state with intro copy */}
          {messages.length === 0 && !loading && !error && (
            <div style={{
              padding: '16px 22px 20px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #7C3AED, #4F8EF7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>✨</div>
              <div style={{
                padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6,
              }}>
                {isManager
                  ? "Hi! I'm your sales intelligence assistant. Ask me about your pipeline, team performance, deal risks, or revenue forecasts — or click a quick action above."
                  : "Hi! I'm your personal sales assistant. I can help you draft follow-ups, prep for meetings, handle objections, and write better proposals. Click a quick action or type anything below."}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 22px 16px' }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '8px 12px',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask Fadaa AI anything… (Enter to send)"
                disabled={loading}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  resize: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 13,
                  lineHeight: 1.5, maxHeight: 100, overflowY: 'auto',
                  fontFamily: 'inherit', minHeight: 22,
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Send"
                style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #7C3AED, #4F8EF7)'
                    : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', color: '#fff',
                  boxShadow: input.trim() && !loading ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22 11 13 2 9l20-7z" />
                </svg>
              </button>
            </div>
            <div style={{ marginTop: 5, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
