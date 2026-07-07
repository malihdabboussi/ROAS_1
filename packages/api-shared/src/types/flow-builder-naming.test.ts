import { describe, expect, it } from 'vitest'
import type { FlowBuildPlan } from './flow-builder'
import {
  isPlaceholderFlowDraftName,
  resolveFlowDraftNameFromPlan,
} from './flow-builder'

function basePlan(overrides: Partial<FlowBuildPlan> = {}): FlowBuildPlan {
  return {
    name: 'Untitled flow draft',
    intent: 'Build a flow',
    status: 'planned',
    trigger: null,
    actions: [],
    trace_events: [],
    validation_errors: [],
    ...overrides,
  }
}

describe('isPlaceholderFlowDraftName', () => {
  it('treats default draft labels as placeholders', () => {
    expect(isPlaceholderFlowDraftName('Untitled flow draft')).toBe(true)
    expect(isPlaceholderFlowDraftName('New flow build')).toBe(true)
    expect(isPlaceholderFlowDraftName('')).toBe(true)
  })

  it('keeps real names', () => {
    expect(isPlaceholderFlowDraftName('Fathom Recording: Summarize and Notify')).toBe(false)
  })
})

describe('resolveFlowDraftNameFromPlan', () => {
  it('uses plan name when it is not a placeholder', () => {
    const plan = basePlan({
      name: 'Fathom Recording: Summarize and Notify',
      trigger: {
        id: 'trigger-1',
        kind: 'trigger',
        title: 'Fathom recording ready',
        description: '',
        source: 'premade',
        payload: { type: 'external_fathom_recording_ready' },
        missing_fields: [],
        compatibility_warnings: [],
      },
    })
    expect(resolveFlowDraftNameFromPlan(plan)).toBe('Fathom Recording: Summarize and Notify')
  })

  it('derives a name from trigger and action titles when the draft is still untitled', () => {
    const plan = basePlan({
      trigger: {
        id: 'trigger-1',
        kind: 'trigger',
        title: 'Fathom recording ready',
        description: '',
        source: 'premade',
        payload: { type: 'external_fathom_recording_ready' },
        missing_fields: [],
        compatibility_warnings: [],
      },
      actions: [
        {
          id: 'action-1',
          kind: 'action',
          title: 'Summarize call',
          description: '',
          source: 'premade',
          payload: { type: 'send_to_agent' },
          missing_fields: [],
          compatibility_warnings: [],
        },
        {
          id: 'action-2',
          kind: 'action',
          title: 'Notify Slack',
          description: '',
          source: 'premade',
          payload: { type: 'send_slack_message' },
          missing_fields: [],
          compatibility_warnings: [],
        },
      ],
    })
    expect(resolveFlowDraftNameFromPlan(plan)).toBe(
      'Fathom recording ready: Summarize call → Notify Slack',
    )
  })

  it('does not rename when there are no steps yet', () => {
    expect(resolveFlowDraftNameFromPlan(basePlan())).toBeNull()
  })
})
