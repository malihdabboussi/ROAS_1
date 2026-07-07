'use client'

import { Bot } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

const DEFAULT_SPACE_CHAT_AGENT_KEY = 'vibey'

function buildSpaceChatAgentGreeting(agent: TeamRosterEntry): string {
  const key = agent.agent_key ?? DEFAULT_SPACE_CHAT_AGENT_KEY

  if (key === DEFAULT_SPACE_CHAT_AGENT_KEY) {
    return 'I see this space with docs, artifacts, and views so we can ship in one flow.'
  }

  const role = agent.role_label?.trim()
  if (role) {
    return `I'm your ${role} in this space. Tell me what we're building and I'll take it from here.`
  }

  const specialty = agent.specialties?.[0]?.trim()
  if (specialty) {
    return `I'm here for ${specialty.toLowerCase()} in this space. What should we tackle first?`
  }

  return "I'm ready in this space. Point me at the work and we'll move."
}

interface SpaceChatAgentEmptyStateProps {
  agent: TeamRosterEntry
}

export function SpaceChatAgentEmptyState({ agent }: SpaceChatAgentEmptyStateProps) {
  const greeting = buildSpaceChatAgentGreeting(agent)

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <div className="mb-spacing-4 h-spacing-16 w-spacing-16 shrink-0 overflow-hidden rounded-full">
        {agent.avatar_url ? (
          <img src={agent.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-violet-500/20 text-violet-300">
            <Bot className="h-8 w-8" aria-hidden />
          </span>
        )}
      </div>
      <p className="body-1 text-foreground text-center font-semibold">{agent.display_name}</p>
      {agent.role_label ? (
        <p className="body-4 text-muted-foreground mt-spacing-1 text-center">{agent.role_label}</p>
      ) : null}
      <p className="body-3 text-muted-foreground mt-spacing-4 max-w-md text-center">{greeting}</p>
    </div>
  )
}

export function resolveSpaceChatEmptyStateAgent(
  agents: TeamRosterEntry[],
  activeAgentKey: string,
  fallback: TeamRosterEntry,
): TeamRosterEntry {
  return agents.find((entry) => entry.agent_key === activeAgentKey) ?? fallback
}
