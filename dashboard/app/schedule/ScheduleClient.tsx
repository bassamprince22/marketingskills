'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/WorkspaceSwitcher'
import { QueueTable } from '@/components/QueueTable'
import type { BufferUpdate } from '@/lib/buffer'

export function ScheduleClient() {
  const { workspaceId } = useWorkspace()
  const [updates, setUpdates] = useState<BufferUpdate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUpdates = () => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/buffer/queue?workspace_id=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setUpdates(d.updates ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUpdates() }, [workspaceId])

  async function cancelUpdate(id: string) {
    await fetch('/api/buffer/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: id, workspace_id: workspaceId }),
    })
    fetchUpdates()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading queue...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
        <span className="text-sm text-slate-500">{updates.length} post{updates.length !== 1 ? 's' : ''} queued</span>
      </div>

      {updates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
          No scheduled posts. The automation will populate this once Zap 4 runs.
        </div>
      ) : (
        <QueueTable updates={updates} onCancel={cancelUpdate} />
      )}
    </div>
  )
}
