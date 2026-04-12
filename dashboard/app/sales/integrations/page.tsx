'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'

interface Integration {
  type: string
  is_active: boolean
  config: Record<string, unknown>
  updated_at: string
}

interface Log {
  id: string
  event_type: string
  status: string
  error_message?: string
  created_at: string
}

interface ImportResult {
  imported: number
  skipped: number
  total: number
  error?: string
}

const META_APP_ID    = '1375549184609507'
const META_CALLBACK  = 'https://marketingskills-3t9r.vercel.app/api/sales/integrations/meta/callback'
const META_SCOPES    = 'pages_show_list,leads_retrieval,pages_manage_ads,pages_read_engagement'
const META_OAUTH_URL = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_CALLBACK)}&scope=${META_SCOPES}&response_type=code`

interface MetaCardProps {
  onRefresh: () => void
  connectedParam: string | null
  errorParam: string | null
}

function MetaCard({ onRefresh, connectedParam, errorParam }: MetaCardProps) {
  const [data, setData]           = useState<{ integration: Integration | null; logs: Log[] } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [disconnecting, setDisc]  = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/sales/integrations/meta/pages')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // connected = is_active from DB — persists across page loads
  const connected = Boolean(data?.integration?.is_active)
  const pages     = (data?.integration?.config?.pages as { id: string; name: string }[] | undefined) ?? []
  const connectedAt = data?.integration?.updated_at
    ? new Date(data.integration.updated_at).toLocaleDateString()
    : null

  async function disconnect() {
    if (!confirm('Disconnect Meta integration? Leads will stop importing.')) return
    setDisc(true)
    await fetch('/api/sales/integrations/meta/pages', { method: 'DELETE' })
    load(); onRefresh()
    setDisc(false)
  }

  async function importLeads() {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/sales/integrations/meta/import', { method: 'POST' })
      const result = await res.json()
      setImportResult(result)
    } catch {
      setImportResult({ imported: 0, skipped: 0, total: 0, error: 'Request failed' })
    }
    setImporting(false)
  }

  return (
    <div className="fadaa-card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #1877F2, #0C5BB5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#fff', fontWeight: 700,
        }}>f</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 700 }}>Meta Lead Ads</p>
            {!loading && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600,
                background: connected ? 'rgba(74,222,128,0.1)' : 'rgba(100,116,139,0.1)',
                color: connected ? '#4ADE80' : '#64748B',
              }}>
                {connected ? '● Connected' : '○ Not connected'}
              </span>
            )}
            {connected && connectedAt && (
              <span style={{ fontSize: 11, color: '#475569' }}>since {connectedAt}</span>
            )}
          </div>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
            Auto-import leads from Facebook & Instagram Lead Ads into your pipeline
          </p>
        </div>
      </div>

      {/* Post-OAuth success flash */}
      {connectedParam === 'meta' && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '10px 14px', color: '#4ADE80', fontSize: 13, marginBottom: 16 }}>
          ✓ Facebook connected successfully! New leads will now import automatically.
        </div>
      )}
      {errorParam != null && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13, marginBottom: 16 }}>
          ✕ Connection failed: {errorParam === 'facebook_denied' ? 'You denied the Facebook permission request.' : decodeURIComponent(errorParam)}
        </div>
      )}

      {/* Connected pages list */}
      {connected && pages.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Connected Pages</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pages.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(24,119,242,0.08)', border: '1px solid rgba(24,119,242,0.2)', borderRadius: 8 }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <p style={{ color: '#E2E8F0', fontSize: 13, flex: 1 }}>{p.name}</p>
                <span style={{ color: '#4ADE80', fontSize: 11 }}>● Subscribed to leadgen</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import last 30 days — only shown when connected */}
      {connected && (
        <div style={{ marginBottom: 20, padding: 16, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>📥 Import last 30 days</p>
              <p style={{ color: '#64748B', fontSize: 12 }}>Fetch all existing leads from your connected pages into the CRM. Duplicates are skipped.</p>
            </div>
            <button
              onClick={importLeads}
              disabled={importing}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: importing ? 'rgba(79,142,247,0.2)' : '#4F8EF7',
                color: importing ? '#64748B' : '#fff',
                border: 'none', cursor: importing ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              {importing ? '⟳ Importing…' : 'Import Now'}
            </button>
          </div>

          {/* Import result */}
          {importResult && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: importResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${importResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}` }}>
              {importResult.error ? (
                <p style={{ color: '#F87171', fontSize: 13 }}>✕ {importResult.error}</p>
              ) : (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <p style={{ color: '#4ADE80', fontSize: 13 }}>✓ <strong>{importResult.imported}</strong> leads imported</p>
                  <p style={{ color: '#64748B', fontSize: 13 }}><strong>{importResult.skipped}</strong> duplicates skipped</p>
                  <p style={{ color: '#64748B', fontSize: 13 }}><strong>{importResult.total}</strong> total found</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!connected ? (
          <a
            href={META_OAUTH_URL}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#1877F2', color: '#fff', textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 16 }}>f</span>
            Connect Facebook
          </a>
        ) : (
          <>
            <a
              href={META_OAUTH_URL}
              style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, background: 'rgba(24,119,242,0.1)', color: '#60A5FA', border: '1px solid rgba(24,119,242,0.2)', textDecoration: 'none' }}
            >
              Reconnect
            </a>
            <button
              onClick={disconnect}
              disabled={disconnecting}
              style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        )}
      </div>

      {/* Recent activity logs */}
      {(data?.logs ?? []).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Recent Activity</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(data?.logs ?? []).slice(0, 8).map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #1E2D4A' }}>
                <span style={{ fontSize: 12, color: log.status === 'success' ? '#4ADE80' : log.status === 'error' ? '#F87171' : '#F59E0B' }}>
                  {log.status === 'success' ? '✓' : log.status === 'error' ? '✕' : '◌'}
                </span>
                <p style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>
                  {log.event_type?.replace(/_/g, ' ')}
                  {log.error_message && <span style={{ color: '#F87171' }}> — {log.error_message}</span>}
                </p>
                <p style={{ color: '#475569', fontSize: 11 }}>
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ComingSoonCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="fadaa-card" style={{ padding: 24, opacity: 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#1E2D4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700 }}>{name}</p>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontWeight: 600 }}>Coming soon</span>
          </div>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>{desc}</p>
        </div>
      </div>
    </div>
  )
}

function IntegrationsContent() {
  const sp             = useSearchParams()
  const connectedParam = sp.get('connected')
  const errorParam     = sp.get('error')
  const [tick, setTick] = useState(0)

  return (
    <SalesShell>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>⚡ Integrations</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Connect external tools to automate your sales workflow</p>
        </div>

        <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Lead Sources</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <MetaCard
            onRefresh={() => setTick(t => t + 1)}
            connectedParam={connectedParam}
            errorParam={errorParam}
          />
        </div>

        <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Calendar & Meetings</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <ComingSoonCard icon="📅" name="Google Calendar" desc="Auto-create calendar events when meetings are scheduled" />
        </div>

        <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Messaging</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ComingSoonCard icon="💬" name="WhatsApp Business" desc="Send automated follow-up messages to new leads" />
        </div>
      </div>
    </SalesShell>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<SalesShell><div style={{ color: '#64748B', padding: 40 }}>Loading…</div></SalesShell>}>
      <IntegrationsContent />
    </Suspense>
  )
}
