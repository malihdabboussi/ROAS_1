import { PERSONAL_MOMENT_COOLING_MINUTES } from './slack-team-personal-moment'

export const SLACK_SIGNAL_COOLING_MINUTES = {
  unanswered_question: 30,
  client_risk: 15,
  workflow_discovery: 60,
  team_win: 60,
  important_update: 60,
  decision: 60,
  strategic_opportunity: 60,
  personal_moment: PERSONAL_MOMENT_COOLING_MINUTES,
} as const

export type SlackSignalCoolingKind = keyof typeof SLACK_SIGNAL_COOLING_MINUTES

export function slackSignalLifecycleMetadata(
  kind: SlackSignalCoolingKind | 'brain_memory',
  now = new Date(),
): Record<string, unknown> {
  if (!(kind in SLACK_SIGNAL_COOLING_MINUTES)) return {}
  const coolingMinutes = SLACK_SIGNAL_COOLING_MINUTES[kind as SlackSignalCoolingKind]
  return {
    lifecycle_state: 'cooling',
    cooling_minutes: coolingMinutes,
    eligible_at: new Date(now.getTime() + coolingMinutes * 60_000).toISOString(),
  }
}
