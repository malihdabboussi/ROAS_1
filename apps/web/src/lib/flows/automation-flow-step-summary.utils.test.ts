import { describe, expect, it } from 'vitest'
import { getFlowBuilderStepSummary } from './automation-flow-step-summary.utils'

const statusFields = [
  {
    id: 'status',
    name: 'Status',
    type: 'select' as const,
    options: [
      { id: 'todo', label: 'To do' },
      { id: 'in_progress', label: 'In progress' },
      { id: 'done', label: 'Completed' },
    ],
  },
]

describe('getFlowBuilderStepSummary', () => {
  it('describes status_change trigger from configured statuses', () => {
    const summary = getFlowBuilderStepSummary({
      selection: { kind: 'trigger' },
      trigger: { type: 'status_change', from: 'todo', to: 'in_progress' },
      actions: [],
      fields: statusFields,
      roster: [],
    })

    expect(summary).toBe('Changes status from To do to In progress')
  })

  it('describes status_change with any source status', () => {
    const summary = getFlowBuilderStepSummary({
      selection: { kind: 'trigger' },
      trigger: { type: 'status_change', to: 'done' },
      actions: [],
      fields: statusFields,
      roster: [],
    })

    expect(summary).toBe('Changes status from any status to Completed')
  })

  it('describes add_comment action with message template', () => {
    const summary = getFlowBuilderStepSummary({
      selection: { kind: 'action', index: 0 },
      trigger: { type: 'status_change', to: 'done' },
      actions: [{ type: 'add_comment', message_template: 'Task completed.' }],
      fields: statusFields,
      roster: [],
    })

    expect(summary).toBe('Adds comment: "Task completed."')
  })
})
