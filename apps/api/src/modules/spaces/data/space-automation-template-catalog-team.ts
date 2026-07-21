import type { SpaceAutomationTemplateSeed } from './space-automation-template-catalog.types'

const TEAM_SCHEDULE = {
  type: 'schedule',
  schedule: { mode: 'preset', preset: 'minutes', interval: 15 },
  timezone: 'America/Los_Angeles',
} as const

function teamLoopTemplate(input: {
  key: string
  title: string
  description: string
  kind: 'all'
  order: number
}): SpaceAutomationTemplateSeed {
  return {
    template_key: input.key,
    featured: true,
    is_new: true,
    workflows: ['team_ops'],
    integration: 'slack',
    trigger_group: 'slack',
    sort_order: input.order,
    title: input.title,
    description: input.description,
    badge: 'Runs in Shadow',
    body: {
      name: input.title,
      enabled: true,
      trigger: TEAM_SCHEDULE,
      actions: [
        {
          type: 'observe_slack_team',
          loop_kind: input.kind,
          delivery_mode: 'shadow',
          channel_ids: [],
          person_ids: [],
          lookback_minutes: 30,
          daily_limit: 40,
          quiet_hours: {
            start: '22:00',
            end: '07:00',
            timezone: 'America/Los_Angeles',
          },
        },
      ],
    },
  }
}

export const TEAM_AUTOMATION_TEMPLATES: SpaceAutomationTemplateSeed[] = [
  teamLoopTemplate({
    key: 'slack-team-observation',
    title: 'Slack Team Intelligence',
    description:
      'Observes Slack once, then routes Person Brain facts, workflow opportunities, unanswered questions, and client risks into reviewable Shadow proposals.',
    kind: 'all',
    order: 600,
  }),
]
