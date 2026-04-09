'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { SalesShell } from '@/components/sales/SalesShell'
import type { SalesUser } from '@/lib/sales/types'

type Step = 'upload' | 'map' | 'preview' | 'import' | 'result'

const SYSTEM_FIELDS = [
  { key: 'company_name',   label: 'Company Name' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'email',          label: 'Email' },
  { key: 'phone',          label: 'Phone' },
  { key: 'notes',          label: 'Notes' },
  { key: 'service_type',   label: 'Service Type' },
  { key: 'lead_source',    label: 'Lead Source' },
]

export default function ImportPage() {
  const [step,        setStep]       = useState<Step>('upload')
  const [csvHeaders,  setHeaders]    = useState<string[]>([])
  const [csvRows,     setCsvRows]    = useState<Record<string, string>[]>([])
  const [mapping,     setMapping]    = useState<Record<string, string>>({})
  const [assignRep,   setAssignRep]  = useState('')
  const [reps,        setReps]       = useState<SalesUser[]>([])
  const [importing,   setImporting]  = useState(false)
  const [result,      setResult]     = useState<{ imported: number; failed: number; errors: { row: number; reason: string }[] } | null>(null)

  useEffect(() => {
    fetch('/api/sales/users?role=rep')
      .then(r => r.json())
      .then(d => setReps(d.users ?? []))
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = Object.keys(results.data[0] ?? {})
        setHeaders(headers)
        setCsvRows(results.data as Record<string, string>[])
        // Auto-map common column names
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

  function buildPreviewRows(limit = 5) {
    return csvRows.slice(0, limit).map(row => {
      const mapped: Record<string, string> = {}
      Object.entries(mapping).forEach(([sysKey, csvCol]) => {
        if (csvCol && row[csvCol]) mapped[sysKey] = row[csvCol]
      })
      return mapped
    })
  }

  function buildImportRows() {
    return csvRows.map(row => {
      const mapped: Record<string, string> = {}
      Object.entries(mapping).forEach(([sysKey, csvCol]) => {
        if (csvCol && row[csvCol]) mapped[sysKey] = row[csvCol]
      })
      return mapped
    })
  }

  async function runImport() {
    setImporting(true)
    const rows = buildImportRows()
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

  const stepStyle = (s: Step): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: step === s ? 'rgba(79,142,247,0.15)' : 'transparent',
    color:      step === s ? '#4F8EF7' : '#64748B',
  })

  return (
    <SalesShell>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>↧ Import Leads from CSV</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Import leads from Meta Ads or any CSV source</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
          {(['upload', 'map', 'preview', 'import', 'result'] as Step[]).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={stepStyle(s)}>
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              {i < 4 && <span style={{ color: '#1E2D4A' }}>→</span>}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="fadaa-card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>↧</p>
            <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Upload your CSV file</h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
              Export from Meta Ads Manager or any other source. Headers will be auto-detected.
            </p>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
              <span className="fadaa-btn" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 14 }}>
                Choose CSV File
              </span>
            </label>
            <p style={{ color: '#1E2D4A', fontSize: 11, marginTop: 16 }}>Max 5,000 rows · UTF-8 encoding</p>
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === 'map' && (
          <div className="fadaa-card" style={{ padding: 28 }}>
            <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Map CSV Columns</h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
              {csvRows.length} rows detected · Match your CSV columns to system fields
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              {SYSTEM_FIELDS.map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 500 }}>{label}</p>
                    {(key === 'company_name' || key === 'contact_person') && (
                      <p style={{ color: '#F87171', fontSize: 11 }}>* required</p>
                    )}
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
            <div style={{ marginBottom: 24, padding: 16, background: '#0F1629', borderRadius: 10, border: '1px solid #1E2D4A' }}>
              <p style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Assign All Imported Leads To</p>
              <select className="fadaa-input" style={{ maxWidth: 280 }} value={assignRep} onChange={e => setAssignRep(e.target.value)}>
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
          <div className="fadaa-card" style={{ padding: 28 }}>
            <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Preview (first 5 rows)</h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>Verify the mapping looks correct before importing</p>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E2D4A' }}>
                    {SYSTEM_FIELDS.filter(f => mapping[f.key]).map(f => (
                      <th key={f.key} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildPreviewRows().map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1E2D4A20' }}>
                      {SYSTEM_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <td key={f.key} style={{ padding: '8px 12px', color: '#E2E8F0' }}>
                          {row[f.key] ?? <span style={{ color: '#64748B' }}>—</span>}
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
          <div className="fadaa-card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 16 }}>↧</p>
            <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ready to Import</h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 8 }}>
              <strong style={{ color: '#E2E8F0' }}>{csvRows.length}</strong> rows will be processed
            </p>
            {assignRep && reps.find(r => r.id === assignRep) && (
              <p style={{ color: '#4F8EF7', fontSize: 13, marginBottom: 24 }}>
                All leads assigned to: <strong>{reps.find(r => r.id === assignRep)?.name}</strong>
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="fadaa-btn-ghost" onClick={() => setStep('preview')}>← Back</button>
              <button className="fadaa-btn" onClick={runImport} disabled={importing} style={{ padding: '12px 28px' }}>
                {importing ? 'Importing…' : `Import ${csvRows.length} Leads`}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 'result' && result && (
          <div className="fadaa-card" style={{ padding: 32 }}>
            <h2 style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Import Complete</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                <p style={{ color: '#4ADE80', fontSize: 32, fontWeight: 700 }}>{result.imported}</p>
                <p style={{ color: '#64748B', fontSize: 12 }}>Successfully imported</p>
              </div>
              <div style={{ background: result.failed ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.08)', border: `1px solid ${result.failed ? 'rgba(239,68,68,0.2)' : '#1E2D4A'}`, borderRadius: 10, padding: 20, textAlign: 'center' }}>
                <p style={{ color: result.failed ? '#F87171' : '#64748B', fontSize: 32, fontWeight: 700 }}>{result.failed}</p>
                <p style={{ color: '#64748B', fontSize: 12 }}>Skipped / failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: '#FCD34D', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Errors:</p>
                <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12, color: '#94A3B8' }}>
                  {result.errors.slice(0, 20).map((e, i) => (
                    <p key={i} style={{ padding: '4px 0', borderBottom: '1px solid #1E2D4A20' }}>
                      Row {e.row}: {e.reason}
                    </p>
                  ))}
                  {result.errors.length > 20 && <p style={{ color: '#64748B' }}>…and {result.errors.length - 20} more</p>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="fadaa-btn-ghost" onClick={() => { setStep('upload'); setResult(null); setCsvRows([]); setHeaders([]); setMapping({}) }}>
                Import More
              </button>
              <a href="/sales/leads" className="fadaa-btn" style={{ textDecoration: 'none' }}>View Leads →</a>
            </div>
          </div>
        )}
      </div>
    </SalesShell>
  )
}
