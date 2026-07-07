import { describe, expect, it } from 'vitest'
import {
  evaluateFlowBuild,
  type FlowBuildPlan,
  type FlowBuildPlanStep,
  type FlowBuildTraceEvent,
} from '@vibey/api-shared'

function step(input: Partial<FlowBuildPlanStep> & { id: string }): FlowBuildPlanStep {
  return {
    kind: 'action',
    title: 'Step',
    description: 'Step',
    source: 'premade',
    payload: { type: 'add_comment', message_template: 'Note' },
    missing_fields: [],
    compatibility_warnings: [],
    ...input,
  }
}

function plan(input: {
  intent: string
  trigger: FlowBuildPlanStep | null
  actions: FlowBuildPlanStep[]
  questions?: number
  validationErrors?: string[]
  trace?: FlowBuildTraceEvent[]
}): FlowBuildPlan {
  return {
    id: input.intent.toLowerCase().replace(/\W+/g, '-'),
    name: input.intent,
    intent: input.intent,
    status: 'planned',
    trigger: input.trigger,
    actions: input.actions,
    trace_events: input.trace ?? [
      { type: 'context_loaded', message: 'Loaded context.' },
      { type: 'capabilities_searched', message: 'Searched capabilities.' },
    ],
    validation_errors: input.validationErrors ?? [],
  }
}

describe('Flow Builder V2 evaluation harness', () => {
  it('ranks five hard-user Loop planning scenarios', () => {
    const scenarios = [
      {
        key: 'premade-vague-status-agent',
        plan: plan({
          intent: 'when done make agent write the next thing',
          trigger: step({
            id: 'trigger-status',
            kind: 'trigger',
            title: 'Status changed',
            source: 'premade',
            payload: { type: 'status_change', to: 'done' },
          }),
          actions: [
            step({
              id: 'agent',
              title: 'Send to agent',
              payload: {
                type: 'send_to_agent',
                agent_key: 'vibey',
                prompt_template: 'Write follow-up',
              },
            }),
          ],
          questions: 1,
        }),
        requiredClarifications: 1,
        minScore: 90,
        expectedScore: 100,
      },
      {
        key: 'premade-github-dev-pr',
        plan: plan({
          intent: 'github bug comes in and dev should PR it or whatever',
          trigger: step({
            id: 'trigger-github',
            kind: 'trigger',
            title: 'GitHub issue created',
            source: 'premade',
            payload: {
              type: 'external_app_event',
              provider: 'github',
              trigger_slug: 'GITHUB_ISSUE_CREATED_TRIGGER',
            },
            missing_fields: ['connected_account_id'],
          }),
          actions: [
            step({
              id: 'task',
              title: 'Create task',
              payload: { type: 'create_task', title_template: '{{trigger.payload}}' },
            }),
            step({
              id: 'cursor',
              title: 'Send to Cursor',
              payload: { type: 'send_to_cursor', prompt_template: 'Open a PR for the bug' },
              missing_fields: ['repo_url'],
            }),
          ],
          questions: 2,
        }),
        requiredClarifications: 2,
        minScore: 85,
        expectedScore: 100,
      },
      {
        key: 'custom-blueprint-reuse',
        plan: plan({
          intent: 'do our VIP welcome thing for new leads',
          trigger: step({
            id: 'trigger-form',
            kind: 'trigger',
            title: 'Form submitted',
            source: 'premade',
            payload: { type: 'form_submitted', form_id: 'lead-form' },
          }),
          actions: [
            step({
              id: 'vip-blueprint',
              kind: 'custom_blueprint',
              title: 'VIP welcome',
              source: 'custom_blueprint',
              payload: { type: 'create_task', title_template: 'VIP welcome' },
            }),
          ],
          trace: [
            { type: 'context_loaded', message: 'Loaded context.' },
            { type: 'capabilities_searched', message: 'Searched capabilities.' },
            { type: 'custom_blueprint_selected', message: 'Selected blueprint.' },
          ],
        }),
        minScore: 80,
        expectedScore: 85,
      },
      {
        key: 'unsupported-custom-api',
        plan: plan({
          intent: 'post it to our random internal tool',
          trigger: step({ id: 'trigger-task', kind: 'trigger', payload: { type: 'task_created' } }),
          actions: [
            step({
              id: 'unsupported',
              kind: 'custom_blueprint',
              title: 'Unsupported custom action',
              source: 'unsupported_candidate',
              payload: {},
              compatibility_warnings: ['No supported action exists.'],
            }),
          ],
          trace: [
            { type: 'context_loaded', message: 'Loaded context.' },
            { type: 'capabilities_searched', message: 'Searched capabilities.' },
            { type: 'unsupported_request_detected', message: 'Unsupported request.' },
          ],
        }),
        maxScore: 80,
        expectedScore: 70,
      },
      {
        key: 'bad-hallucinated-plan',
        plan: plan({
          intent: 'just automate the thing',
          trigger: step({
            id: 'fake-trigger',
            kind: 'trigger',
            source: 'unsupported_candidate',
            payload: { type: 'magic_event' },
          }),
          actions: [
            step({
              id: 'fake-action',
              source: 'unsupported_candidate',
              payload: { type: 'do_magic' },
            }),
          ],
          validationErrors: ['Unsupported trigger', 'Unsupported action'],
          trace: [{ type: 'schema_validation_failed', message: 'Schema failed.' }],
        }),
        maxScore: 35,
        hallucinated: 2,
        expectedScore: 0,
      },
    ]

    const results = scenarios.map((scenario) => ({
      key: scenario.key,
      summary: evaluateFlowBuild({
        plan: scenario.plan,
        required_clarifications: scenario.requiredClarifications ?? 0,
        hallucinated_capability_ids: scenario.hallucinated ?? 0,
      }),
      minScore: scenario.minScore,
      maxScore: scenario.maxScore,
      expectedScore: scenario.expectedScore,
    }))

    for (const result of results) {
      if (result.minScore != null)
        expect(result.summary.score).toBeGreaterThanOrEqual(result.minScore)
      if (result.maxScore != null) expect(result.summary.score).toBeLessThanOrEqual(result.maxScore)
      expect(result.summary.score).toBe(result.expectedScore)
    }
    expect(results.map((result) => [result.key, result.summary.rank])).toEqual([
      ['premade-vague-status-agent', 'A'],
      ['premade-github-dev-pr', 'A'],
      ['custom-blueprint-reuse', 'B'],
      ['unsupported-custom-api', 'C'],
      ['bad-hallucinated-plan', 'F'],
    ])
  })
})
