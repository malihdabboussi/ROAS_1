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
  kind: 'brain_compounding' | 'workflow_discovery' | 'unanswered_questions' | 'client_risk'
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
    badge: 'Starts in Shadow',
    body: {
      name: input.title,
      enabled: false,
      trigger: TEAM_SCHEDULE,
      actions: [
        {
          type: 'observe_slack_team',
          loop_kind: input.kind,
          delivery_mode: 'shadow',
          channel_ids: [],
          person_ids: [],
          lookback_minutes: 30,
          daily_limit: 10,
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
    key: 'slack-person-brain-compounding',
    title: 'Slack Person Brain Compounding',
    description:
      'Observes explicit Slack evidence and prepares durable Person Brain memories for the people involved.',
    kind: 'brain_compounding',
    order: 600,
  }),
  teamLoopTemplate({
    key: 'slack-workflow-discovery',
    title: 'Slack Workflow Discovery',
    description:
      'Finds repeated manual work in Slack and creates reviewable automation opportunities with evidence.',
    kind: 'workflow_discovery',
    order: 610,
  }),
  teamLoopTemplate({
    key: 'slack-unanswered-questions',
    title: 'Slack Unanswered Questions',
    description:
      'Finds direct questions that appear unanswered and drafts a safe follow-up for review.',
    kind: 'unanswered_questions',
    order: 620,
  }),
  teamLoopTemplate({
    key: 'slack-client-risk',
    title: 'Slack Stalled Commitments & Client Risk',
    description:
      'Surfaces explicit blockers, missed commitments, client dissatisfaction, and delivery risk with source evidence.',
    kind: 'client_risk',
    order: 630,
  }),
]
