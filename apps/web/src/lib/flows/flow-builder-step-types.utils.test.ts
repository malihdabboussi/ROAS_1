import { describe, expect, it } from 'vitest'
import { defaultAutomationActionForFlowCategory, defaultAutomationTriggerForFlowCategory, isFlowBuilderTriggerCategory } from './flow-builder-step-types.utils'

describe('defaultAutomationActionForFlowCategory', () => {
  it('maps agent category to send_to_agent', () => {
    expect(defaultAutomationActionForFlowCategory('agent')).toEqual({
      type: 'send_to_agent',
      agent_key: '',
      prompt_template: '',
    })
  })

  it('maps space category to create_task', () => {
    expect(defaultAutomationActionForFlowCategory('space')).toEqual({
      type: 'create_task',
      title_template: '',
    })
  })

  it('maps action category to add_comment', () => {
    expect(defaultAutomationActionForFlowCategory('action')).toEqual({
      type: 'add_comment',
      message_template: '',
    })
  })

  it('maps unsupported categories to choose_action', () => {
    expect(defaultAutomationActionForFlowCategory('integration')).toEqual({ type: 'choose_action' })
  })

  it('maps loop category to flow_loop', () => {
    expect(defaultAutomationActionForFlowCategory('loop')).toEqual({
      type: 'flow_loop',
      target_step_index: 0,
      when: 'on_reject',
      max_iterations: 3,
    })
  })

  it('maps branch category to flow_branch', () => {
    expect(defaultAutomationActionForFlowCategory('branch')).toEqual({
      type: 'flow_branch',
      field_id: 'status',
      operator: 'equals',
      value: '',
      then_step_index: 0,
    })
  })

  it('maps human-gate category to human_gate action', () => {
    expect(defaultAutomationActionForFlowCategory('human-gate')).toEqual({
      type: 'human_gate',
      waiting_status: 'in_review',
      resume_on_status: 'done',
      reject_on_status: 'needs_revision',
      message_template: 'Review and approve to continue. Move this task to Done when ready.',
    })
  })

  it('maps webhook category to webhook_received trigger', () => {
    expect(defaultAutomationTriggerForFlowCategory('webhook')).toEqual({
      type: 'webhook_received',
      webhook_endpoint_id: '',
    })
    expect(isFlowBuilderTriggerCategory('webhook')).toBe(true)
    expect(isFlowBuilderTriggerCategory('agent')).toBe(false)
  })

  it('maps skill category to send_to_cursor', () => {
    expect(defaultAutomationActionForFlowCategory('skill')).toEqual({
      type: 'send_to_cursor',
      repo_url: '',
      base_branch: 'main',
      prompt_template: '',
    })
  })
})
