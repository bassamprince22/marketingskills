'use client'

import { useEffect, useState } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import type { SalesUser } from '@/lib/sales/types'

type Tab = 'users' | 'invites'

interface Invite {
  id:          string
  token:       string
  email:       string
  role:        string
  expires_at:  string
  created_at:  string
}

const ROLE_BADGE: Record<string, string> = {
  manager: 'badge-purple',
  rep:     'badge-blue',
  admin:   'badge-red',
}

function UserFormModal({
  initial,
  onSaved,
  onClose,
}: {
  initial?: Partial<SalesUser>
  onSaved: () => void
  onClose: () => void
}) {
  const isEdit = !!initial?.id
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState({
    username: initial?.username ?? '',
    email:    initial?.email    ?? '',
    name:     initial?.name     ?? '',
    role:     initial?.role     ?? 'rep',
    password: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isEdit && !form.password) { setError('Password is required for new users'); return }
    setSaving(true); setError('')
    const body = isEdit ? { id: initial!.id, ...form } : form
    const res  = await fetch('/api/sales/users', {
      method:  isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) { onSaved(); onClose() }
    else { setError(data.error ?? 'Failed'); setSaving(false) }
  }

  return (
    <div className="fadaa-overlay">
      <div className="fadaa-modal" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="t-section-title">{isEdit ? '✎ Edit User' : '⊕ New User'}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
          >×</button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 10, padding: '10px 14px', color: '#F87171',
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Full Name <span style={{ color: '#F87171' }}>*</span></label>
              <input className="fadaa-input" value={form.name} onChange={set('name')} required placeholder="Jane Smith" />
            </div>
            <div className="form-field">
              <label className="form-label">Username <span style={{ color: '#F87171' }}>*</span></label>
              <input
                className="fadaa-input"
                value={form.username}
                onChange={set('username')}
                required
                placeholder="jane.smith"
                disabled={isEdit}
                style={{ opacity: isEdit ? 0.6 : 1 }}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input className="fadaa-input" type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" />
            </div>
            <div className="form-field">
              <label className="form-label">Role <span style={{ color: '#F87171' }}>*</span></label>
              <select className="fadaa-input" value={form.role} onChange={set('role')} required>
                <option value="rep">Sales Rep</option>
                <option value="manager">Sales Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">
              {isEdit ? 'New Password (leave blank to keep)' : <>Password <span style={{ color: '#F87171' }}>*</span></>}
            </label>
            <input
              className="fadaa-input"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters'}
              minLength={isEdit ? 0 : 8}
              required={!isEdit}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" className="fadaa-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="fadaa-btn" style={{ minWidth: 140, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving
                ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</>
                : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InviteModal({ onCreated, onClose }: { onCreated: (url: string) => void; onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState('rep')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res  = await fetch('/api/sales/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    if (res.ok) { onCreated(data.inviteUrl); onClose() }
    else { setError(data.error ?? 'Failed'); setSaving(false) }
  }

  return (
    <div className="fadaa-overlay">
      <div className="fadaa-modal" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 className="t-section-title">✉ Invite Team Member</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>

        <p className="t-caption" style={{ marginBottom: 18 }}>
          They&apos;ll get a unique link to create their own username and password. Valid for 7 days.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 10, padding: '10px 14px', color: '#F87171',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-field">
            <label className="form-label">Email <span style={{ color: '#F87171' }}>*</span></label>
            <input className="fadaa-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@company.com" />
          </div>
          <div className="form-field">
            <label className="form-label">Role <span style={{ color: '#F87171' }}>*</span></label>
            <select className="fadaa-input" value={role} onChange={e => setRole(e.target.value)} required>
              <option value="rep">Sales Rep</option>
              <option value="manager">Sales Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" className="fadaa-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="fadaa-btn" style={{ minWidth: 140, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving
                ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Creating…</>
                : 'Generate Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InviteLinkModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fadaa-overlay">
      <div className="fadaa-modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 className="t-section-title">✓ Invite Created</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        <p className="t-caption" style={{ marginBottom: 16 }}>
          Share this link with the invitee. It expires in 7 days and can only be used once.
        </p>
        <div style={{
          background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.22)',
          borderRadius: 10, padding: 14, marginBottom: 16,
          wordBreak: 'break-all', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          color: '#7CB9FC',
        }}>{url}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="fadaa-btn-ghost" onClick={onClose}>Close</button>
          <button className="fadaa-btn" onClick={copy} style={{ minWidth: 160, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
            {copied ? '✓ Copied!' : '⎘ Copy Link'}
          </button>
        </div>
      </div>
    </div>
  )
}

function timeLeft(expires: string) {
  const ms = new Date(expires).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const days = Math.floor(ms / 86400000)
  if (days >= 1) return `${days}d left`
  const hours = Math.floor(ms / 3600000)
  if (hours >= 1) return `${hours}h left`
  return '<1h left'
}

export default function AdminUsersPage() {
  const [users,       setUsers]       = useState<SalesUser[]>([])
  const [invites,     setInvites]     = useState<Invite[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<Tab>('users')
  const [modal,       setModal]       = useState<Partial<SalesUser> | null | 'new'>(null)
  const [inviteModal, setInviteModal] = useState(false)
  const [newInviteUrl,setNewInviteUrl]= useState<string | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/sales/users').then(r => r.json()),
      fetch('/api/sales/invites').then(r => r.json()),
    ]).then(([u, i]) => {
      setUsers(u.users ?? [])
      setInvites(i.invites ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  async function toggleActive(user: SalesUser) {
    await fetch('/api/sales/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    })
    load()
  }

  async function revokeInvite(id: string) {
    if (!confirm('Revoke this invite? The link will stop working.')) return
    await fetch(`/api/sales/invites?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function copyInviteLink(token: string) {
    const url = `${window.location.origin}/sales/invite/${token}`
    await navigator.clipboard.writeText(url)
  }

  return (
    <SalesShell>
      {modal !== null && (
        <UserFormModal
          initial={modal === 'new' ? undefined : (modal as Partial<SalesUser>)}
          onSaved={load}
          onClose={() => setModal(null)}
        />
      )}
      {inviteModal && (
        <InviteModal
          onCreated={url => { setNewInviteUrl(url); load() }}
          onClose={() => setInviteModal(false)}
        />
      )}
      {newInviteUrl && (
        <InviteLinkModal url={newInviteUrl} onClose={() => setNewInviteUrl(null)} />
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">Team Management</h1>
          <p className="t-caption">
            {users.length} user{users.length !== 1 ? 's' : ''} · {invites.length} pending invite{invites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="fadaa-btn fadaa-btn-sm" onClick={() => setInviteModal(true)}>✉ Invite</button>
          <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => setModal('new')}>+ New User</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)' }}>
        {(['users', 'invites'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none',
              padding: '10px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: tab === t ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--brand-primary)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t === 'users' ? `👥 Users (${users.length})` : `✉ Pending Invites (${invites.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fadaa-card skeleton" style={{ height: 64 }} />
          ))}
        </div>
      ) : tab === 'users' ? (
        users.length === 0 ? (
          <div className="fadaa-card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>
              <p className="empty-state-title">No users yet</p>
              <p className="empty-state-desc">Invite your first team member to get started.</p>
              <button className="fadaa-btn" onClick={() => setInviteModal(true)}>✉ Invite User</button>
            </div>
          </div>
        ) : (
          <div className="fadaa-card" style={{ overflow: 'hidden' }}>
            <table className="fadaa-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm">{u.name.charAt(0).toUpperCase()}</div>
                        <span className="t-body" style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="t-mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>@{u.username}</span>
                    </td>
                    <td className="t-caption">{u.email ?? '—'}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-blue'}`} style={{ textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-slate'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => setModal(u)}>✎ Edit</button>
                        <button
                          onClick={() => toggleActive(u)}
                          className={u.is_active ? 'fadaa-btn-danger fadaa-btn-sm' : 'fadaa-btn fadaa-btn-sm'}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : invites.length === 0 ? (
        <div className="fadaa-card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: 26 }}>✉</div>
            <p className="empty-state-title">No pending invites</p>
            <p className="empty-state-desc">Send an invite to onboard someone without setting a password for them.</p>
            <button className="fadaa-btn" onClick={() => setInviteModal(true)}>✉ Invite User</button>
          </div>
        </div>
      ) : (
        <div className="fadaa-card" style={{ overflow: 'hidden' }}>
          <table className="fadaa-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Expires</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(inv => {
                const left = timeLeft(inv.expires_at)
                const expired = left === 'expired'
                return (
                  <tr key={inv.id}>
                    <td className="t-body">{inv.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[inv.role] ?? 'badge-blue'}`} style={{ textTransform: 'capitalize' }}>{inv.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${expired ? 'badge-slate' : 'badge-green'}`}>{left}</span>
                    </td>
                    <td className="t-caption">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => copyInviteLink(inv.token)}>⎘ Copy Link</button>
                        <button className="fadaa-btn-danger fadaa-btn-sm" onClick={() => revokeInvite(inv.id)}>Revoke</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SalesShell>
  )
}
