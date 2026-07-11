import { WEB_SYSTEM_AGENT_CONTRACTS } from '@/lib/agents/system-agent-contracts'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { GlobalWorkContext, GlobalWorkSurface } from '../lib/global-chat-storage'

export const GLOBAL_CHAT_DEFAULT_AGENT = 'vibey'

const BRAIN_AGENT_KEYS = new Set(['atlas', 'brain_scholar'])
const TEAM_AGENT_KEYS = new Set(['hr'])
const FLOWS_AGENT_KEYS = new Set(['loop'])
const SPACES_EXCLUDED_AGENT_KEYS = new Set(['loop'])

export function defaultAgentForSurface(surface: GlobalWorkSurface): string {
  switch (surface) {
    case 'brain':
      return 'atlas'
    case 'team':
      return 'hr'
    case 'flows':
      return 'loop'
    case 'spaces':
    case 'general':
    default:
      return GLOBAL_CHAT_DEFAULT_AGENT
  }
}

export function surfaceFromPathname(pathname: string): GlobalWorkSurface {
  if (pathname.startsWith('/spaces')) return 'spaces'
  if (pathname.startsWith('/brain')) return 'brain'
  if (pathname.startsWith('/team')) return 'team'
  if (pathname.startsWith('/flows')) return 'flows'
  return 'general'
}

export function routeRecommendation(
  surface: GlobalWorkSurface,
  activeAgentKey: string,
): { title: string; body: string; suggestedAgentKey: string } | null {
  const suggested = defaultAgentForSurface(surface)
  if (activeAgentKey === suggested) return null
  switch (surface) {
    case 'brain':
      return {
        title: 'Brain recommends Atlas',
        body: 'Atlas is your Brain Scholar for knowledge and training questions.',
        suggestedAgentKey: 'atlas',
      }
    case 'team':
      return {
        title: 'Team recommends Jaime',
        body: 'Jaime can help with hiring, skills, and team setup.',
        suggestedAgentKey: 'hr',
      }
    case 'spaces':
      return {
        title: 'Spaces work best with Vibey',
        body: 'Vibey can read this space and help you ship in one flow.',
        suggestedAgentKey: 'vibey',
      }
    case 'flows':
      return {
        title: 'Flows recommends Loop',
        body: 'Loop helps you build and inspect automations.',
        suggestedAgentKey: 'loop',
      }
    default:
      return null
  }
}

function agentHasDomain(agentKey: string, domain: string): boolean {
  const contract = WEB_SYSTEM_AGENT_CONTRACTS[agentKey]
  return contract?.platformDomains.includes(domain as never) ?? false
}

export function filterAgentsForWorkContext(
  agents: TeamRosterEntry[],
  workContext: GlobalWorkContext,
): TeamRosterEntry[] {
  const agentRows = agents.filter((entry) => entry.kind === 'agent')
  switch (workContext.surface) {
    case 'brain':
      return agentRows.filter((entry) => BRAIN_AGENT_KEYS.has(entry.agent_key))
    case 'team':
      return agentRows.filter(
        (entry) =>
          TEAM_AGENT_KEYS.has(entry.agent_key) || agentHasDomain(entry.agent_key, 'manage_agents'),
      )
    case 'flows':
      return agentRows.filter((entry) => FLOWS_AGENT_KEYS.has(entry.agent_key))
    case 'spaces':
      return agentRows.filter((entry) => !SPACES_EXCLUDED_AGENT_KEYS.has(entry.agent_key))
    case 'general':
    default:
      return agentRows.filter((entry) => !FLOWS_AGENT_KEYS.has(entry.agent_key))
  }
}

export function isAgentAllowedForWorkContext(
  agentKey: string,
  workContext: GlobalWorkContext,
): boolean {
  if (agentKey === 'vibey') return true
  switch (workContext.surface) {
    case 'brain':
      return BRAIN_AGENT_KEYS.has(agentKey)
    case 'team':
      return TEAM_AGENT_KEYS.has(agentKey) || agentHasDomain(agentKey, 'manage_agents')
    case 'flows':
      return FLOWS_AGENT_KEYS.has(agentKey)
    case 'spaces':
      return !SPACES_EXCLUDED_AGENT_KEYS.has(agentKey)
    case 'general':
    default:
      return !FLOWS_AGENT_KEYS.has(agentKey)
  }
}

export const WORK_SURFACE_LABELS: Record<GlobalWorkSurface, string> = {
  general: 'General',
  spaces: 'Spaces',
  brain: 'Brain',
  team: 'Team',
  flows: 'Flows',
}
