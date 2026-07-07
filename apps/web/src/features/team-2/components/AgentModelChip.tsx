'use client'

import { agentModelId, resolveAgentModelDisplay } from '@/lib/agents/model-strategies'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { cn } from '@/lib/utils/cn'

interface AgentModelChipProps {
  agent?: Pick<MissionAgent, 'config'>
  modelId?: string
  modelOptions?: ReadonlyArray<{ id: string; label: string }>
  className?: string
}

export function AgentModelChip({
  agent,
  modelId: modelIdProp,
  modelOptions,
  className,
}: AgentModelChipProps) {
  const modelId = modelIdProp ?? (agent ? agentModelId(agent) : 'auto')
  const { label } = resolveAgentModelDisplay(modelId, modelOptions)

  return (
    <span className={cn('body-4 text-muted-foreground min-w-0 truncate', className)}>{label}</span>
  )
}
