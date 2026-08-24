'use client'

import type { MissionAgent } from '@/lib/agents'
import { DEFAULT_AGENT_AVATAR_URL, DEFAULT_AGENT_KEY } from '@/lib/team/default-agent-identity'
import { cn } from '@/lib/utils/cn'
import { AgentRoleEmblem } from './AgentRoleEmblem'

export interface AgentAvatarProps {
  agent: Pick<MissionAgent, 'agent_key' | 'image_url'>
  className?: string
}

export function AgentAvatar({ agent, className }: AgentAvatarProps) {
  const shellCls = cn(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
    className,
  )
  // The default agent always renders the lamp mark, even when a generated portrait
  // is stored in agents_registry.image_url (canonical brand identity).
  const imageUrl =
    agent.agent_key === DEFAULT_AGENT_KEY ? DEFAULT_AGENT_AVATAR_URL : agent.image_url

  if (imageUrl) {
    return (
      <span className={shellCls}>
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    )
  }

  return (
    <span className={shellCls}>
      <AgentRoleEmblem roleKey={agent.agent_key} size="sm" />
    </span>
  )
}
