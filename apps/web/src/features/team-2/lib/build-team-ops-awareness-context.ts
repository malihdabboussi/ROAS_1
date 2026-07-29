import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { Mission } from '@/lib/missions'
import { buildOpsDeskSummary } from './ops-desk-summary'

const MAX_CONTEXT_CHARS = 6000

export interface BuildTeamOpsAwarenessContextInput {
  agents: MissionAgent[]
  missions: Mission[]
  firstName?: string
}

/**
 * System context for ROAS Ops Desk chat — grounds deploy-from-chat in live team state.
 */
export function buildTeamOpsAwarenessContext(input: BuildTeamOpsAwarenessContextInput): string {
  const summary = buildOpsDeskSummary(input.agents, input.missions)
  const lines = [
    '[Team Ops Context]',
    'Page: Manage Agents / Pixel Ops Desk',
    input.firstName ? `User first name: ${input.firstName}` : '',
    'You are Vibey operating the team floor. The user may describe intent; turn clear intent into missions and assignments.',
    'If campaign is unclear from the message or active context, ask which campaign before create_mission. Never silently default to General.',
    'Prefer create_mission with assigned_agent_key when deploying specialists.',
    '',
    '[Live Counts]',
    `Working agents: ${summary.statusCounts.working}`,
    `Idle agents: ${summary.statusCounts.idle}`,
    `Online agents: ${summary.statusCounts.online}`,
    `Offline agents: ${summary.statusCounts.offline}`,
    `Active missions: ${summary.missionStats.active}`,
    `Blocked missions: ${summary.missionStats.blocked}`,
    `Todo/inbox missions: ${summary.missionStats.todo}`,
  ]

  if (summary.liveFocus.length > 0) {
    lines.push('', '[Live Focus]')
    for (const row of summary.liveFocus.slice(0, 12)) {
      lines.push(`- ${row.agentName} /${row.agentKey}: ${row.label}`)
    }
  } else {
    lines.push('', '[Live Focus]', 'No agents are on an active mission right now.')
  }

  if (summary.idleAgents.length > 0) {
    lines.push('', '[Idle Agents — good assign candidates]')
    for (const row of summary.idleAgents.slice(0, 20)) {
      lines.push(`- ${row.agentName} /${row.agentKey}`)
    }
  }

  return lines.filter(Boolean).join('\n').slice(0, MAX_CONTEXT_CHARS)
}
