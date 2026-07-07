'use client'

import type { MissionAgent } from '@/features/mission-control/types'
import { SkillAgentAvatar } from './skill-agent-avatar'

export function OtherAgentsSubmenuList({
  agents,
  sourceAgentKey,
  rowClassName,
  onPick,
  emptyMessage = 'No other agents',
}: {
  agents: MissionAgent[]
  sourceAgentKey: string
  rowClassName: string
  onPick: (agentKey: string) => void
  emptyMessage?: string
}) {
  const targets = agents.filter((a) => a.agent_key !== sourceAgentKey)

  if (targets.length === 0) {
    return (
      <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">{emptyMessage}</p>
    )
  }

  return (
    <>
      {targets.map((agent) => (
        <button
          key={agent.agent_key}
          type="button"
          onClick={() => onPick(agent.agent_key)}
          className={rowClassName}
        >
          <SkillAgentAvatar agent={agent} className="h-4 w-4" />
          <span className="min-w-0 flex-1 truncate">{agent.name}</span>
        </button>
      ))}
    </>
  )
}
