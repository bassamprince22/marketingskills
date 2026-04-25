'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SalesShell } from '@/components/sales/SalesShell'

type Template = { id: string; proposal_number: string; title: string; category: string; updated_at: string }

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    let active = true
    setError('')
    setLoading(true)

    fetch('/api/sales/proposals?template=1')
      .then(async response => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          const message = [payload?.error, payload?.details].filter(Boolean).join(' ')
          throw new Error(message || `Failed to load templates (${response.status})`)
        }
        if (!Array.isArray(payload)) throw new Error('Unexpected templates response.')
        return payload
      })
      .then(data => {
        if (active) setTemplates(data)
      })
      .catch(err => {
        if (!active) return
        setTemplates([])
        setError(err instanceof Error ? err.message : 'Failed to load templates.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function createTemplate() {
    try {
      setCreating(true)
      setError('')
      const res = await fetch('/api/sales/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Template', is_template: true, status: 'draft' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = [data?.error, data?.details].filter(Boolean).join(' ')
        throw new Error(message || `Failed to create template (${res.status})`)
      }
      if (!data?.id) throw new Error('Template was created but the server did not return an id.')
      router.push(`/sales/proposals/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <SalesShell>
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposal Templates</h1>
          <p className="mt-1 text-sm text-white/50">Reusable starting points for new proposals</p>
        </div>
        <button
          onClick={createTemplate}
          disabled={creating}
          className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:opacity-60"
        >
          {creating ? 'Creating...' : '+ New Template'}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <p className="font-semibold text-red-100">Proposal setup needs attention</p>
          <p className="mt-1 leading-relaxed">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-white/30">Loading...</p>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-white/30">No templates yet.</p>
          <button onClick={createTemplate} disabled={creating} className="mt-3 text-sm text-purple-400 hover:text-purple-300">
            Create your first template -&gt;
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => router.push(`/sales/proposals/${t.id}`)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-purple-500/30 hover:bg-white/[0.05]"
            >
              <div className="mb-3 text-2xl">DOC</div>
              <h3 className="font-semibold text-white">{t.title}</h3>
              <p className="mt-1 text-xs text-white/40 capitalize">{t.category} - Updated {new Date(t.updated_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
    </SalesShell>
  )
}
