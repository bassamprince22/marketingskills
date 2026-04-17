'use client'

import { useEffect, useState } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import type { SalesUser } from '@/lib/sales/types'

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
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ×
          </button>
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
            <button
              type="submit"
              disabled={saving}
              className="fadaa-btn"
              style={{ minWidth: 140, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
            >
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

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<SalesUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<Partial<SalesUser> | null | 'new'>(null)

  function load() {
    setLoading(true)
    fetch('/api/sales/users')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false) })
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

  return (
    <SalesShell>
      {modal !== null && (
        <UserFormModal
          initial={modal === 'new' ? undefined : (modal as Partial<SalesUser>)}
          onSaved={load}
          onClose={() => setModal(null)}
        />
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="t-page-title">User Management</h1>
          <p className="t-caption">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="fadaa-btn fadaa-btn-sm" onClick={() => setModal('new')}>+ New User</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fadaa-card skeleton" style={{ height: 64 }} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="fadaa-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <p className="empty-state-title">No users yet</p>
            <p className="empty-state-desc">Create the first team member to get started.</p>
            <button className="fadaa-btn" onClick={() => setModal('new')}>+ New User</button>
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
                      <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => setModal(u)}>
                        ✎ Edit
                      </button>
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
      )}
    </SalesShell>
  )
}
