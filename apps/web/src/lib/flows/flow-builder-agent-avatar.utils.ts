import type { AutomationAction } from '@/features/spaces/types/space-schema'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

function agentAvatarFromRoster(
  roster: TeamRosterEntry[],
  agentKey: string | null | undefined,
): string | null {
  if (!agentKey?.trim()) return null
  return (
    roster.find((row) => row.kind === 'agent' && row.agent_key === agentKey)?.avatar_url ?? null
  )
}

export function resolveAgentKeyFromAction(action: AutomationAction): string | null {
  switch (action.type) {
    case 'send_to_agent':
      return action.agent_key?.trim() || null
    case 'agent_suggest_tasks':
      return action.agent_key?.trim() || null
    case 'send_to_agents':
      return action.agent_tasks?.[0]?.agent_key?.trim() || null
    default:
      return null
  }
}

export function getActionAgentAvatarSrc(
  action: AutomationAction,
  roster: TeamRosterEntry[],
): string | null {
  return agentAvatarFromRoster(roster, resolveAgentKeyFromAction(action))
}
