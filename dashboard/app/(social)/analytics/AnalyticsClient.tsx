'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/WorkspaceSwitcher'
import { PlatformChart } from '@/components/PlatformChart'
import type { AnalyticsSnapshot } from '@/lib/supabase'

const PLATFORMS = ['tiktok', 'instagram', 'linkedin', 'twitter', 'youtube', 'facebook']

export function AnalyticsClient() {
  const { workspaceId } = useWorkspace()
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/analytics?workspace_id=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setSnapshots(d.snapshots ?? []))
      .finally(() => setLoading(false))
  }, [workspaceId])

  const latest = snapshots[0]

  const platformData = PLATFORMS.map((p) => ({
    platform: p,
    views: latest?.platform_metrics?.[p]?.views ?? 0,
    likes: latest?.platform_metrics?.[p]?.likes ?? 0,
    comments: latest?.platform_metrics?.[p]?.comments ?? 0,
  }))

  const pillarData = latest
    ? Object.entries(latest.pillar_performance ?? {}).map(([pillar, engagement]) => ({
        pillar,
        engagement: engagement as number,
      }))
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>

      {!latest ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
          No analytics data yet. Zap 5 runs every Monday morning to populate this page.
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Views & Likes by Platform — week of {latest.week_start}
            </h2>
            <PlatformChart data={platformData} />
          </div>

          {pillarData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Pillar Engagement Rate</h2>
              <div className="space-y-3">
                {pillarData
                  .sort((a, b) => b.engagement - a.engagement)
                  .map(({ pillar, engagement }) => (
                    <div key={pillar} className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 w-40 shrink-0">{pillar}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-violet-500 h-2 rounded-full"
                          style={{ width: `${Math.min(engagement * 10, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-500 w-12 text-right">{engagement.toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {latest.top_posts?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Posts (last 7d)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Platform</th>
                    <th className="pb-2 font-medium">Pillar</th>
                    <th className="pb-2 font-medium text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {latest.top_posts.map((post: { id: string; platform: string; pillar: string; views: number }) => (
                    <tr key={post.id}>
                      <td className="py-2 capitalize text-slate-700">{post.platform}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700">
                          {post.pillar}
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-700">{post.views.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
