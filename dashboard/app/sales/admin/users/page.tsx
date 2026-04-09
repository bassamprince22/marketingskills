'use client'

import { useEffect, useState } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'
import type { SalesUser } from '@/lib/sales/types'

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

  const label = (l: string) => (
    <label style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{l}</label>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="fadaa-card" style={{ padding: 32, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 16 }}>
            {isEdit ? '✎ Edit User' : '⊕ New User'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#F87171', marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              {label('Full Name *')}
              <input className="fadaa-input" value={form.name} onChange={set('name')} required placeholder="Jane Smith" />
            </div>
            <div>
              {label('Username *')}
              <input className="fadaa-input" value={form.username} onChange={set('username')} required placeholder="jane.smith" disabled={isEdit} style={{ opacity: isEdit ? 0.6 : 1 }} />
            </div>
            <div>
              {label('Email')}
              <input className="fadaa-input" type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" />
            </div>
            <div>
              {label('Role *')}
              <select className="fadaa-input" value={form.role} onChange={set('role')} required>
                <option value="rep">Sales Rep</option>
                <option value="manager">Sales Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            {label(isEdit ? 'New Password (leave blank to keep)' : 'Password *')}
            <input className="fadaa-input" type="password" value={form.password} onChange={set('password')} placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters'} minLength={isEdit ? 0 : 8} required={!isEdit} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="fadaa-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="fadaa-btn">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
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

  const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
    manager: { bg: 'rgba(124,58,237,0.12)', text: '#A78BFA' },
    rep:     { bg: 'rgba(79,142,247,0.12)',  text: '#60A5FA' },
    admin:   { bg: 'rgba(239,68,68,0.12)',   text: '#F87171' },
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

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>⊕ User Management</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{users.length} active users</p>
        </div>
        <button className="fadaa-btn" onClick={() => setModal('new')}>+ New User</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="fadaa-card" style={{ height: 70 }} />)}
        </div>
      ) : (
        <div className="fadaa-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2D4A' }}>
                {['User', 'Username', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rs = ROLE_STYLE[u.role] ?? ROLE_STYLE.rep
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1E2D4A20', background: i % 2 === 0 ? 'transparent' : 'rgba(30,45,74,0.15)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontFamily: 'monospace', fontSize: 12 }}>@{u.username}</td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{u.email ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: rs.bg, color: rs.text, fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 600, textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: u.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(100,116,139,0.1)', color: u.is_active ? '#4ADE80' : '#64748B', fontSize: 11, padding: '3px 10px', borderRadius: 999 }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="fadaa-btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setModal(u)}>
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          style={{
                            fontSize: 11, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                            background: u.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)',
                            border: `1px solid ${u.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}`,
                            color: u.is_active ? '#F87171' : '#4ADE80',
                          }}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
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
