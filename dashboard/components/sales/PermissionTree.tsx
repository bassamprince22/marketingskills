'use client'

import { useState } from 'react'
import type { Permission, PermissionModule } from '@/lib/sales/db'

export const PERMISSION_MODULES: PermissionModule[] = [
  'dashboard', 'leads', 'pipeline', 'meetings',
  'qualified', 'documents', 'import', 'reports', 'team',
]

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',   leads: 'Leads',       pipeline: 'Pipeline',
  meetings:  'Meetings',    qualified: 'Qualified Leads', documents: 'Documents',
  import:    'CSV Import',  reports: 'Reports',   team: 'Team',
}

const MODULE_ICONS: Record<string, string> = {
  dashboard: '⬡', leads: '◎', pipeline: '⟿', meetings: '◷',
  qualified: '✦', documents: '⎗', import: '↧', reports: '▦', team: '◈',
}

const PERM_KEYS = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_manage'] as const
type PermKey = typeof PERM_KEYS[number]

const PERM_LABELS: Record<PermKey, string> = {
  can_view: 'View', can_create: 'Create', can_edit: 'Edit',
  can_delete: 'Delete', can_manage: 'Manage',
}

function defaultPermissions(): Permission[] {
  return PERMISSION_MODULES.map(module => ({
    module, can_view: false, can_create: false,
    can_edit: false, can_delete: false, can_manage: false,
  }))
}

export function mergePermissions(saved: Permission[]): Permission[] {
  const base = defaultPermissions()
  return base.map(def => {
    const found = saved.find(p => p.module === def.module)
    return found ?? def
  })
}

// ─── Toggle switch ────────────────────────────────
function Toggle({ checked, onChange, color = '#4F8EF7' }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? color : '#1E2D4A',
        border: `1px solid ${checked ? color : '#2D3F5A'}`,
        cursor: 'pointer', padding: 2,
        display: 'flex', alignItems: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
      aria-checked={checked}
      role="switch"
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff',
        transform: checked ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

// ─── Module row ───────────────────────────────────
function ModuleRow({
  perm, onChange, onBulkToggle,
}: {
  perm: Permission
  onChange: (key: PermKey, value: boolean) => void
  onBulkToggle: (enable: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const allOn  = PERM_KEYS.every(k => perm[k])
  const anyOn  = PERM_KEYS.some(k => perm[k])

  return (
    <div style={{
      background: '#0F1629',
      border: '1px solid #1E2D4A',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
    }}>
      {/* Module header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        background: anyOn ? 'rgba(79,142,247,0.04)' : 'transparent',
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 12, padding: 0, width: 16 }}
        >
          {open ? '▾' : '▸'}
        </button>
        <span style={{ fontSize: 16 }}>{MODULE_ICONS[perm.module]}</span>
        <span style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14, flex: 1 }}>
          {MODULE_LABELS[perm.module]}
        </span>
        {/* Bulk toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#64748B', fontSize: 11 }}>{allOn ? 'All' : anyOn ? 'Partial' : 'None'}</span>
          <Toggle
            checked={allOn}
            onChange={() => onBulkToggle(!allOn)}
            color={allOn ? '#4ADE80' : '#4F8EF7'}
          />
        </div>
      </div>

      {/* Permission rows */}
      {open && (
        <div style={{ borderTop: '1px solid #1E2D4A', padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PERM_KEYS.map(key => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 8,
              background: perm[key] ? 'rgba(79,142,247,0.06)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: perm[key] ? '#4F8EF7' : '#2D3F5A', display: 'inline-block' }} />
                <span style={{ color: perm[key] ? '#E2E8F0' : '#64748B', fontSize: 13 }}>{PERM_LABELS[key]}</span>
              </div>
              <Toggle checked={perm[key]} onChange={() => onChange(key, !perm[key])} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────
interface Props {
  initialPermissions: Permission[]
  readonly?: boolean
  onSave?: (perms: Permission[]) => Promise<void>
}

export function PermissionTree({ initialPermissions, readonly = false, onSave }: Props) {
  const [perms, setPerms] = useState<Permission[]>(mergePermissions(initialPermissions))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function updatePerm(module: PermissionModule, key: PermKey, value: boolean) {
    setPerms(prev => prev.map(p => p.module === module ? { ...p, [key]: value } : p))
    setSaved(false)
  }

  function bulkToggle(module: PermissionModule, enable: boolean) {
    setPerms(prev => prev.map(p =>
      p.module === module
        ? { ...p, can_view: enable, can_create: enable, can_edit: enable, can_delete: enable, can_manage: enable }
        : p
    ))
    setSaved(false)
  }

  function toggleAll(enable: boolean) {
    setPerms(prev => prev.map(p => ({
      ...p, can_view: enable, can_create: enable, can_edit: enable, can_delete: enable, can_manage: enable,
    })))
    setSaved(false)
  }

  async function handleSave() {
    if (!onSave) return
    setSaving(true)
    try { await onSave(perms); setSaved(true) } finally { setSaving(false) }
  }

  const allOn = perms.every(p => PERM_KEYS.every(k => p[k]))

  return (
    <div>
      {/* Header controls */}
      {!readonly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#64748B', fontSize: 13 }}>Grant all permissions</span>
            <Toggle checked={allOn} onChange={() => toggleAll(!allOn)} color="#4ADE80" />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="fadaa-btn"
            style={{ fontSize: 13, padding: '8px 20px' }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Permissions'}
          </button>
        </div>
      )}

      {/* Module list */}
      <div>
        {perms.map(perm => (
          <ModuleRow
            key={perm.module}
            perm={perm}
            onChange={(key, val) => !readonly && updatePerm(perm.module as PermissionModule, key, val)}
            onBulkToggle={(enable) => !readonly && bulkToggle(perm.module as PermissionModule, enable)}
          />
        ))}
      </div>
    </div>
  )
}
