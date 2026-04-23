'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesShell } from '@/components/sales/SalesShell'

interface Integration {
  type: string
  is_active: boolean
  config: {
    pages?: Array<{ id: string; name: string }>
    default_page_id?: string | null
    sync_stats?: {
      total_imported?: number
      total_updated?: number
    }
  }
  updated_at: string
}

interface MetaHealth {
  status: 'healthy' | 'warning' | 'broken'
  status_message: string
  connected: boolean
  page_count: number
  default_page_configured: boolean
  default_page_valid: boolean
  default_page_id: string | null
  token_expiry: string | null
  token_valid: boolean | null
  last_checked_at: string | null
  last_webhook_at: string | null
  last_successful_ingest_at: string | null
  last_successful_sync_at: string | null
  last_sync_source: 'webhook' | 'manual_import' | 'cron' | null
  last_failure_at: string | null
  last_error_message: string | null
  consecutive_failures: number
  total_imported: number
  total_updated: number
}

interface Log {
  id: string
  event_type: string
  status: 'success' | 'warning' | 'error' | 'info'
  error_message?: string | null
  created_at: string
}

interface MetaResponse {
  integration: Integration | null
  logs: Log[]
  health: MetaHealth | null
}

interface SyncResult {
  imported: number
  updated: number
  skipped: number
  failed: number
  total: number
  pages: number
  forms: number
  since: string
  until: string
  error?: string
}

function makeSyncErrorResult(error: string): SyncResult {
  return {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    pages: 0,
    forms: 0,
    since: '',
    until: '',
    error,
  }
}

async function parseApiResponse(response: Response): Promise<SyncResult> {
  const raw = await response.text()
  let payload: SyncResult | null = null

  try {
    payload = raw ? JSON.parse(raw) as SyncResult : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const detail =
      payload?.error?.trim() ||
      raw.trim() ||
      `Request failed with HTTP ${response.status}`

    return makeSyncErrorResult(`HTTP ${response.status}: ${detail}`)
  }

  if (!payload) {
    return makeSyncErrorResult('The server returned an empty response.')
  }

  return payload
}

const META_APP_ID = '1375549184609507'
const META_SCOPES = 'ads_management,pages_show_list,leads_retrieval,pages_manage_ads,pages_read_engagement'

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'never'
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString()
}

function getMetaOauthUrl() {
  if (typeof window === 'undefined') return '#'
  const callback = `${window.location.origin}/api/sales/integrations/meta/callback`
  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(callback)}&scope=${META_SCOPES}&response_type=code`
}

function statusStyle(status: MetaHealth['status'] | 'disconnected') {
  if (status === 'healthy') {
    return {
      bg: 'rgba(74,222,128,0.08)',
      border: 'rgba(74,222,128,0.22)',
      color: '#4ADE80',
    }
  }
  if (status === 'warning') {
    return {
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.24)',
      color: '#FBBF24',
    }
  }
  return {
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.24)',
    color: status === 'disconnected' ? '#94A3B8' : '#F87171',
  }
}

function MetaCard({ connectedParam, errorParam }: { connectedParam: string | null; errorParam: string | null }) {
  const [data, setData] = useState<MetaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedPageId, setSelectedPageId] = useState<string>('all')
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [addPageId, setAddPageId] = useState('')
  const [addingPage, setAddingPage] = useState(false)
  const [addResult, setAddResult] = useState<{ ok?: boolean; page?: { id: string; name: string }; error?: string; hint?: string } | null>(null)
  const [importResult, setImportResult] = useState<SyncResult | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [refreshTokenInput, setRefreshTokenInput] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<{ ok?: boolean; pages_count?: number; pages?: { id: string; name: string }[]; subscriptions?: { page: string; ok: boolean; error?: string }[]; app_level_ok?: boolean; error?: string } | null>(null)

  const metaOAuthUrl = useMemo(() => getMetaOauthUrl(), [])

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sales/integrations/meta/pages')
      const payload = await response.json()
      setData(payload)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/sales/integrations/meta/pages')
        .then((response) => response.json())
        .then((payload) => setData(payload))
        .catch(() => {})
    }, 30_000)
    return () => clearInterval(timer)
  }, [])

  const connected = Boolean(data?.integration?.is_active)
  const pages = data?.integration?.config?.pages ?? []
  const defaultPageId = data?.integration?.config?.default_page_id ?? null
  const health = data?.health
  const displayStatus = connected ? health?.status ?? 'warning' : 'disconnected'
  const colors = statusStyle(displayStatus)

  async function disconnect() {
    if (!confirm('Disconnect Meta integration? Leads will stop importing.')) return
    setDisconnecting(true)
    await fetch('/api/sales/integrations/meta/pages', { method: 'DELETE' })
    setDisconnecting(false)
    await load()
  }

  async function importLeads() {
    setImporting(true)
    setImportResult(null)
    try {
      const response = await fetch(
        `/api/sales/integrations/meta/import?page_id=${encodeURIComponent(selectedPageId)}`,
        { method: 'POST' }
      )
      const payload = await parseApiResponse(response)
      setImportResult(payload)
      await load()
    } catch (error) {
      setImportResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        total: 0,
        pages: 0,
        forms: 0,
        since: '',
        until: '',
        error: error instanceof Error ? error.message : 'Request failed',
      })
    } finally {
      setImporting(false)
    }
  }

  async function runRepairSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const response = await fetch('/api/sales/integrations/meta/sync')
      const payload = await parseApiResponse(response)
      setSyncResult(payload)
      await load()
    } catch (error) {
      setSyncResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        total: 0,
        pages: 0,
        forms: 0,
        since: '',
        until: '',
        error: error instanceof Error ? error.message : 'Request failed',
      })
    } finally {
      setSyncing(false)
    }
  }

  async function setDefaultPage(pageId: string | null) {
    setSettingDefault(pageId)
    await fetch('/api/sales/integrations/meta/pages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_page_id: pageId }),
    })
    setSettingDefault(null)
    await load()
  }

  async function refreshTokenFn() {
    if (!refreshTokenInput.trim()) return
    setRefreshing(true)
    setRefreshResult(null)
    try {
      const response = await fetch('/api/sales/integrations/meta/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: refreshTokenInput.trim() }),
      })
      const payload = await response.json()
      setRefreshResult(payload)
      if (payload.ok) {
        setRefreshTokenInput('')
        await load()
      }
    } catch {
      setRefreshResult({ error: 'Request failed. Check your network and try again.' })
    } finally {
      setRefreshing(false)
    }
  }

  async function addPageManually() {
    if (!addPageId.trim()) return
    setAddingPage(true)
    setAddResult(null)
    try {
      const response = await fetch('/api/sales/integrations/meta/pages/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: addPageId.trim() }),
      })
      const payload = await response.json()
      setAddResult(payload)
      if (payload.ok) {
        setAddPageId('')
        await load()
      }
    } catch {
      setAddResult({ error: 'Request failed' })
    } finally {
      setAddingPage(false)
    }
  }

  return (
    <div className="fadaa-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            flexShrink: 0,
            background: 'linear-gradient(135deg, #1877F2, #0C5BB5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: '#fff',
            fontWeight: 700,
          }}
        >
          f
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 700 }}>Meta Lead Ads</p>
            {!loading && (
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontWeight: 600,
                  background: colors.bg,
                  color: colors.color,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {connected ? displayStatus.toUpperCase() : 'DISCONNECTED'}
              </span>
            )}
          </div>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
            Auto-import Facebook and Instagram lead forms into your CRM, with hourly repair sync and admin health alerts.
          </p>
        </div>
      </div>

      {connectedParam === 'meta' && (
        <div
          style={{
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#4ADE80',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          Facebook connected successfully. Review the Meta health banner below and confirm the correct auto-import page is selected.
        </div>
      )}
      {errorParam != null && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#F87171',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          Connection failed:{' '}
          {errorParam === 'facebook_denied'
            ? 'You denied the Facebook permission request.'
            : decodeURIComponent(errorParam)}
        </div>
      )}

      <div
        style={{
          marginBottom: 18,
          padding: 16,
          borderRadius: 12,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220 }}>
            <p style={{ color: colors.color, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              {connected ? (health?.status_message ?? 'Meta is connected.') : 'Meta is currently disconnected.'}
            </p>
            <p style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
              Admins will be alerted in-app and by email if this state turns stale or broken.
            </p>
          </div>
          {connected && (
            <button
              onClick={runRepairSync}
              disabled={syncing}
              className="fadaa-btn fadaa-btn-sm"
              style={{ alignSelf: 'flex-start' }}
            >
              {syncing ? 'Repairing…' : 'Run Repair Sync'}
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
            marginTop: 14,
          }}
        >
          <div>
            <p className="t-caption">Last webhook</p>
            <p style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 600 }}>{timeAgo(health?.last_webhook_at)}</p>
            <p className="t-caption">{formatDateTime(health?.last_webhook_at)}</p>
          </div>
          <div>
            <p className="t-caption">Last successful sync</p>
            <p style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 600 }}>{timeAgo(health?.last_successful_sync_at)}</p>
            <p className="t-caption">{health?.last_sync_source ?? '—'}</p>
          </div>
          <div>
            <p className="t-caption">Imported / updated</p>
            <p style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 600 }}>
              {(health?.total_imported ?? 0).toLocaleString()} / {(health?.total_updated ?? 0).toLocaleString()}
            </p>
            <p className="t-caption">all-time Meta repairs</p>
          </div>
          <div>
            <p className="t-caption">Page setup</p>
            <p style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 600 }}>
              {health?.default_page_configured ? 'Auto page selected' : 'No auto page'}
            </p>
            <p className="t-caption">{health?.page_count ?? 0} connected page(s)</p>
          </div>
        </div>

        {health?.last_error_message && (
          <p style={{ color: '#FCA5A5', fontSize: 12, marginTop: 12 }}>
            Last error: {health.last_error_message}
          </p>
        )}
      </div>

      {connected && (
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              color: '#64748B',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 8,
            }}
          >
            Connected Pages ({pages.length})
          </p>

          {pages.length === 0 ? (
            <div
              style={{
                padding: 14,
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 8,
              }}
            >
              <p style={{ color: '#FCD34D', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                No pages returned from Facebook
              </p>
              <p style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
                During Facebook OAuth, use &quot;Edit access&quot; to explicitly select each page you want to connect.
              </p>
              <a
                href={metaOAuthUrl}
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#1877F2',
                  color: '#fff',
                  textDecoration: 'none',
                }}
              >
                Reconnect & select pages
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pages.map((page) => {
                const isDefault = page.id === defaultPageId
                const isSetting = settingDefault === page.id
                return (
                  <div
                    key={page.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: isDefault ? 'rgba(79,142,247,0.12)' : 'rgba(24,119,242,0.06)',
                      border: `1px solid ${isDefault ? 'rgba(79,142,247,0.4)' : 'rgba(24,119,242,0.2)'}`,
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>📄</span>
                    <p style={{ color: '#E2E8F0', fontSize: 13, flex: 1, fontWeight: isDefault ? 600 : 400 }}>
                      {page.name}
                    </p>
                    {isDefault ? (
                      <button
                        onClick={() => setDefaultPage(null)}
                        className="fadaa-btn-ghost fadaa-btn-sm"
                        disabled={!!settingDefault}
                      >
                        {isSetting ? '…' : 'Clear auto-import'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setDefaultPage(page.id)}
                        disabled={!!settingDefault}
                        className="fadaa-btn-ghost fadaa-btn-sm"
                      >
                        {isSetting ? '…' : 'Set auto-import'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {connected && (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            background: 'rgba(100,116,139,0.06)',
            border: '1px solid rgba(100,116,139,0.15)',
            borderRadius: 8,
          }}
        >
          <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            Add page by ID (Business Manager pages)
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="fadaa-input"
              style={{ flex: '1 1 200px', minWidth: 0, fontSize: 13 }}
              placeholder="Facebook Page ID (numbers only)"
              value={addPageId}
              onChange={(event) => setAddPageId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addPageManually()
              }}
            />
            <button
              onClick={addPageManually}
              disabled={addingPage || !addPageId.trim()}
              className="fadaa-btn"
              style={{ flexShrink: 0, fontSize: 12, padding: '8px 16px' }}
            >
              {addingPage ? '…' : 'Add Page'}
            </button>
          </div>
          {addResult && (
            <div style={{ marginTop: 8 }}>
              {addResult.ok ? (
                <p style={{ color: '#4ADE80', fontSize: 12 }}>
                  Added <strong>{addResult.page?.name}</strong> (ID: {addResult.page?.id}) and subscribed it to leadgen.
                </p>
              ) : (
                <div>
                  <p style={{ color: '#F87171', fontSize: 12 }}>{addResult.error}</p>
                  {addResult.hint && (
                    <p style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>{addResult.hint}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <p style={{ color: '#FCD34D', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
            Refresh Access Token
          </p>
          <p style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>
            If webhooks stopped working or the health shows &quot;broken&quot;, your token has likely expired.
            Paste a fresh Meta user token below — the system will exchange it for a long-lived token,
            fetch all page tokens, and re-subscribe each page to leadgen events automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="fadaa-input"
            style={{ flex: '1 1 260px', minWidth: 0, fontSize: 13 }}
            placeholder="Paste Meta user access token here…"
            value={refreshTokenInput}
            onChange={(e) => setRefreshTokenInput(e.target.value)}
          />
          <button
            onClick={refreshTokenFn}
            disabled={refreshing || !refreshTokenInput.trim()}
            className="fadaa-btn"
            style={{ flexShrink: 0, fontSize: 12, padding: '8px 16px' }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh Token'}
          </button>
        </div>
        {refreshResult && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: refreshResult.ok ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${refreshResult.ok ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {refreshResult.ok ? (
              <div>
                <p style={{ color: '#4ADE80', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Token refreshed — {refreshResult.pages_count} page(s) reconnected and subscribed to leadgen.
                </p>
                {(refreshResult.subscriptions ?? []).map((s) => (
                  <p key={s.page} style={{ color: s.ok ? '#94A3B8' : '#F87171', fontSize: 12 }}>
                    {s.ok ? '✓' : '✕'} {s.page}{s.error ? ` — ${s.error}` : ''}
                  </p>
                ))}
                {refreshResult.app_level_ok === false && (
                  <p style={{ color: '#F59E0B', fontSize: 12, marginTop: 4 }}>
                    App-level webhook subscription was not updated (META_APP_SECRET not set in Vercel env).
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: '#F87171', fontSize: 13 }}>{refreshResult.error}</p>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          background: 'rgba(79,142,247,0.06)',
          border: '1px solid rgba(79,142,247,0.15)',
          borderRadius: 10,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
            Import last 30 days
          </p>
          <p style={{ color: '#64748B', fontSize: 12 }}>
            Use this to backfill missed Meta leads. The import shares the same idempotent pipeline as webhooks and cron repair.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedPageId}
            onChange={(event) => setSelectedPageId(event.target.value)}
            disabled={!connected || importing}
            style={{
              flex: '1 1 200px',
              minWidth: 0,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: '#0F1629',
              color: '#E2E8F0',
              border: '1px solid #1E2D4A',
              cursor: !connected || importing ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="all">All pages ({pages.length})</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
                {page.id === defaultPageId ? ' (auto-import)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={importLeads}
            disabled={importing || !connected}
            className="fadaa-btn"
            style={{ flexShrink: 0 }}
          >
            {importing ? 'Importing…' : 'Import Now'}
          </button>
        </div>

        {importResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: importResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${importResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}` }}>
            {importResult.error ? (
              <p style={{ color: '#F87171', fontSize: 13 }}>{importResult.error}</p>
            ) : (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <p style={{ color: '#4ADE80', fontSize: 13 }}>
                  <strong>{importResult.imported}</strong> imported
                </p>
                <p style={{ color: '#E2E8F0', fontSize: 13 }}>
                  <strong>{importResult.updated}</strong> repaired
                </p>
                <p style={{ color: '#64748B', fontSize: 13 }}>
                  <strong>{importResult.failed}</strong> failed
                </p>
                <p style={{ color: '#64748B', fontSize: 13 }}>
                  <strong>{importResult.total}</strong> scanned
                </p>
              </div>
            )}
          </div>
        )}

        {syncResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: syncResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(79,142,247,0.08)', border: `1px solid ${syncResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(79,142,247,0.2)'}` }}>
            {syncResult.error ? (
              <p style={{ color: '#F87171', fontSize: 13 }}>{syncResult.error}</p>
            ) : (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <p style={{ color: '#7CB9FC', fontSize: 13 }}>
                  Repair sync scanned <strong>{syncResult.total}</strong> lead(s)
                </p>
                <p style={{ color: '#E2E8F0', fontSize: 13 }}>
                  {new Date(syncResult.since).toLocaleString()} → {new Date(syncResult.until).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!connected ? (
          <a
            href={metaOAuthUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: '#1877F2',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 16 }}>f</span>
            Connect Facebook
          </a>
        ) : (
          <>
            <a
              href={metaOAuthUrl}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 13,
                background: 'rgba(24,119,242,0.1)',
                color: '#60A5FA',
                border: '1px solid rgba(24,119,242,0.2)',
                textDecoration: 'none',
              }}
            >
              Reconnect
            </a>
            <button
              onClick={disconnect}
              disabled={disconnecting}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 13,
                background: 'rgba(239,68,68,0.1)',
                color: '#F87171',
                border: '1px solid rgba(239,68,68,0.2)',
                cursor: 'pointer',
              }}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        )}
      </div>

      {(data?.logs ?? []).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Recent Activity
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(data?.logs ?? []).slice(0, 8).map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 0',
                  borderBottom: '1px solid #1E2D4A',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color:
                      log.status === 'success'
                        ? '#4ADE80'
                        : log.status === 'error'
                          ? '#F87171'
                          : log.status === 'warning'
                            ? '#F59E0B'
                            : '#94A3B8',
                  }}
                >
                  {log.status === 'success'
                    ? '✓'
                    : log.status === 'error'
                      ? '✕'
                      : log.status === 'warning'
                        ? '!'
                        : '○'}
                </span>
                <p style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>
                  {log.event_type?.replace(/_/g, ' ')}
                  {log.error_message && <span style={{ color: '#F87171' }}> — {log.error_message}</span>}
                </p>
                <p style={{ color: '#475569', fontSize: 11 }}>{formatDateTime(log.created_at)}</p>
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
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#1E2D4A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ color: '#E2E8F0', fontSize: 15, fontWeight: 700 }}>{name}</p>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(245,158,11,0.1)',
                color: '#F59E0B',
                fontWeight: 600,
              }}
            >
              Coming soon
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>{desc}</p>
        </div>
      </div>
    </div>
  )
}

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const connectedParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  return (
    <SalesShell>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>Integrations</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            Connect external tools to automate your sales workflow and keep admins informed when intake breaks.
          </p>
        </div>

        <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Lead Sources
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <MetaCard connectedParam={connectedParam} errorParam={errorParam} />
        </div>

        <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Calendar & Meetings
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <ComingSoonCard icon="📅" name="Google Calendar" desc="Auto-create calendar events when meetings are scheduled" />
        </div>

        <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Messaging
        </p>
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
