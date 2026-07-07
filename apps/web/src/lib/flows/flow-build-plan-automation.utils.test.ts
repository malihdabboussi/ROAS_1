import { describe, expect, it } from 'vitest'
import { flowBuildPlanToAutomationRule } from './flow-build-plan-automation.utils'

describe('flowBuildPlanToAutomationRule', () => {
  it('maps trigger and action payloads from a build plan', () => {
    const rule = flowBuildPlanToAutomationRule({
      name: 'Comment on Task Completed',
      intent: 'When done, add comment',
      status: 'validated',
      trigger: {
        id: 'trigger-1',
        kind: 'trigger',
        title: 'Status changed',
        description: 'When status changes',
        source: 'premade',
        payload: { type: 'status_change', to: 'done' },
        missing_fields: [],
        compatibility_warnings: [],
      },
      actions: [
        {
          id: 'action-1',
          kind: 'action',
          title: 'Add comment',
          description: 'Adds a comment',
          source: 'premade',
          payload: { type: 'add_comment', message_template: 'Task completed.' },
          missing_fields: [],
          compatibility_warnings: [],
        },
      ],
      trace_events: [],
      validation_errors: [],
    })

    expect(rule.trigger).toEqual({ type: 'status_change', to: 'done' })
    expect(rule.actions).toEqual([
      { type: 'add_comment', message_template: 'Task completed.' },
    ])
  })

  it('skips action steps with missing payloads instead of throwing', () => {
    const rule = flowBuildPlanToAutomationRule({
      name: 'Comment on Task Completed',
      intent: 'When done, add comment',
      status: 'validated',
      trigger: {
        id: 'trigger-1',
        kind: 'trigger',
        title: 'Status changed',
        description: 'When status changes',
        source: 'premade',
        payload: { type: 'status_change', to: 'done' },
        missing_fields: [],
        compatibility_warnings: [],
      },
      actions: [
        {
          id: 'action-1',
          kind: 'action',
          title: 'Add comment',
          description: 'Adds a comment',
          source: 'premade',
          payload: { type: 'add_comment', message_template: 'Task completed.' },
          missing_fields: [],
          compatibility_warnings: [],
        },
        {
          id: 'action-2',
          kind: 'action',
          title: 'Broken step',
          description: 'Missing payload',
          source: 'premade',
          payload: undefined as unknown as { type: string },
          missing_fields: [],
          compatibility_warnings: [],
        },
      ],
      trace_events: [],
      validation_errors: [],
    })

    expect(rule.trigger).toEqual({ type: 'status_change', to: 'done' })
    expect(rule.actions).toEqual([
      { type: 'add_comment', message_template: 'Task completed.' },
    ])
  })
})
