import type { OpsDeskSummary } from './ops-desk-summary'

export interface BuildOpsDeskTalkKickoffInput {
  firstName: string
  summary: OpsDeskSummary
}

/**
 * User message seeded into sidebar chat when clicking Talk to Pixel.
 * ROAS answers with the Ops Desk check-in (greeting + ask what to focus on).
 */
export function buildOpsDeskTalkKickoffMessage(input: BuildOpsDeskTalkKickoffInput): string {
  const { firstName, summary } = input
  const lines = [
    `I'm on the Manage Agents Ops Desk. Start our check-in.`,
    `Use the attached Team Ops context. Greet me by first name (${firstName}).`,
    `Lead with 1–2 concrete things you notice on the floor right now, then ask what I want to focus on / do today.`,
    `Keep it short — CEO check-in energy, not a status dump. Don't create missions yet unless I ask.`,
    `Live snapshot: ${summary.statusCounts.working} working · ${summary.statusCounts.idle} idle · ${summary.missionStats.active} active missions · ${summary.missionStats.blocked} blocked.`,
  ]

  if (summary.liveFocus.length > 0) {
    const top = summary.liveFocus
      .slice(0, 3)
      .map((row) => `${row.agentName} → ${row.label}`)
      .join('; ')
    lines.push(`Live focus: ${top}.`)
  } else if (summary.idleAgents.length > 0) {
    const free = summary.idleAgents
      .slice(0, 4)
      .map((row) => row.agentName)
      .join(', ')
    lines.push(`Free right now: ${free}.`)
  }

  return lines.join('\n')
}
