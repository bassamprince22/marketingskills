'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/WorkspaceSwitcher'
import { AutomationToggle } from '@/components/AutomationToggle'
import type { Config, Workspace } from '@/lib/supabase'

export function ControlClient() {
  const { workspaceId } = useWorkspace()
  const [config, setConfig] = useState<Config | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/config?workspace_id=${workspaceId}`).then((r) => r.json()),
      fetch(`/api/workspaces`).then((r) => r.json()),
    ])
      .then(([configData, workspacesData]) => {
        setConfig(configData.config ?? null)
        const ws = workspacesData.workspaces?.find((w: Workspace) => w.id === workspaceId)
        setWorkspace(ws ?? null)
      })
      .finally(() => setLoading(false))
  }, [workspaceId])

  async function saveConfig(updates: Partial<Config & Workspace>) {
    setSaving(true)
    setSaved(false)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, ...updates }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function triggerNow() {
    if (!process.env.NEXT_PUBLIC_ZAPIER_TRIGGER_WEBHOOK) {
      alert('Set NEXT_PUBLIC_ZAPIER_TRIGGER_WEBHOOK in env vars to enable manual trigger.')
      return
    }
    await fetch(process.env.NEXT_PUBLIC_ZAPIER_TRIGGER_WEBHOOK, { method: 'POST' })
    alert('Zap 1 triggered. Check your Supabase trends table in ~5 minutes.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Automation Control</h1>
        {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
      </div>

      {/* On/Off toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Automation</h2>
        <AutomationToggle
          enabled={workspace?.automation_enabled ?? false}
          onChange={(enabled) => saveConfig({ automation_enabled: enabled } as Partial<Config & Workspace>)}
        />
        <button
          onClick={triggerNow}
          className="text-sm text-violet-600 hover:text-violet-800 font-medium"
        >
          Run now (manually trigger Zap 1) →
        </button>
      </div>

      {/* Content mix */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Content Mix</h2>
        {workspace && (
          <ContentMixSliders workspace={workspace} onSave={saveConfig} saving={saving} />
        )}
      </div>

      {/* Hashtags */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Niche Hashtags</h2>
        {workspace && (
          <HashtagEditor workspace={workspace} onSave={saveConfig} saving={saving} />
        )}
      </div>

      {/* Brand colors */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Brand Colors (used in carousel slides)</h2>
        {workspace && (
          <BrandColorsEditor workspace={workspace} onSave={saveConfig} saving={saving} />
        )}
      </div>
    </div>
  )
}

function ContentMixSliders({
  workspace,
  onSave,
  saving,
}: {
  workspace: Workspace
  onSave: (u: Partial<Workspace>) => void
  saving: boolean
}) {
  const [broll, setBroll] = useState(workspace.content_mix_broll)
  const [avatar, setAvatar] = useState(workspace.content_mix_avatar)
  const [real, setReal] = useState(workspace.content_mix_real)
  const total = broll + avatar + real

  return (
    <div className="space-y-3">
      {[
        { label: 'AI B-roll', value: broll, set: setBroll },
        { label: 'AI Avatar', value: avatar, set: setAvatar },
        { label: 'Real video', value: real, set: setReal },
      ].map(({ label, value, set }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-sm text-slate-600 w-24 shrink-0">{label}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => set(Number(e.target.value))}
            className="flex-1 accent-violet-600"
          />
          <span className="text-sm text-slate-600 w-8 text-right">{value}%</span>
        </div>
      ))}
      <p className={`text-xs ${total === 100 ? 'text-green-600' : 'text-red-500'}`}>
        Total: {total}% {total !== 100 && '(must equal 100%)'}
      </p>
      <button
        disabled={total !== 100 || saving}
        onClick={() => onSave({ content_mix_broll: broll, content_mix_avatar: avatar, content_mix_real: real })}
        className="text-sm bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save mix'}
      </button>
    </div>
  )
}

function HashtagEditor({
  workspace,
  onSave,
  saving,
}: {
  workspace: Workspace
  onSave: (u: Partial<Workspace>) => void
  saving: boolean
}) {
  const [tiktok, setTiktok] = useState((workspace.niche_hashtags_tiktok ?? []).join(', '))
  const [instagram, setInstagram] = useState((workspace.niche_hashtags_instagram ?? []).join(', '))

  return (
    <div className="space-y-3">
      {[
        { label: 'TikTok hashtags', value: tiktok, set: setTiktok },
        { label: 'Instagram hashtags', value: instagram, set: setInstagram },
      ].map(({ label, value, set }) => (
        <div key={label}>
          <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => set(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="marketingtips, growthhacking, entrepreneurship"
          />
        </div>
      ))}
      <p className="text-xs text-slate-400">Comma-separated, no # prefix</p>
      <button
        disabled={saving}
        onClick={() =>
          onSave({
            niche_hashtags_tiktok: tiktok.split(',').map((s) => s.trim()).filter(Boolean),
            niche_hashtags_instagram: instagram.split(',').map((s) => s.trim()).filter(Boolean),
          })
        }
        className="text-sm bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save hashtags'}
      </button>
    </div>
  )
}

function BrandColorsEditor({
  workspace,
  onSave,
  saving,
}: {
  workspace: Workspace
  onSave: (u: Partial<Workspace>) => void
  saving: boolean
}) {
  const [colors, setColors] = useState(workspace.brand_colors ?? '#6366f1,#8b5cf6')
  const colorList = colors.split(',').map((c) => c.trim())

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {colorList.map((c, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border-2 border-white shadow"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      <input
        type="text"
        value={colors}
        onChange={(e) => setColors(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        placeholder="#6366f1,#8b5cf6"
      />
      <p className="text-xs text-slate-400">Comma-separated hex codes, used for carousel slide backgrounds</p>
      <button
        disabled={saving}
        onClick={() => onSave({ brand_colors: colors })}
        className="text-sm bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save colors'}
      </button>
    </div>
  )
}
