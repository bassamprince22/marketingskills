'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/WorkspaceSwitcher'
import type { Workspace } from '@/lib/supabase'

const CREDENTIAL_FIELDS: Array<{ key: keyof Workspace; label: string; placeholder: string }> = [
  { key: 'tiktok_token', label: 'TikTok access token', placeholder: 'From TikTok Research API OAuth' },
  { key: 'instagram_token', label: 'Instagram access token', placeholder: 'Long-lived Page access token' },
  { key: 'instagram_user_id', label: 'Instagram user ID', placeholder: 'Your IG Business user ID' },
  { key: 'linkedin_token', label: 'LinkedIn access token', placeholder: 'OAuth2 bearer token' },
  { key: 'linkedin_person_id', label: 'LinkedIn person ID', placeholder: 'urn:li:person:XXXXXX' },
  { key: 'buffer_token', label: 'Buffer access token', placeholder: 'From Buffer Settings → API' },
  { key: 'higgsfield_api_key', label: 'Higgsfield API key', placeholder: 'From Higgsfield Settings → API' },
  { key: 'higgsfield_avatar_id', label: 'Higgsfield avatar ID', placeholder: 'From Higgsfield → Avatars' },
]

const EMPTY_FORM: Partial<Workspace> = {
  name: '',
  tiktok_token: '',
  instagram_token: '',
  instagram_user_id: '',
  linkedin_token: '',
  linkedin_person_id: '',
  buffer_token: '',
  higgsfield_api_key: '',
  higgsfield_avatar_id: '',
  brand_colors: '#6366f1,#8b5cf6',
  automation_enabled: true,
}

export function WorkspacesClient() {
  const { setWorkspaceId } = useWorkspace()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [editing, setEditing] = useState<Partial<Workspace> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchWorkspaces = () => {
    setLoading(true)
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((d) => setWorkspaces(d.workspaces ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchWorkspaces() }, [])

  async function saveWorkspace() {
    if (!editing) return
    setSaving(true)
    if (isNew) {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      const data = await res.json()
      if (data.workspace?.id) setWorkspaceId(data.workspace.id)
    } else {
      await fetch(`/api/workspaces/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
    }
    setSaving(false)
    setEditing(null)
    fetchWorkspaces()
  }

  async function deleteWorkspace(id: string) {
    if (!confirm('Delete this workspace and all its data?')) return
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
    fetchWorkspaces()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Workspaces</h1>
        <button
          onClick={() => { setEditing(EMPTY_FORM); setIsNew(true) }}
          className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700"
        >
          + New workspace
        </button>
      </div>

      {workspaces.length === 0 && !editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
          No workspaces yet. Create one to get started.
        </div>
      )}

      {/* Workspace list */}
      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div key={ws.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">{ws.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {ws.automation_enabled ? 'Active' : 'Paused'} · Created {new Date(ws.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(ws); setIsNew(false) }}
                className="text-sm text-violet-600 hover:text-violet-800 font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => deleteWorkspace(ws.id)}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create form */}
      {editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">
            {isNew ? 'New workspace' : `Edit: ${editing.name}`}
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Workspace name</label>
            <input
              type="text"
              value={editing.name ?? ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Brand A"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">API Credentials</p>
            <p className="text-xs text-slate-400 mb-3">Stored encrypted in Supabase Vault. Never committed to code.</p>
            <div className="space-y-3">
              {CREDENTIAL_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                  <input
                    type="password"
                    value={(editing[key] as string) ?? ''}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    placeholder={placeholder}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              disabled={saving || !editing.name}
              onClick={saveWorkspace}
              className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-40"
            >
              {saving ? 'Saving...' : isNew ? 'Create workspace' : 'Save changes'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
