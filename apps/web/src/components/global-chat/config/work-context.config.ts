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
  if (pathname.startsWith('/spaces') || pathname.startsWith('/campaigns')) return 'spaces'
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

export function workContextAttachmentLabel(
  workContext: GlobalWorkContext,
  spaceTitle?: string | null,
): string | null {
  if (workContext.channelId) {
    return workContext.channelName?.trim() || 'Slack channel'
  }

  switch (workContext.surface) {
    case 'spaces':
      return spaceTitle?.trim() || WORK_SURFACE_LABELS.spaces
    case 'brain':
      return workContext.brainScopeLabel?.trim() || WORK_SURFACE_LABELS.brain
    case 'team':
      return workContext.teamOpsLabel?.trim() || WORK_SURFACE_LABELS.team
    case 'flows':
      return WORK_SURFACE_LABELS.flows
    case 'general':
    default:
      return null
  }
}

interface WorkContextAttachmentDescriptionOptions {
  activeAgentName?: string | null
  spaceTitle?: string | null
}

export function workContextAttachmentDescription(
  workContext: GlobalWorkContext,
  options: WorkContextAttachmentDescriptionOptions = {},
): string | null {
  const activeAgentName = options.activeAgentName?.trim()
  const agentDetail = activeAgentName
    ? ` ${activeAgentName} can use this context while answering.`
    : ''

  if (workContext.channelId) {
    const channelName = workContext.channelName?.trim()
    const label = channelName ? `#${channelName.replace(/^#/, '')}` : 'this Slack channel'
    return `${label} is attached. The chat can use the channel conversation and available Slack context.${agentDetail}`
  }

  switch (workContext.surface) {
    case 'spaces': {
      const label = options.spaceTitle?.trim() || 'Campaigns'
      return `${label} is attached as the Space or campaign context. The chat can use its work, artifacts, and campaign knowledge.${agentDetail}`
    }
    case 'brain': {
      const label = workContext.brainScopeLabel?.trim() || 'Brain'
      return `${label} is attached as the Brain scope. The chat can use knowledge available inside that Brain.${agentDetail}`
    }
    case 'team': {
      const label = workContext.teamOpsLabel?.trim() || 'Team'
      return `${label} is attached as the team context. The chat can use team members, roles, status, and relevant team operations.${agentDetail}`
    }
    case 'flows':
      return `Flows is attached as the automation context. The chat can use available workflow configuration and run context.${agentDetail}`
    case 'general':
    default:
      return null
  }
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
        agentName: 'ROAS',
        body: 'ROAS can read this space and help you ship in one flow.',
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

export const WORK_SURFACE_LABELS: Record<GlobalWorkSurface, string> = {
  general: 'General',
  spaces: 'Campaigns',
  brain: 'Brain',
  team: 'Team',
  flows: 'Flows',
}
