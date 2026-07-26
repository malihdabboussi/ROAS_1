'use client'

import { Bot } from 'lucide-react'
import type { ShellChatQuickStart } from '@/components/shell/shell-empty-chat-prompts.config'
import { ShellEmptyChatCapabilityScroller } from '@/components/shell/ShellEmptyChatCapabilityScroller'
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
  /** When true, show capability chips under the hero (hidden once composer has text). */
  showCapabilities?: boolean
  onSelectCapability?: (quickStart: ShellChatQuickStart) => void
}

export function SpaceChatAgentEmptyState({
  agent,
  showCapabilities = false,
  onSelectCapability,
}: SpaceChatAgentEmptyStateProps) {
  const heroTitle = agent.display_name
  const heroAvatar = agent.avatar_url
  const showAgentRole = Boolean(agent.role_label)
  // Default agent (Pixel) keeps the hero to name + capabilities — no long greeting.
  const greeting =
    agent.agent_key === DEFAULT_SPACE_CHAT_AGENT_KEY ? null : buildSpaceChatAgentGreeting(agent)

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="mb-spacing-4 h-spacing-16 w-spacing-16 shrink-0 overflow-hidden rounded-full">
        {heroAvatar ? (
          <img src={heroAvatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="bg-primary/20 text-primary flex h-full w-full items-center justify-center">
            <Bot className="icon-lg" aria-hidden />
          </span>
        )}
      </div>
      <p className="body-1 text-foreground text-center font-semibold">{heroTitle}</p>
      {showAgentRole ? (
        <p className="body-4 text-muted-foreground mt-spacing-1 text-center">{agent.role_label}</p>
      ) : null}
      {greeting ? (
        <p className="body-3 text-muted-foreground mt-spacing-4 max-w-md text-center">{greeting}</p>
      ) : null}
      {showCapabilities && onSelectCapability ? (
        <div className="mt-spacing-6 w-full max-w-3xl">
          <ShellEmptyChatCapabilityScroller onSelect={onSelectCapability} />
        </div>
      ) : null}
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
