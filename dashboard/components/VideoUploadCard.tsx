'use client'

import { useState } from 'react'
import type { ContentQueueRow } from '@/lib/supabase'

interface VideoUploadCardProps {
  slot: ContentQueueRow
  onSubmit: (videoUrl: string) => void
  onSkip: () => void
}

function getHoursRemaining(createdAt: string) {
  const created = new Date(createdAt).getTime()
  const expiresAt = created + 24 * 60 * 60 * 1000
  const remaining = expiresAt - Date.now()
  return Math.max(0, Math.floor(remaining / (60 * 60 * 1000)))
}

export function VideoUploadCard({ slot, onSubmit, onSkip }: VideoUploadCardProps) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const hoursLeft = getHoursRemaining(slot.created_at)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    await onSubmit(url.trim())
    setSubmitting(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Real video
            </span>
            {hoursLeft > 0 ? (
              <span className="text-xs text-slate-500">{hoursLeft}h remaining</span>
            ) : (
              <span className="text-xs text-red-500 font-medium">Expired — will auto-fallback</span>
            )}
          </div>
          {slot.video_script && (
            <p className="text-sm font-medium text-slate-900 line-clamp-2">{slot.video_script.slice(0, 120)}…</p>
          )}
        </div>
      </div>

      {/* Generated caption preview */}
      {slot.instagram_caption && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
          <p className="text-xs font-medium text-slate-500 mb-1">Generated caption (ready to use)</p>
          <p className="line-clamp-3">{slot.instagram_caption}</p>
        </div>
      )}

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Paste Google Drive, Dropbox, or direct .mp4 URL"
        />
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-40 shrink-0"
        >
          {submitting ? 'Saving...' : 'Upload'}
        </button>
      </form>

      <button
        onClick={onSkip}
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        Skip → use AI b-roll instead
      </button>
    </div>
  )
}
