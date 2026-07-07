'use client'

import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'
import type { MissionAgent } from '@/lib/agents'
import { cn } from '@/lib/utils/cn'
import { AgentRoleEmblem } from './AgentRoleEmblem'

export interface AgentAvatarProps {
  agent: Pick<MissionAgent, 'agent_key' | 'image_url'>
  className?: string
}

export function AgentAvatar({ agent, className }: AgentAvatarProps) {
  const showVibeyAnimation = agent.agent_key === 'vibey' && !agent.image_url
  const shellCls = cn(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
    className,
  )

  if (agent.image_url) {
    return (
      <span className={shellCls}>
        <img
          src={agent.image_url}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    )
  }

  if (showVibeyAnimation) {
    return (
      <span className={cn(shellCls, 'bg-hover-subtle')}>
        <VibeyLoadingSphereSimple size="small" state="idle" showBackground={false} />
      </span>
    )
  }

  return (
    <span className={shellCls}>
      <AgentRoleEmblem roleKey={agent.agent_key} size="sm" />
    </span>
  )
}
