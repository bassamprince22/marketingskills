'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/WorkspaceSwitcher'
import { VideoUploadCard } from '@/components/VideoUploadCard'
import type { ContentQueueRow } from '@/lib/supabase'

export function UploadsClient() {
  const { workspaceId } = useWorkspace()
  const [slots, setSlots] = useState<ContentQueueRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSlots = () => {
    if (!workspaceId) return
    setLoading(true)
    fetch(`/api/queue?workspace_id=${workspaceId}&video_type=real-video&status=pending`)
      .then((r) => r.json())
      .then((d) => setSlots(d.rows ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlots() }, [workspaceId])

  async function submitVideo(id: string, videoUrl: string) {
    await fetch('/api/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, video_url: videoUrl, status: 'ready' }),
    })
    fetchSlots()
  }

  async function skipSlot(id: string) {
    await fetch('/api/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, video_type: 'ai-broll', status: 'pending' }),
    })
    fetchSlots()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Real Video Uploads</h1>
        <span className="text-sm text-slate-500">{slots.length} slot{slots.length !== 1 ? 's' : ''} pending</span>
      </div>

      {slots.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
          No real-video slots waiting. When Zap 3 assigns <code>real-video</code> to a trend, it will appear here.
        </div>
      ) : (
        <div className="grid gap-4">
          {slots.map((slot) => (
            <VideoUploadCard
              key={slot.id}
              slot={slot}
              onSubmit={(url) => submitVideo(slot.id, url)}
              onSkip={() => skipSlot(slot.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
