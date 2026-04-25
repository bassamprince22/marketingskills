'use client'

import { useEffect, useMemo, useState } from 'react'

type Ticket = {
  id: string
  subject: string
  category: string
  priority: 'normal' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  last_message_at: string
  message_count?: number
  last_message?: {
    body: string
    sender_type: string
    sender_name: string
    created_at: string
  } | null
  support_messages?: SupportMessage[]
}

type SupportMessage = {
  id: string
  body: string
  sender_type: 'customer' | 'support' | 'system'
  sender_name: string
  sender_email?: string | null
  created_at: string
}

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature request' },
  { value: 'billing', label: 'Billing' },
  { value: 'howto', label: 'How-to' },
  { value: 'other', label: 'Other' },
] as const

function QuestionIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.1 9a3 3 0 1 1 5.8 1c-.4.8-1.1 1.3-1.8 1.8-.8.6-1.1 1.1-1.1 2.2" />
      <path d="M12 18h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

function StatusBadge({ status }: { status: Ticket['status'] }) {
  return <span className={`support-status ${status}`}>{status.replace('_', ' ')}</span>
}

function formatDate(value?: string) {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SupportButton() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'new' | 'tickets'>('new')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    subject: '',
    category: 'howto',
    priority: 'normal',
    message: '',
  })
  const [reply, setReply] = useState('')

  const openTickets = useMemo(
    () => tickets.filter(ticket => ticket.status !== 'resolved' && ticket.status !== 'closed').length,
    [tickets],
  )

  async function loadTickets() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sales/support/tickets')
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load support tickets')
      setTickets(payload.tickets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  async function loadTicket(id: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/sales/support/tickets/${id}`)
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to load ticket')
      setSelectedTicket(payload.ticket)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    void loadTickets()
  }, [open])

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/sales/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to create ticket')
      setForm({ subject: '', category: 'howto', priority: 'normal', message: '' })
      setSuccess(payload?.emailSent
        ? 'Ticket sent to Fadaa support. We will reply by email.'
        : 'Ticket saved. Email is not configured yet, so please set SUPPORT_EMAIL and RESEND_API_KEY.')
      setTab('tickets')
      await loadTickets()
      if (payload.ticket?.id) await loadTicket(payload.ticket.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTicket || !reply.trim()) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/sales/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to send reply')
      setReply('')
      setSuccess(payload?.emailSent ? 'Reply sent to Fadaa support.' : 'Reply saved. Email delivery is not configured yet.')
      await loadTicket(selectedTicket.id)
      await loadTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button className="support-launcher" onClick={() => setOpen(true)} aria-label="Open customer support">
        <QuestionIcon />
        {openTickets > 0 && <span>{openTickets}</span>}
      </button>

      {open && (
        <>
          <button className="support-scrim" onClick={() => setOpen(false)} aria-label="Close support" />
          <aside className="support-panel" aria-label="Fadaa customer support" role="dialog" aria-modal="true">
            <header className="support-header">
              <div>
                <p className="support-eyebrow">Customer support</p>
                <h2>Talk to Fadaa</h2>
                <p>Send a ticket to Fadaa support. We keep the history here and notify support by email.</p>
              </div>
              <button className="support-close" onClick={() => setOpen(false)} aria-label="Close">x</button>
            </header>

            <div className="support-tabs">
              <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>New ticket</button>
              <button className={tab === 'tickets' ? 'active' : ''} onClick={() => setTab('tickets')}>My tickets</button>
            </div>

            {error && <div className="support-alert error">{error}</div>}
            {success && <div className="support-alert success">{success}</div>}

            {tab === 'new' ? (
              <form className="support-form" onSubmit={createTicket}>
                <label>
                  Subject
                  <input
                    value={form.subject}
                    onChange={event => setForm(current => ({ ...current, subject: event.target.value }))}
                    placeholder="Example: Meta leads are not syncing"
                    maxLength={160}
                    required
                  />
                </label>

                <div className="support-form-grid">
                  <label>
                    Category
                    <select
                      value={form.category}
                      onChange={event => setForm(current => ({ ...current, category: event.target.value }))}
                    >
                      {CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>{category.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Priority
                    <select
                      value={form.priority}
                      onChange={event => setForm(current => ({ ...current, priority: event.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                </div>

                <label>
                  What do you need help with?
                  <textarea
                    value={form.message}
                    onChange={event => setForm(current => ({ ...current, message: event.target.value }))}
                    placeholder="Tell us what happened, what you expected, and any page or lead involved..."
                    rows={7}
                    minLength={20}
                    required
                  />
                </label>

                <button type="submit" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send ticket'}
                </button>
              </form>
            ) : (
              <div className="support-ticket-layout">
                <div className="support-ticket-list">
                  {loading && tickets.length === 0 ? (
                    <p className="support-empty">Loading tickets...</p>
                  ) : tickets.length === 0 ? (
                    <p className="support-empty">No support tickets yet.</p>
                  ) : tickets.map(ticket => (
                    <button
                      key={ticket.id}
                      className={`support-ticket-card${selectedTicket?.id === ticket.id ? ' active' : ''}`}
                      onClick={() => void loadTicket(ticket.id)}
                    >
                      <span className="support-ticket-card-top">
                        <strong>{ticket.subject}</strong>
                        <StatusBadge status={ticket.status} />
                      </span>
                      <span>{ticket.category} · {ticket.priority}</span>
                      <small>{formatDate(ticket.last_message_at ?? ticket.updated_at)}</small>
                    </button>
                  ))}
                </div>

                <div className="support-thread">
                  {selectedTicket ? (
                    <>
                      <div className="support-thread-title">
                        <div>
                          <p className="support-eyebrow">Ticket #{selectedTicket.id.slice(0, 8)}</p>
                          <h3>{selectedTicket.subject}</h3>
                        </div>
                        <StatusBadge status={selectedTicket.status} />
                      </div>

                      <div className="support-messages">
                        {(selectedTicket.support_messages ?? []).map(message => (
                          <div key={message.id} className={`support-message ${message.sender_type}`}>
                            <div>
                              <strong>{message.sender_name}</strong>
                              <span>{formatDate(message.created_at)}</span>
                            </div>
                            <p>{message.body}</p>
                          </div>
                        ))}
                      </div>

                      <form className="support-reply" onSubmit={sendReply}>
                        <textarea
                          value={reply}
                          onChange={event => setReply(event.target.value)}
                          placeholder="Add more details for Fadaa support..."
                          rows={3}
                        />
                        <button type="submit" disabled={submitting || !reply.trim()}>
                          {submitting ? 'Sending...' : 'Reply'}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="support-empty large">Select a ticket to view the conversation.</div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  )
}
