'use client'

import type { AgentStatus, MissionAgent } from '../types'

interface AgentStatusPanelProps {
  agents: MissionAgent[]
}

const STATUS_DOT: Record<AgentStatus, string> = {
  online: 'bg-emerald-400',
  idle: 'bg-blue-400',
  working: 'bg-amber-400',
  offline: 'bg-zinc-500',
}

export function AgentStatusPanel({ agents }: AgentStatusPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {agents.map((agent) => (
        <div key={agent.id} className="surface-card border-subtle rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="body-2 text-foreground font-medium">{agent.name}</p>
            <span className="body-4 text-muted-foreground inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[agent.status]}`} />
              {agent.status}
            </span>
          </div>
          <p className="body-4 text-muted-foreground">{agent.role}</p>
        </div>
      ))}
    </div>
  )
}
