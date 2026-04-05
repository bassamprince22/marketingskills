'use client'

import { useState } from 'react'
import type { BufferUpdate } from '@/lib/buffer'
import { CarouselPreview } from './CarouselPreview'

const SERVICE_COLORS: Record<string, string> = {
  twitter: 'bg-sky-50 text-sky-700',
  linkedin: 'bg-blue-50 text-blue-700',
  instagram: 'bg-pink-50 text-pink-700',
  tiktok: 'bg-slate-100 text-slate-700',
  youtube: 'bg-red-50 text-red-700',
  facebook: 'bg-blue-50 text-blue-700',
}

interface QueueTableProps {
  updates: BufferUpdate[]
  onCancel: (id: string) => void
}

export function QueueTable({ updates, onCancel }: QueueTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewSlides, setPreviewSlides] = useState<string[] | null>(null)

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium">Content</th>
              <th className="px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3 font-medium">Media</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {updates.map((u) => {
              const isExpanded = expandedId === u.id
              const date = new Date(u.scheduled_at * 1000)
              const hasCarousel = Array.isArray(u.media) && (u.media as unknown as { photo: string }[]).length > 1

              return (
                <>
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          SERVICE_COLORS[u.profile_service] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.profile_service}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-slate-700">{u.text}</p>
                      {hasCarousel && (
                        <button
                          onClick={() => setPreviewSlides((u.media as unknown as { photo: string }[]).map((m) => m.photo))}
                          className="text-xs text-violet-600 hover:text-violet-800 mt-0.5"
                        >
                          View carousel slides →
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      {u.media && (
                        <span className="text-xs text-slate-500">
                          {(u.media as { video?: string }).video ? 'Video' : 'Image'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : u.id)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                        <button
                          onClick={() => onCancel(u.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${u.id}-expanded`}>
                      <td colSpan={5} className="px-4 pb-4 pt-0">
                        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                          {u.text}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {previewSlides && (
        <CarouselPreview slides={previewSlides} onClose={() => setPreviewSlides(null)} />
      )}
    </>
  )
}
