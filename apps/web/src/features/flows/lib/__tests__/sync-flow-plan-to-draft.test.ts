import { describe, expect, it } from 'vitest'
import type { FlowBuildPlan } from '@vibey/api-shared/types/flow-builder'
import {
  flowNeedsPlanSync,
  mergeFlowWithBuildPlan,
  planTargetsFlow,
} from '../sync-flow-plan-to-draft'
import type { FlowAutomation } from '../../types/flow-automation.types'

const fathomPlan: FlowBuildPlan = {
  name: 'Fathom Recording: Summarize and Notify',
  intent: 'Summarize Fathom calls and notify Slack',
  status: 'planned',
  automation_id: 'draft-1',
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
      payload: { type: 'send_to_agent', agent_key: 'loop' },
      missing_fields: [],
      compatibility_warnings: [],
    },
    {
      id: 'action-2',
      kind: 'action',
      title: 'Notify Slack',
      description: '',
      source: 'premade',
      payload: { type: 'send_slack_message', channel_id: '' },
      missing_fields: ['channel_id'],
      compatibility_warnings: [],
    },
  ],
  trace_events: [],
  validation_errors: [],
}

const placeholderFlow: FlowAutomation = {
  id: 'draft-1',
  space_id: 'space-1',
  name: 'Untitled flow draft',
  description: null,
  enabled: false,
  is_draft: true,
  trigger: { type: 'choose_action' },
  actions: [],
}

describe('planTargetsFlow', () => {
  it('matches when plan automation_id equals flow id', () => {
    expect(planTargetsFlow(fathomPlan, { id: 'draft-1', automation_id: null })).toBe(true)
  })

  it('does not match unrelated flows', () => {
    expect(planTargetsFlow(fathomPlan, { id: 'draft-2', automation_id: null })).toBe(false)
  })
})

describe('flowNeedsPlanSync', () => {
  it('returns true when draft is still a placeholder and plan has steps', () => {
    expect(flowNeedsPlanSync(placeholderFlow, fathomPlan)).toBe(true)
  })

  it('returns false when draft already has executable steps', () => {
    expect(
      flowNeedsPlanSync(
        {
          ...placeholderFlow,
          trigger: { type: 'external_fathom_recording_ready' },
          actions: [{ type: 'send_slack_message' }],
        },
        fathomPlan,
      ),
    ).toBe(false)
  })
})

describe('mergeFlowWithBuildPlan', () => {
  it('merges plan trigger and actions into a placeholder draft for display', () => {
    const merged = mergeFlowWithBuildPlan(placeholderFlow, fathomPlan)

    expect(merged.name).toBe('Fathom Recording: Summarize and Notify')
    expect(merged.trigger).toEqual({ type: 'external_fathom_recording_ready' })
    expect(merged.actions).toHaveLength(2)
    expect(merged.actions[0]).toEqual({ type: 'send_to_agent', agent_key: 'loop' })
    expect(merged.actions[1]).toEqual({ type: 'send_slack_message', channel_id: '' })
  })

  it('leaves unrelated drafts untouched', () => {
    const merged = mergeFlowWithBuildPlan(
      { ...placeholderFlow, id: 'draft-2' },
      fathomPlan,
    )

    expect(merged).toEqual({ ...placeholderFlow, id: 'draft-2' })
  })
})
