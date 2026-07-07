'use client'

import { Plus } from 'lucide-react'
import type { MissionAgent } from '@/lib/agents'

function AgentPreviewTile({ agent }: { agent: MissionAgent }) {
  if (agent.image_url) {
    return <img src={agent.image_url} alt="" className="h-full w-full object-cover" />
  }
  return (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <span className="title-h4 text-muted-foreground">{agent.name.slice(0, 1).toUpperCase()}</span>
    </div>
  )
}

function AddAgentBrainCardHero({ agents, count }: { agents: MissionAgent[]; count: number }) {
  const preview = agents.slice(0, 4)

  return (
    <>
      <div className="rounded-t-spacing-3 absolute inset-0 overflow-hidden">
        {preview.length <= 1 ? (
          preview[0] ? (
            <AgentPreviewTile agent={preview[0]} />
          ) : (
            <div className="bg-muted flex h-full w-full items-center justify-center">
              <Plus className="icon-md text-muted-foreground" />
            </div>
          )
        ) : (
          <div className="grid h-full w-full grid-cols-2">
            {preview.map((agent) => (
              <div key={agent.id} className="relative min-h-0 overflow-hidden">
                <AgentPreviewTile agent={agent} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="surface-card border-subtle body-4 text-foreground rounded-spacing-2 absolute bottom-2 right-2 z-10 flex items-center gap-1 border px-1.5 py-0.5 font-semibold shadow-sm">
        <Plus className="h-3 w-3 shrink-0" />
        <span className="tabular-nums">{count}</span>
      </div>
    </>
  )
}

export function BrainHomeAddAgentCard({
  agents,
  count,
  onClick,
}: {
  agents: MissionAgent[]
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-subtle group/add-agent-card rounded-spacing-3 hover:bg-hover-subtle flex w-full cursor-pointer flex-col overflow-hidden border border-dashed text-left transition-opacity hover:opacity-95"
    >
      <div className="bg-muted rounded-t-spacing-3 relative aspect-square w-full overflow-hidden">
        <AddAgentBrainCardHero agents={agents} count={count} />
      </div>
      <div className="gap-spacing-1 rounded-b-spacing-3 p-spacing-2 flex min-h-0 flex-1 flex-col">
        <span className="body-2 text-foreground font-medium">Add agent brain</span>
        <p className="body-4 text-muted-foreground line-clamp-2">
          {count} agent{count === 1 ? '' : 's'} ready
        </p>
      </div>
    </button>
  )
}
