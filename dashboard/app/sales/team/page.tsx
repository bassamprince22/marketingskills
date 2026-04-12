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
    manager_id?: string
  } | null
}

// ─── Avatar ───────────────────────────────────────
function Avatar({ name, size = 36, url }: { name: string; size?: number; url?: string }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  const colors = ['#4F8EF7,#7C3AED', '#06B6D4,#4F8EF7', '#7C3AED,#EC4899', '#F59E0B,#EF4444', '#4ADE80,#06B6D4']
  const grad = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${grad})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.38, fontWeight: 800,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Create / Edit Modal ──────────────────────────
function UserModal({ user, managers, onClose, onSaved }: {
  user: Partial<TeamUser>
  managers: TeamUser[]
  onClose: () => void
  onSaved: () => void
}) {
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
    manager_id: user?.profile?.manager_id ?? '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const lbl = (l: string) => (
    <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{l}</label>
  )

  async function handleSave() {
    setError('')
    if (!form.name || !form.username) { setError('Name and username are required'); return }
    if (isNew && !form.password) { setError('Password is required for new users'); return }
    if (form.password && form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setSaving(true)
    try {
      const body = isNew ? { ...form } : { id: user!.id, ...form, password: form.password || undefined }
      const res = await fetch('/api/sales/team', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.88)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#E2E8F0', fontSize: 17, fontWeight: 700 }}>{isNew ? '+ Add Member' : `Edit — ${user?.name}`}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{lbl('Full Name')}<input className="fadaa-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>{lbl('Username')}<input className="fadaa-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
            <div>{lbl('Email')}<input className="fadaa-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div>
              {lbl('Role')}
              <select className="fadaa-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>{lbl('Job Title')}<input className="fadaa-input" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></div>
            <div>{lbl('Phone')}<input className="fadaa-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div>
              {lbl('Department')}
              <select className="fadaa-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">— Select —</option>
                {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              {lbl('Reports To (Team)')}
              <select className="fadaa-input" value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            {lbl(isNew ? 'Password' : 'New Password (leave blank to keep)')}
            <input className="fadaa-input" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={isNew ? 'Min 8 characters' : 'Leave blank to keep current'} autoComplete="new-password" />
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="fadaa-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="fadaa-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Permissions Modal ────────────────────────────
function PermissionsModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [perms, setPerms] = useState<Permission[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch(`/api/sales/permissions?userId=${userId}`)
      .then(r => r.json())
      .then(d => { setPerms(d.permissions ?? []); setReady(true) })
  }, [userId])

  async function handleSave(permissions: Permission[]) {
    await fetch('/api/sales/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, permissions }),
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.88)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: '#E2E8F0', fontSize: 17, fontWeight: 700 }}>Permissions</h2>
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{userName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {/* Always render PermissionTree — shows defaults even when empty */}
        {ready
          ? <PermissionTree initialPermissions={perms} onSave={handleSave} />
          : <PermissionTree initialPermissions={[]} onSave={handleSave} />
        }
      </div>
    </div>
  )
}

// ─── Member chip (draggable) ──────────────────────
function MemberRow({ user, managers, onEdit, onPerms, onMove }: {
  user: TeamUser
  managers: TeamUser[]
  onEdit: () => void
  onPerms: () => void
  onMove: (managerId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('userId', user.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid #1E2D4A',
        opacity: user.is_active ? 1 : 0.45,
        cursor: 'grab',
      }}
    >
      <span style={{ color: '#2D3F5A', fontSize: 14, flexShrink: 0 }}>⠿</span>
      <Avatar name={user.name} size={32} url={user.profile?.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>{user.name}</p>
        <p style={{ color: '#64748B', fontSize: 11 }}>{user.profile?.job_title || 'Sales Rep'}</p>
      </div>
      {/* Move to team dropdown */}
      <select
        value={user.profile?.manager_id ?? ''}
        onChange={e => onMove(e.target.value)}
        style={{
          background: '#131B2E', border: '1px solid #1E2D4A', borderRadius: 6,
          color: '#94A3B8', fontSize: 11, padding: '4px 8px', cursor: 'pointer',
        }}
      >
        <option value="">Unassigned</option>
        {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <button onClick={onEdit} style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7', borderRadius: 6, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
      <button onClick={onPerms} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA', borderRadius: 6, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Perms</button>
    </div>
  )
}

// ─── Empty example state ──────────────────────────
function EmptyExample() {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ background: 'rgba(79,142,247,0.05)', border: '1px dashed rgba(79,142,247,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
        <p style={{ color: '#4F8EF7', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Example — How it works</p>
        {/* Example manager */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', border: '2px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA', fontSize: 14, fontWeight: 800 }}>A</div>
          <div>
            <p style={{ color: '#A78BFA', fontSize: 13, fontWeight: 600 }}>Ahmad Al-Rashid</p>
            <p style={{ color: '#64748B', fontSize: 11 }}>Sales Manager</p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>Manager</span>
        </div>
        {/* Connector */}
        <div style={{ marginLeft: 17, borderLeft: '2px dashed rgba(79,142,247,0.3)', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Example team leader */}
          <div style={{ background: '#131B2E', border: '1px solid #1E2D4A', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4', fontSize: 12, fontWeight: 800 }}>K</div>
              <div>
                <p style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600 }}>Khalid Ibrahim <span style={{ color: '#06B6D4', fontSize: 10 }}>★ Team Leader</span></p>
                <p style={{ color: '#64748B', fontSize: 10 }}>2 members in this team</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingLeft: 4 }}>
              {['Omar', 'Fatima'].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,142,247,0.06)', border: '1px solid #1E2D4A', borderRadius: 8, padding: '5px 10px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(79,142,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800 }}>{n[0]}</div>
                  <p style={{ color: '#94A3B8', fontSize: 11 }}>{n}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p style={{ color: '#64748B', fontSize: 11, marginTop: 14, lineHeight: 1.6 }}>
          Create members using <strong style={{ color: '#94A3B8' }}>+ Add Member</strong>. Set their role to <strong style={{ color: '#A78BFA' }}>Manager</strong> to make them a team leader, or <strong style={{ color: '#60A5FA' }}>Rep</strong> for a sales member. Use the <strong style={{ color: '#94A3B8' }}>team dropdown</strong> on each member to move them between teams.
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────
export default function TeamPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = (session?.user as { role?: string })?.role ?? 'rep'

  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<Partial<TeamUser> | null>(null)
  const [permUser, setPermUser] = useState<TeamUser | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null) // leaderId being hovered

  useEffect(() => {
    if (session && role !== 'admin' && role !== 'manager') router.replace('/sales/dashboard')
  }, [session, role, router])

  function load() {
    setLoading(true)
    fetch('/api/sales/team')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  async function moveToTeam(userId: string, managerId: string) {
    await fetch('/api/sales/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, manager_id: managerId || null }),
    })
    load()
  }

  // Classify users
  const managers  = users.filter(u => u.role === 'manager' || u.role === 'admin')
  const reps      = users.filter(u => u.role === 'rep')
  const topLevel  = managers.filter(u => !u.profile?.manager_id)
  const leaders   = managers.filter(u => u.profile?.manager_id || reps.some(r => r.profile?.manager_id === u.id))
  // Teams = managers who have at least one rep assigned
  const teamLeaders = managers.filter(u => reps.some(r => r.profile?.manager_id === u.id))
  const unassigned  = reps.filter(u => !u.profile?.manager_id)
  // Show example when no teams are set up yet
  const showExample = teamLeaders.length === 0 && unassigned.length === 0

  if (role !== 'admin' && role !== 'manager') return null

  return (
    <SalesShell>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>◈ Team</h1>
            <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{users.length} members · {teamLeaders.length} teams</p>
          </div>
          <button className="fadaa-btn" onClick={() => setEditUser({})}>+ Add Member</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="fadaa-card" style={{ height: 80 }} />)}
          </div>
        ) : (
          <>
            {showExample && <EmptyExample />}

            {/* ── Sales Managers ── */}
            {topLevel.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Sales {topLevel.length === 1 ? 'Manager' : 'Managers'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topLevel.map(u => (
                    <div key={u.id} className="fadaa-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '3px solid #A78BFA' }}>
                      <Avatar name={u.name} size={44} url={u.profile?.avatar_url} />
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700 }}>{u.name}</p>
                        <p style={{ color: '#A78BFA', fontSize: 12, marginTop: 2 }}>{u.profile?.job_title || 'Sales Manager'}</p>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', color: '#A78BFA', fontWeight: 600 }}>Manager</span>
                      <button onClick={() => setEditUser(u)} style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7', borderRadius: 6, fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setPermUser(u)} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA', borderRadius: 6, fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>Perms</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Teams ── */}
            {teamLeaders.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Teams ({teamLeaders.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {teamLeaders.map(leader => {
                    const members = reps.filter(r => r.profile?.manager_id === leader.id)
                    const isOver = dragOver === leader.id
                    return (
                      <div key={leader.id} className="fadaa-card"
                        onDragOver={e => { e.preventDefault(); setDragOver(leader.id) }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={e => { e.preventDefault(); setDragOver(null); const uid = e.dataTransfer.getData('userId'); if (uid) moveToTeam(uid, leader.id) }}
                        style={{ overflow: 'hidden', borderLeft: `3px solid ${isOver ? '#4ADE80' : '#06B6D4'}`, boxShadow: isOver ? '0 0 0 2px rgba(74,222,128,0.25)' : undefined, transition: 'box-shadow 0.15s, border-color 0.15s' }}>
                        {/* Leader header */}
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1E2D4A', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={leader.name} size={38} url={leader.profile?.avatar_url} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <p style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 700 }}>{leader.name}</p>
                              <span style={{ fontSize: 10, color: '#06B6D4' }}>★ Team Leader</span>
                            </div>
                            <p style={{ color: '#64748B', fontSize: 11, marginTop: 1 }}>{members.length} {members.length === 1 ? 'member' : 'members'}</p>
                          </div>
                          <button onClick={() => setEditUser(leader)} style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7', borderRadius: 6, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setPermUser(leader)} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA', borderRadius: 6, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Perms</button>
                        </div>
                        {/* Members */}
                        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {members.length === 0 ? (
                            <p style={{ color: '#1E2D4A', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>No members yet — assign reps using the team dropdown</p>
                          ) : members.map(member => (
                            <MemberRow
                              key={member.id}
                              user={member}
                              managers={managers}
                              onEdit={() => setEditUser(member)}
                              onPerms={() => setPermUser(member)}
                              onMove={mid => moveToTeam(member.id, mid)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Managers not yet leading a team ── */}
            {managers.filter(u => !topLevel.includes(u) && !teamLeaders.includes(u)).map(u => (
              <section key={u.id} style={{ marginBottom: 16 }}>
                <div className="fadaa-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid #1E2D4A', opacity: 0.7 }}>
                  <Avatar name={u.name} size={36} url={u.profile?.avatar_url} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>{u.name}</p>
                    <p style={{ color: '#64748B', fontSize: 11 }}>Manager · No team members yet</p>
                  </div>
                  <button onClick={() => setEditUser(u)} style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7', borderRadius: 6, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => setPermUser(u)} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA', borderRadius: 6, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Perms</button>
                </div>
              </section>
            ))}

            {/* ── Unassigned reps ── */}
            {unassigned.length > 0 && (
              <section>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Unassigned Members ({unassigned.length})
                </p>
                <div className="fadaa-card"
                  onDragOver={e => { e.preventDefault(); setDragOver('unassigned') }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { e.preventDefault(); setDragOver(null); const uid = e.dataTransfer.getData('userId'); if (uid) moveToTeam(uid, '') }}
                  style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderLeft: dragOver === 'unassigned' ? '3px solid #F59E0B' : '3px solid transparent', transition: 'border-color 0.15s' }}>
                  {unassigned.map(u => (
                    <MemberRow
                      key={u.id}
                      user={u}
                      managers={managers}
                      onEdit={() => setEditUser(u)}
                      onPerms={() => setPermUser(u)}
                      onMove={mid => moveToTeam(u.id, mid)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Reps assigned to non-existent manager (orphans) */}
            {reps.filter(r => r.profile?.manager_id && !managers.find(m => m.id === r.profile?.manager_id)).map(u => (
              <div key={u.id} style={{ marginTop: 8 }}>
                <MemberRow user={u} managers={managers} onEdit={() => setEditUser(u)} onPerms={() => setPermUser(u)} onMove={mid => moveToTeam(u.id, mid)} />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editUser !== null && (
        <UserModal
          user={editUser}
          managers={managers}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load() }}
        />
      )}

      {/* Permissions Modal */}
      {permUser && (
        <PermissionsModal
          userId={permUser.id}
          userName={permUser.name}
          onClose={() => setPermUser(null)}
        />
      )}
    </SalesShell>
  )
}
