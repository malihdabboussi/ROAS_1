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
  if (
    pathname.startsWith('/spaces') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/programs')
  )
    return 'spaces'
  if (pathname.startsWith('/brain')) return 'brain'
  if (pathname.startsWith('/team')) return 'team'
  if (pathname.startsWith('/flows')) return 'flows'
  return 'general'
}

export function mergeAttachedWorkContext(
  current: GlobalWorkContext,
  patch: Partial<GlobalWorkContext>,
): GlobalWorkContext {
  if (patch.surface && (patch.surface !== current.surface || patch.surface === 'general')) {
    return { surface: patch.surface, ...patch }
  }
  return { ...current, ...patch }
}

export interface SurfaceRouteRecommendation {
  headline: string
  agentName: string
  body: string
  suggestedAgentKey: string
}

export function routeRecommendation(
  surface: GlobalWorkSurface,
  activeAgentKey: string,
): SurfaceRouteRecommendation | null {
  const suggested = defaultAgentForSurface(surface)
  if (activeAgentKey === suggested) return null
  switch (surface) {
    case 'brain':
      return {
        headline: 'Brain recommends',
        agentName: 'Atlas',
        body: 'Atlas is your Brain Scholar for knowledge and training questions.',
        suggestedAgentKey: 'atlas',
      }
    case 'team':
      return {
        headline: 'HR recommends',
        agentName: 'Jaime',
        body: 'Jaime handles hiring, team structure, and agent staffing on the Team surface.',
        suggestedAgentKey: 'hr',
      }
    case 'spaces':
      return {
        headline: 'Campaigns work best with',
        agentName: 'Pixel',
        body: 'Pixel can read this space and help you ship in one flow.',
        suggestedAgentKey: 'vibey',
      }
    case 'flows':
      return {
        headline: 'Flows recommends',
        agentName: 'Loop',
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

function rosterAgentKey(entry: TeamRosterEntry): string | null {
  return typeof entry.agent_key === 'string' && entry.agent_key.length > 0 ? entry.agent_key : null
}

export function filterAgentsForWorkContext(
  agents: TeamRosterEntry[],
  workContext: GlobalWorkContext,
): TeamRosterEntry[] {
  const agentRows = agents.filter((entry) => entry.kind === 'agent')
  switch (workContext.surface) {
    case 'brain':
      return agentRows.filter((entry) => {
        const agentKey = rosterAgentKey(entry)
        return agentKey !== null && BRAIN_AGENT_KEYS.has(agentKey)
      })
    case 'team':
      return agentRows.filter((entry) => {
        const agentKey = rosterAgentKey(entry)
        return (
          agentKey !== null &&
          (agentKey === GLOBAL_CHAT_DEFAULT_AGENT ||
            TEAM_AGENT_KEYS.has(agentKey) ||
            agentHasDomain(agentKey, 'manage_agents'))
        )
      })
    case 'flows':
      return agentRows.filter((entry) => {
        const agentKey = rosterAgentKey(entry)
        return agentKey !== null && FLOWS_AGENT_KEYS.has(agentKey)
      })
    case 'spaces':
      return agentRows.filter((entry) => {
        const agentKey = rosterAgentKey(entry)
        return agentKey !== null && !SPACES_EXCLUDED_AGENT_KEYS.has(agentKey)
      })
    case 'general':
    default:
      return agentRows.filter((entry) => {
        const agentKey = rosterAgentKey(entry)
        return agentKey !== null && !FLOWS_AGENT_KEYS.has(agentKey)
      })
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
      return (
        agentKey === GLOBAL_CHAT_DEFAULT_AGENT ||
        TEAM_AGENT_KEYS.has(agentKey) ||
        agentHasDomain(agentKey, 'manage_agents')
      )
    case 'flows':
      return FLOWS_AGENT_KEYS.has(agentKey)
    case 'spaces':
      return !SPACES_EXCLUDED_AGENT_KEYS.has(agentKey)
    case 'general':
    default:
      return !FLOWS_AGENT_KEYS.has(agentKey)
  }
}

/** Mid-conversation campaign+brain soft prompt — not at chat start. */
export const CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS = 3
export const CAMPAIGN_BRAIN_NUDGE_MESSAGES = {
  prompt: 'This chat seems useful. Save it to a campaign',
  actionLabel: 'Save this chat to a campaign',
  dismissLabel: 'Dismiss campaign suggestion',
} as const

export function countUserMessageTurns(messages: ReadonlyArray<{ role?: string | null }>): number {
  return messages.filter((message) => message.role === 'user').length
}

export function shouldOfferCampaignBrainNudge(input: {
  surface: GlobalWorkSurface
  campaignId?: string | null
  spaceId?: string | null
  userTurnCount: number
  minUserTurns?: number
  dismissed?: boolean
}): boolean {
  if (input.dismissed) return false
  if (input.surface !== 'general') return false
  if (typeof input.campaignId === 'string' && input.campaignId.trim().length > 0) return false
  if (typeof input.spaceId === 'string' && input.spaceId.trim().length > 0) return false
  const minTurns = input.minUserTurns ?? CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS
  return input.userTurnCount >= minTurns
}
