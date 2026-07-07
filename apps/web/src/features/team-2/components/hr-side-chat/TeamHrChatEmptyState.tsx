'use client'

import { Bot } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team'

function buildTeamHrChatGreeting(agent: TeamRosterEntry): string {
  const role = agent.role_label?.trim() || 'HR Manager'
  return `I'm your ${role}. Describe the agent you want to hire, or ask about skills, assignments, and team setup.`
}

interface TeamHrChatEmptyStateProps {
  agent: TeamRosterEntry
  greeting?: string
}

export function TeamHrChatEmptyState({ agent, greeting }: TeamHrChatEmptyStateProps) {
  const resolvedGreeting = greeting ?? buildTeamHrChatGreeting(agent)
  const roleLabel = agent.role_label?.trim() || 'HR Manager'

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <div className="mb-spacing-4 h-spacing-16 w-spacing-16 shrink-0 overflow-hidden rounded-full">
        {agent.avatar_url ? (
          <img src={agent.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="bg-secondary text-muted-foreground flex h-full w-full items-center justify-center">
            <Bot className="h-8 w-8" aria-hidden />
          </span>
        )}
      </div>
      <p className="body-1 text-foreground text-center font-semibold">{agent.display_name}</p>
      <p className="body-4 text-muted-foreground mt-spacing-1 text-center">{roleLabel}</p>
      <p className="body-3 text-muted-foreground mt-spacing-4 max-w-md text-center">
        {resolvedGreeting}
      </p>
    </div>
  )
}
