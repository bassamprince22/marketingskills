'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/WorkspaceSwitcher'
import { StatCard } from '@/components/StatCard'
import { PillarChart } from '@/components/PillarChart'
import { ContentTypeChart } from '@/components/ContentTypeChart'
import type { ContentQueueRow, Trend } from '@/lib/supabase'

interface Stats {
  scheduledThisWeek: number
  totalViews7d: number
  avgEngagement: number
  trendsToday: number
  automationEnabled: boolean
  lastRunAt: string | null
}

const PILLAR_COLORS: Record<string, string> = {
  'Growth Tactics': '#6366f1',
  'Building in Public': '#8b5cf6',
  'Industry Insights': '#a78bfa',
  'Hot Takes': '#c4b5fd',
  'Personal': '#ddd6fe',
}

export function OverviewClient() {
  const { workspaceId } = useWorkspace()
  const [queue, setQueue] = useState<ContentQueueRow[]>([])
  const [trends, setTrends] = useState<Trend[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/queue?workspace_id=${workspaceId}`).then((r) => r.json()),
      fetch(`/api/trends?workspace_id=${workspaceId}&limit=5`).then((r) => r.json()),
      fetch(`/api/analytics?workspace_id=${workspaceId}`).then((r) => r.json()),
    ])
      .then(([queueData, trendsData, analyticsData]) => {
        setQueue(queueData.rows ?? [])
        setTrends(trendsData.trends ?? [])
        setStats(analyticsData.stats ?? null)
      })
      .finally(() => setLoading(false))
  }, [workspaceId])

  const pendingUploads = queue.filter((r) => r.video_type === 'real-video' && r.status === 'pending')

  // Pillar breakdown from recent queue
  const pillarCounts: Record<string, number> = {}
  trends.slice(0, 20).forEach((t) => {
    pillarCounts[t.pillar] = (pillarCounts[t.pillar] ?? 0) + 1
  })
  const pillarData = Object.entries(pillarCounts).map(([name, value]) => ({
    name,
    value,
    fill: PILLAR_COLORS[name] ?? '#94a3b8',
  }))

  // Content type breakdown from queue
  const typeCounts: Record<string, number> = {}
  queue.forEach((r) => {
    typeCounts[r.content_type] = (typeCounts[r.content_type] ?? 0) + 1
  })
  const contentTypeData = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        {stats && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              stats.automationEnabled
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${stats.automationEnabled ? 'bg-green-500' : 'bg-slate-400'}`}
            />
            {stats.automationEnabled ? 'Automation running' : 'Automation paused'}
            {stats.lastRunAt && (
              <span className="text-slate-500 font-normal">
                {' '}· last run {new Date(stats.lastRunAt).toLocaleDateString()}
              </span>
            )}
          </span>
        )}
      </div>

      {pendingUploads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            <span className="font-medium">{pendingUploads.length} real video slot{pendingUploads.length > 1 ? 's' : ''}</span>{' '}
            waiting for your footage — uploads expire in 24h
          </p>
          <a href="/uploads" className="text-sm font-medium text-amber-700 hover:text-amber-900 underline">
            Upload now →
          </a>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scheduled this week" value={stats?.scheduledThisWeek ?? 0} />
        <StatCard label="Total views (7d)" value={stats?.totalViews7d?.toLocaleString() ?? '—'} />
        <StatCard label="Avg engagement" value={stats ? `${stats.avgEngagement.toFixed(1)}%` : '—'} />
        <StatCard label="Trends today" value={stats?.trendsToday ?? 0} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Pillar Distribution (this week)</h2>
          {pillarData.length > 0 ? (
            <PillarChart data={pillarData} />
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Content Type Breakdown</h2>
          {contentTypeData.length > 0 ? (
            <ContentTypeChart data={contentTypeData} />
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
          )}
        </div>
      </div>

      {/* Recent trends */}
      {trends.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Trends Processed</h2>
          <ul className="space-y-2">
            {trends.map((t) => (
              <li key={t.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 whitespace-nowrap">
                  {t.pillar}
                </span>
                <span className="text-slate-700">{t.our_angle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
