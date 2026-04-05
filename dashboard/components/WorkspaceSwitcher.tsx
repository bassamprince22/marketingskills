'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Workspace } from '@/lib/supabase'

interface WorkspaceCtx {
  workspaceId: string | null
  setWorkspaceId: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceCtx>({ workspaceId: null, setWorkspaceId: () => {} })

export function useWorkspace() {
  return useContext(WorkspaceContext)
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(null)

  function setWorkspaceId(id: string) {
    setWorkspaceIdState(id)
    localStorage.setItem('selected_workspace', id)
  }

  useEffect(() => {
    const stored = localStorage.getItem('selected_workspace')
    if (stored) {
      setWorkspaceIdState(stored)
    } else {
      // auto-select first workspace
      fetch('/api/workspaces')
        .then((r) => r.json())
        .then((d) => {
          const first = d.workspaces?.[0]
          if (first) setWorkspaceId(first.id)
        })
    }
  }, [])

  return (
    <WorkspaceContext.Provider value={{ workspaceId, setWorkspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function WorkspaceSwitcher() {
  const { workspaceId, setWorkspaceId } = useWorkspace()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((d) => setWorkspaces(d.workspaces ?? []))
  }, [])

  if (workspaces.length <= 1) return null

  const current = workspaces.find((w) => w.id === workspaceId)

  return (
    <select
      value={workspaceId ?? ''}
      onChange={(e) => setWorkspaceId(e.target.value)}
      className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      {workspaces.map((ws) => (
        <option key={ws.id} value={ws.id}>
          {ws.name}
        </option>
      ))}
    </select>
  )
}
