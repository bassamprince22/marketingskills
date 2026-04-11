'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'
import { PermissionTree } from '@/components/sales/PermissionTree'
import type { Permission } from '@/lib/sales/db'

const ROLES = ['rep', 'manager', 'admin']
const DEPT_OPTIONS = ['Sales', 'Marketing', 'Operations', 'Management', 'Technical', 'Finance', 'Other']

interface TeamUser {
  id: string
  username: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
  profile: {
    job_title?: string
    department?: string
    phone?: string
    avatar_url?: string
  } | null
}

function Avatar({ name, size = 36, url }: { name: string; size?: number; url?: string }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.38, fontWeight: 800,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'rgba(239,68,68,0.15)',
  manager: 'rgba(124,58,237,0.15)',
  rep: 'rgba(79,142,247,0.12)',
}
const ROLE_TEXT: Record<string, string> = { admin: '#F87171', manager: '#A78BFA', rep: '#60A5FA' }

// ─── Create / Edit Modal ──────────────────────────────
interface ModalProps {
  user: Partial<TeamUser> | null
  onClose: () => void
  onSaved: () => void
}

function UserModal({ user, onClose, onSaved }: ModalProps) {
  const isNew = !user?.id
  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'rep',
    is_active: user?.is_active !== false,
    job_title: user?.profile?.job_title ?? '',
    department: user?.profile?.department ?? '',
    phone: user?.profile?.phone ?? '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const label = (l: string) => (
    <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{l}</label>
  )

  async function handleSave() {
    setError('')
    if (!form.name || !form.username || !form.role) { setError('Name, username, and role are required'); return }
    if (isNew && !form.password) { setError('Password is required for new users'); return }
    if (form.password && form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setSaving(true)
    try {
      const body = isNew
        ? { ...form }
        : { id: user!.id, ...form, password: form.password || undefined }
      const res = await fetch('/api/sales/team', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.85)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 16,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 17, fontWeight: 700 }}>
            {isNew ? '+ Create User' : `Edit — ${user?.name}`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{label('Full Name')}<input className="fadaa-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>{label('Username')}<input className="fadaa-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
            <div>{label('Email')}<input className="fadaa-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div>
              {label('Role')}
              <select className="fadaa-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>{label('Job Title')}<input className="fadaa-input" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></div>
            <div>{label('Phone')}<input className="fadaa-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div>
              {label('Department')}
              <select className="fadaa-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">— Select —</option>
                {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              {label('Status')}
              <select className="fadaa-input" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            {label(isNew ? 'Password' : 'New Password (leave blank to keep current)')}
            <input
              className="fadaa-input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={isNew ? 'Min 8 characters' : 'Leave blank to keep current'}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="fadaa-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="fadaa-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save User'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Permissions Panel ────────────────────────────────
function PermissionsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [perms, setPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sales/permissions?userId=${userId}`)
      .then(r => r.json())
      .then(d => { setPerms(d.permissions ?? []); setLoading(false) })
  }, [userId])

  async function handleSave(permissions: Permission[]) {
    await fetch('/api/sales/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, permissions }),
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.85)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 16,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 17, fontWeight: 700 }}>◈ Permissions</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {loading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>Loading…</div>
        ) : (
          <PermissionTree initialPermissions={perms} onSave={handleSave} />
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────
export default function TeamPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = (session?.user as { role?: string })?.role ?? 'rep'

  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')

  const [editUser, setEditUser] = useState<Partial<TeamUser> | null | 'new'>(null)
  const [permUser, setPermUser] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<TeamUser | null>(null)

  // Guard: admin only
  useEffect(() => {
    if (session && role !== 'admin') router.replace('/sales/dashboard')
  }, [session, role, router])

  function load() {
    setLoading(true)
    fetch('/api/sales/team')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function toggleActive(user: TeamUser) {
    await fetch('/api/sales/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    })
    load()
    setConfirmDeactivate(null)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    const matchRole = !filterRole || u.role === filterRole
    return matchSearch && matchRole
  })

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    reps: users.filter(u => u.role === 'rep').length,
  }

  if (role !== 'admin') return null

  return (
    <SalesShell>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>◈ Team Management</h1>
            <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Manage users, roles, and permissions</p>
          </div>
          <button className="fadaa-btn" onClick={() => setEditUser('new')}>+ Create User</button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: stats.total, color: '#4F8EF7' },
            { label: 'Active', value: stats.active, color: '#4ADE80' },
            { label: 'Admins', value: stats.admins, color: '#F87171' },
            { label: 'Managers', value: stats.managers, color: '#A78BFA' },
            { label: 'Reps', value: stats.reps, color: '#60A5FA' },
          ].map(({ label, value, color }) => (
            <div key={label} className="fadaa-card" style={{ padding: '14px 20px', flex: '1 1 120px', minWidth: 100 }}>
              <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
              <p style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <input
            className="fadaa-input"
            placeholder="Search by name, email, or username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 220px', minWidth: 180 }}
          />
          <select className="fadaa-input" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: 140 }}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>

        {/* User table */}
        <div className="fadaa-card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>Loading team…</div>
          ) : filtered.length === 0 ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>No users found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E2D4A' }}>
                    {['User', 'Role', 'Department', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #1E2D4A' : 'none',
                        opacity: u.is_active ? 1 : 0.5,
                      }}
                    >
                      {/* User cell */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={u.name} size={36} url={u.profile?.avatar_url} />
                          <div>
                            <p style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 600 }}>{u.name}</p>
                            <p style={{ color: '#64748B', fontSize: 12 }}>{u.email || `@${u.username}`}</p>
                            {u.profile?.job_title && <p style={{ color: '#4F8EF7', fontSize: 11, marginTop: 1 }}>{u.profile.job_title}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 999,
                          background: ROLE_COLORS[u.role] ?? 'rgba(100,116,139,0.15)',
                          color: ROLE_TEXT[u.role] ?? '#94A3B8',
                          fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap',
                        }}>{u.role}</span>
                      </td>
                      {/* Department */}
                      <td style={{ padding: '14px 16px', color: '#94A3B8', fontSize: 13 }}>
                        {u.profile?.department || '—'}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 999,
                          background: u.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(100,116,139,0.1)',
                          color: u.is_active ? '#4ADE80' : '#64748B', fontWeight: 600,
                        }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* Joined */}
                      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
                          <button
                            onClick={() => setEditUser(u)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, background: 'rgba(79,142,247,0.1)', color: '#4F8EF7', border: '1px solid rgba(79,142,247,0.2)', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setPermUser(u.id)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer' }}
                          >
                            Perms
                          </button>
                          <button
                            onClick={() => setConfirmDeactivate(u)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, background: u.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', color: u.is_active ? '#F87171' : '#4ADE80', border: `1px solid ${u.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}`, cursor: 'pointer' }}
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
        </div>
      </div>

      {/* Create / Edit Modal */}
      {editUser !== null && (
        <UserModal
          user={editUser === 'new' ? {} : editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load() }}
        />
      )}

      {/* Permissions Panel */}
      {permUser && (
        <PermissionsPanel userId={permUser} onClose={() => setPermUser(null)} />
      )}

      {/* Confirm deactivate/activate */}
      {confirmDeactivate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.85)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{ background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%' }}>
            <h3 style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              {confirmDeactivate.is_active ? 'Deactivate' : 'Activate'} {confirmDeactivate.name}?
            </h3>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
              {confirmDeactivate.is_active
                ? 'This user will no longer be able to log in.'
                : 'This user will regain access to the system.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="fadaa-btn-ghost" onClick={() => setConfirmDeactivate(null)}>Cancel</button>
              <button
                onClick={() => toggleActive(confirmDeactivate)}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: confirmDeactivate.is_active ? '#EF4444' : '#4ADE80',
                  color: '#fff',
                }}
              >
                {confirmDeactivate.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SalesShell>
  )
}
