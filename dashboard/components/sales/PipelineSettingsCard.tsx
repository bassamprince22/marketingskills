'use client'

import { useEffect, useState } from 'react'
import type { PipelineStageConfig } from '@/lib/sales/types'
import { DEFAULT_PIPELINE_STAGE_CONFIGS } from '@/lib/sales/types'
import { normalizePipelineStages } from '@/lib/sales/pipeline'

function makeStageKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function PipelineSettingsCard() {
  const [stages, setStages] = useState<PipelineStageConfig[]>(DEFAULT_PIPELINE_STAGE_CONFIGS)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  function flash(text: string, type: 'ok' | 'err') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  useEffect(() => {
    fetch('/api/sales/settings')
      .then((response) => response.ok ? response.json() : Promise.resolve({}))
      .then((payload) => setStages(normalizePipelineStages(payload.settings?.pipeline?.stages)))
      .catch(() => setStages(DEFAULT_PIPELINE_STAGE_CONFIGS))
  }, [])

  function updateStage(index: number, patch: Partial<PipelineStageConfig>) {
    setStages((prev) => prev.map((stage, current) => current === index ? { ...stage, ...patch } : stage))
  }

  function moveStage(index: number, direction: -1 | 1) {
    setStages((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((stage, order) => ({ ...stage, order: (order + 1) * 10 }))
    })
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, current) => current !== index).map((stage, order) => ({ ...stage, order: (order + 1) * 10 })))
  }

  function addStage() {
    const label = `Custom Stage ${stages.length + 1}`
    const key = makeStageKey(label)
    setStages((prev) => normalizePipelineStages([
      ...prev,
      {
        key,
        label,
        color: '#7C3AED',
        order: (prev.length + 1) * 10,
        report_bucket: 'open',
        crm_only: true,
        suggested_doc_types: ['proposal'],
      },
    ]))
  }

  async function save() {
    setSaving(true)
    const normalized = normalizePipelineStages(stages).map((stage, index) => ({
      ...stage,
      key: makeStageKey(stage.key || stage.label),
      order: (index + 1) * 10,
    }))
    const response = await fetch('/api/sales/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline: { stages: normalized } }),
    })
    setSaving(false)
    if (!response.ok) {
      flash('Failed to save pipeline settings', 'err')
      return
    }
    setStages(normalized)
    flash('Pipeline settings saved', 'ok')
  }

  return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div className="card-header" style={{ marginBottom: 18 }}>
        <div>
          <h3 className="t-section-title">Pipeline</h3>
          <p className="t-caption" style={{ marginTop: 3 }}>
            Edit stage labels, ordering, CRM-only stages, and Meta mirror labels without changing your brand styling.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {msg && (
            <span style={{ fontSize: 12, color: msgType === 'ok' ? 'var(--brand-green-text)' : 'var(--brand-red-text)' }}>
              {msgType === 'ok' ? '✓' : '⚠'} {msg}
            </span>
          )}
          <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={addStage}>+ Add stage</button>
          <button className="fadaa-btn fadaa-btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stages.map((stage, index) => (
          <div
            key={`${stage.key}-${index}`}
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              padding: 14,
              background: 'var(--surface-card)',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr) 110px 140px 120px auto',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <input
              className="fadaa-input"
              value={stage.label}
              onChange={(event) => updateStage(index, { label: event.target.value, key: makeStageKey(event.target.value) || stage.key })}
              placeholder="Stage label"
            />
            <input
              className="fadaa-input"
              value={stage.meta_stage_label ?? ''}
              onChange={(event) => updateStage(index, { meta_stage_label: event.target.value, meta_stage_key: makeStageKey(event.target.value) || null })}
              placeholder="Meta stage label"
            />
            <input
              className="fadaa-input"
              type="color"
              value={stage.color}
              onChange={(event) => updateStage(index, { color: event.target.value })}
              aria-label="Stage color"
            />
            <select
              className="fadaa-input"
              value={stage.report_bucket ?? 'open'}
              onChange={(event) => updateStage(index, { report_bucket: event.target.value as PipelineStageConfig['report_bucket'] })}
            >
              <option value="open">Open</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="contract">Contract</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={Boolean(stage.crm_only)}
                onChange={(event) => updateStage(index, { crm_only: event.target.checked })}
              />
              CRM only
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => moveStage(index, -1)} disabled={index === 0}>↑</button>
              <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1}>↓</button>
              <button className="fadaa-btn-danger fadaa-btn-sm" onClick={() => removeStage(index)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
