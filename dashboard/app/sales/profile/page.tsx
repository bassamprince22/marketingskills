'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { SalesShell } from '@/components/sales/SalesShell'
import { AvatarUpload } from '@/components/sales/AvatarUpload'

const DEPT_OPTIONS = ['Sales', 'Marketing', 'Operations', 'Management', 'Technical', 'Finance', 'Other']

function Avatar({ name, size = 72, url }: { name: string; size?: number; url?: string }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.38, fontWeight: 800, flexShrink: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [user,    setUser]    = useState<Record<string, string> | null>(null)
  const [profile, setProfile] = useState<Record<string, string> | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [form,    setForm]    = useState<Record<string, string>>({})

  const [pwExpanded, setPwExpanded] = useState(false)
  const [pwForm, setPwForm]         = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving]     = useState(false)
  const [pwError, setPwError]       = useState('')
  const [pwSaved, setPwSaved]       = useState(false)

  useEffect(() => {
    fetch('/api/sales/profile')
      .then(r => r.json())
      .then(d => {
        setUser(d.user)
        setProfile(d.profile)
        setForm({
          name:       d.user?.name       ?? '',
          email:      d.user?.email      ?? '',
          job_title:  d.profile?.job_title  ?? '',
          phone:      d.profile?.phone      ?? '',
          department: d.profile?.department ?? '',
          bio:        d.profile?.bio        ?? '',
        })
      })
  }, [])

  const role = (session?.user as { role?: string })?.role ?? 'rep'

  async function save() {
    setSaving(true); setSaved(false)
    await fetch('/api/sales/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false); setSaved(true); setEditing(false)
    setUser(u => u ? { ...u, name: form.name, email: form.email } : u)
    setProfile(p => p ? { ...p, ...form } : form)
  }

  async function changePassword() {
    setPwError('')
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return }
    if (pwForm.newPassword.length < 8) { setPwError('Minimum 8 characters'); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/sales/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change', currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error ?? 'Failed to update password'); return }
      setPwSaved(true)
      setPwExpanded(false)
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPwSaved(false), 4000)
    } finally {
      setPwSaving(false)
    }
  }

  const label = (l: string) => (
    <label style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{l}</label>
  )

  return (
    <SalesShell>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>◈ My Profile</h1>
            <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Your account information and preferences</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!editing && (
              <button className="fadaa-btn" onClick={() => setEditing(true)}>✎ Edit Profile</button>
            )}
          </div>
        </div>

        {!user ? (
          <div className="fadaa-card" style={{ height: 200 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Identity card */}
            <div className="fadaa-card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <AvatarUpload
                  currentUrl={profile?.avatar_url}
                  onUploaded={url => setProfile(p => p ? { ...p, avatar_url: url } : { avatar_url: url })}
                />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>{user.name}</p>
                  <p style={{ color: '#4F8EF7', fontSize: 13, marginTop: 2 }}>{profile?.job_title || '—'}</p>
                  <p style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>{user.email}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.12)', color: '#A78BFA', fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</span>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}>Active</span>
                    {profile?.department && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(79,142,247,0.1)', color: '#60A5FA' }}>{profile.department}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit form or info display */}
            <div className="fadaa-card" style={{ padding: 28 }}>
              <h3 style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Personal Information</h3>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>{label('Full Name')}<input className="fadaa-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div>{label('Email')}<input className="fadaa-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div>{label('Job Title')}<input className="fadaa-input" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Sales Rep" /></div>
                    <div>{label('Phone')}<input className="fadaa-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+966 5x xxx xxxx" /></div>
                    <div>
                      {label('Department')}
                      <select className="fadaa-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                        <option value="">— Select —</option>
                        {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>{label('Bio')}<textarea className="fadaa-input" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="A short bio…" /></div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button className="fadaa-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                    <button className="fadaa-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {[
                    { label: 'Phone',      value: profile?.phone      || '—' },
                    { label: 'Department', value: profile?.department  || '—' },
                    { label: 'Join Date',  value: profile?.join_date   ? new Date(profile.join_date).toLocaleDateString() : '—' },
                    { label: 'Username',   value: user.username        || '—' },
                  ].map(({ label: l, value }) => (
                    <div key={l}>
                      <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{l}</p>
                      <p style={{ color: '#E2E8F0', fontSize: 14 }}>{value}</p>
                    </div>
                  ))}
                  {profile?.bio && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Bio</p>
                      <p style={{ color: '#94A3B8', fontSize: 13 }}>{profile.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account & Security */}
            <div className="fadaa-card" style={{ padding: 28 }}>
              <h3 style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Account & Security</h3>

              {/* Username */}
              <div style={{ marginBottom: 24 }}>
                {label('Username')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ color: '#E2E8F0', fontSize: 14, fontFamily: 'monospace' }}>{user.username}</p>
                  <span style={{ fontSize: 11, color: '#64748B', background: 'rgba(100,116,139,0.12)', padding: '2px 8px', borderRadius: 999 }}>login ID</span>
                </div>
              </div>

              {/* Password */}
              <div>
                {label('Password')}
                {!pwExpanded ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: '#94A3B8', fontSize: 18, letterSpacing: 3 }}>••••••••</span>
                    <button
                      className="fadaa-btn-ghost"
                      style={{ fontSize: 12 }}
                      onClick={() => { setPwExpanded(true); setPwError('') }}
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                    <div>
                      {label('Current Password')}
                      <input className="fadaa-input" type="password" autoComplete="current-password"
                        value={pwForm.currentPassword}
                        onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        {label('New Password')}
                        <input className="fadaa-input" type="password" autoComplete="new-password"
                          placeholder="Min 8 characters"
                          value={pwForm.newPassword}
                          onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
                      </div>
                      <div>
                        {label('Confirm New Password')}
                        <input className="fadaa-input" type="password" autoComplete="new-password"
                          value={pwForm.confirmPassword}
                          onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                      </div>
                    </div>
                    {pwError && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13 }}>
                        {pwError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      <button className="fadaa-btn-ghost" onClick={() => { setPwExpanded(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPwError('') }}>
                        Cancel
                      </button>
                      <button className="fadaa-btn" onClick={changePassword} disabled={pwSaving}>
                        {pwSaving ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {saved && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 16px', color: '#4ADE80', fontSize: 13 }}>
                ✓ Profile updated successfully
              </div>
            )}
            {pwSaved && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 16px', color: '#4ADE80', fontSize: 13 }}>
                ✓ Password updated successfully
              </div>
            )}
          </div>
        )}
      </div>
    </SalesShell>
  )
}
