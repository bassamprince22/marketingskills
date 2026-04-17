'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { SalesShell } from '@/components/sales/SalesShell'
import type { SalesUser } from '@/lib/sales/types'

type Step = 'upload' | 'map' | 'preview' | 'import' | 'result'

const STEPS: Step[] = ['upload', 'map', 'preview', 'import', 'result']
const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload', map: 'Map', preview: 'Preview', import: 'Import', result: 'Done',
}

const SYSTEM_FIELDS = [
  { key: 'company_name',   label: 'Company Name',   required: true },
  { key: 'contact_person', label: 'Contact Person',  required: true },
  { key: 'email',          label: 'Email',           required: false },
  { key: 'phone',          label: 'Phone',           required: false },
  { key: 'notes',          label: 'Notes',           required: false },
  { key: 'service_type',   label: 'Service Type',    required: false },
  { key: 'lead_source',    label: 'Lead Source',     required: false },
]

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((s, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: active ? 'rgba(79,142,247,0.15)' : done ? 'rgba(74,222,128,0.08)' : 'transparent',
              color: active ? 'var(--brand-primary)' : done ? '#4ADE80' : 'var(--text-muted)',
              border: `1px solid ${active ? 'rgba(79,142,247,0.3)' : done ? 'rgba(74,222,128,0.2)' : 'transparent'}`,
              transition: 'all 0.2s',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                background: active ? 'var(--brand-primary)' : done ? '#4ADE80' : 'var(--border-default)',
                color: active || done ? '#fff' : 'var(--text-muted)',
              }}>
                {done ? '✓' : i + 1}
              </span>
              {STEP_LABELS[s]}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 24, height: 1, background: done ? 'rgba(74,222,128,0.3)' : 'var(--border-subtle)', margin: '0 2px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ImportPage() {
  const [step,       setStep]      = useState<Step>('upload')
  const [csvHeaders, setHeaders]   = useState<string[]>([])
  const [csvRows,    setCsvRows]   = useState<Record<string, string>[]>([])
  const [mapping,    setMapping]   = useState<Record<string, string>>({})
  const [assignRep,  setAssignRep] = useState('')
  const [reps,       setReps]      = useState<SalesUser[]>([])
  const [importing,  setImporting] = useState(false)
  const [result,     setResult]    = useState<{ imported: number; failed: number; errors: { row: number; reason: string }[] } | null>(null)
  const [dragging,   setDragging]  = useState(false)

  useEffect(() => {
    fetch('/api/sales/users?role=rep')
      .then(r => r.json())
      .then(d => setReps(d.users ?? []))
  }, [])

  function parseFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = Object.keys(results.data[0] ?? {})
        setHeaders(headers)
        setCsvRows(results.data as Record<string, string>[])
        const autoMap: Record<string, string> = {}
        SYSTEM_FIELDS.forEach(({ key }) => {
          const match = headers.find(h =>
            h.toLowerCase().replace(/[^a-z]/g, '') === key.replace(/_/g, '') ||
            h.toLowerCase().includes(key.split('_')[0])
          )
          if (match) autoMap[key] = match
        })
        setMapping(autoMap)
        setStep('map')
      },
    })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  function buildPreviewRows(limit = 5) {
    return csvRows.slice(0, limit).map(row => {
      const mapped: Record<string, string> = {}
      Object.entries(mapping).forEach(([sysKey, csvCol]) => {
        if (csvCol && row[csvCol]) mapped[sysKey] = row[csvCol]
      })
      return mapped
    })
  }

  async function runImport() {
    setImporting(true)
    const rows = csvRows.map(row => {
      const mapped: Record<string, string> = {}
      Object.entries(mapping).forEach(([sysKey, csvCol]) => {
        if (csvCol && row[csvCol]) mapped[sysKey] = row[csvCol]
      })
      return mapped
    })
    const res  = await fetch('/api/sales/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, assignedRepId: assignRep || undefined }),
    })
    const data = await res.json()
    setResult(data)
    setStep('result')
    setImporting(false)
  }

  function reset() {
    setStep('upload'); setResult(null); setCsvRows([]); setHeaders([]); setMapping({})
  }

  const mappedFields = SYSTEM_FIELDS.filter(f => mapping[f.key])

  return (
    <SalesShell>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: 28 }}>
          <div className="page-header-left">
            <h1 className="t-page-title">Import Leads</h1>
            <p className="t-caption">Import leads from Meta Ads or any CSV source</p>
          </div>
        </div>

        <StepIndicator current={step} />

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div
            className="fadaa-card"
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) parseFile(f) }}
            style={{
              padding: 56, textAlign: 'center',
              border: `2px dashed ${dragging ? 'var(--brand-primary)' : 'var(--border-default)'}`,
              background: dragging ? 'rgba(79,142,247,0.04)' : undefined,
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: 16, margin: '0 auto 20px',
              background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, color: 'var(--brand-primary)',
            }}>
              ↧
            </div>
            <h2 className="t-section-title" style={{ marginBottom: 8 }}>Upload your CSV file</h2>
            <p className="t-caption" style={{ marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
              Export from Meta Ads Manager or any other source. Column headers will be auto-detected and mapped.
            </p>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
              <span className="fadaa-btn" style={{ display: 'inline-flex', padding: '12px 28px', fontSize: 14 }}>
                Choose CSV File
              </span>
            </label>
            <p className="t-caption" style={{ marginTop: 16 }}>or drag & drop · Max 5,000 rows · UTF-8 encoding</p>
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === 'map' && (
          <div className="fadaa-card" style={{ padding: '24px 28px' }}>
            <div className="card-header" style={{ marginBottom: 24 }}>
              <div>
                <h2 className="t-section-title">Map CSV Columns</h2>
                <p className="t-caption" style={{ marginTop: 3 }}>{csvRows.length} rows detected · Match your CSV columns to system fields</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {SYSTEM_FIELDS.map(({ key, label, required }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center' }}>
                  <div>
                    <p className="t-body" style={{ fontWeight: 500 }}>
                      {label}
                      {required && <span style={{ color: '#F87171', marginLeft: 4 }}>*</span>}
                    </p>
                    {required && <p className="t-caption" style={{ marginTop: 2 }}>Required</p>}
                  </div>
                  <select
                    className="fadaa-input"
                    value={mapping[key] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}
                  >
                    <option value="">— Skip —</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Assign rep */}
            <div className="form-field" style={{ padding: '16px 20px', background: 'var(--surface-base)', borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
              <label className="form-label">Assign All Imported Leads To</label>
              <select className="fadaa-input" style={{ maxWidth: 280, marginTop: 8 }} value={assignRep} onChange={e => setAssignRep(e.target.value)}>
                <option value="">— Unassigned —</option>
                {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="fadaa-btn-ghost" onClick={() => setStep('upload')}>← Back</button>
              <button className="fadaa-btn" onClick={() => setStep('preview')}>Preview →</button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="fadaa-card" style={{ padding: '24px 28px' }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="t-section-title">Preview</h2>
                <p className="t-caption" style={{ marginTop: 3 }}>First 5 rows — verify the mapping looks correct</p>
              </div>
            </div>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table className="fadaa-table">
                <thead>
                  <tr>
                    {mappedFields.map(f => <th key={f.key}>{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {buildPreviewRows().map((row, i) => (
                    <tr key={i}>
                      {mappedFields.map(f => (
                        <td key={f.key}>
                          {row[f.key] ?? <span className="t-caption">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="fadaa-btn-ghost" onClick={() => setStep('map')}>← Back</button>
              <button className="fadaa-btn" onClick={() => setStep('import')}>Looks Good →</button>
            </div>
          </div>
        )}

        {/* Step 4: Import */}
        {step === 'import' && (
          <div className="fadaa-card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
              background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: 'var(--brand-primary)',
            }}>
              ↧
            </div>
            <h2 className="t-section-title" style={{ marginBottom: 8 }}>Ready to Import</h2>
            <p className="t-caption" style={{ marginBottom: 6 }}>
              <span className="t-mono" style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>{csvRows.length}</span> rows will be processed
            </p>
            {assignRep && reps.find(r => r.id === assignRep) && (
              <p className="t-caption" style={{ color: 'var(--brand-primary)', marginBottom: 28 }}>
                All leads → <strong>{reps.find(r => r.id === assignRep)?.name}</strong>
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
              <button className="fadaa-btn-ghost" onClick={() => setStep('preview')}>← Back</button>
              <button
                className="fadaa-btn"
                onClick={runImport}
                disabled={importing}
                style={{ minWidth: 180, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px' }}
              >
                {importing ? (
                  <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Importing…</>
                ) : (
                  `Import ${csvRows.length} Leads`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 'result' && result && (
          <div className="fadaa-card" style={{ padding: '28px 32px' }}>
            <div className="card-header" style={{ marginBottom: 24 }}>
              <h2 className="t-section-title">✓ Import Complete</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
                <p className="t-mono" style={{ color: '#4ADE80', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{result.imported}</p>
                <p className="t-caption" style={{ marginTop: 8 }}>Successfully imported</p>
              </div>
              <div style={{
                background: result.failed ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.05)',
                border: `1px solid ${result.failed ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)'}`,
                borderRadius: 12, padding: '20px 24px', textAlign: 'center',
              }}>
                <p className="t-mono" style={{ color: result.failed ? '#F87171' : 'var(--text-muted)', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{result.failed}</p>
                <p className="t-caption" style={{ marginTop: 8 }}>Skipped / failed</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p className="t-label" style={{ color: '#FCD34D', marginBottom: 10 }}>Import Errors</p>
                <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  {result.errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="t-caption" style={{
                      padding: '8px 12px',
                      borderBottom: i < Math.min(result.errors.length, 20) - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <span style={{ color: '#F87171', fontWeight: 600 }}>Row {e.row}:</span> {e.reason}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="t-caption" style={{ padding: '8px 12px' }}>…and {result.errors.length - 20} more errors</p>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="fadaa-btn-ghost" onClick={reset}>Import More</button>
              <a href="/sales/leads" className="fadaa-btn" style={{ textDecoration: 'none' }}>View Leads →</a>
            </div>
          </div>
        )}
      </div>
    </SalesShell>
  )
}
