import { describe, expect, it } from 'vitest'
import {
  describeAutomationTriggerEvent,
  runStatusPresentation,
} from '../automation-run-presentations'

describe('automation-run-presentations', () => {
  it('maps run statuses to labels and token classes', () => {
    expect(runStatusPresentation('success')).toEqual({
      label: 'Success',
      textClassName: 'text-success',
    })
    expect(runStatusPresentation('partial')).toEqual({
      label: 'Partial',
      textClassName: 'text-warning',
    })
    expect(runStatusPresentation('failed')).toEqual({
      label: 'Failed',
      textClassName: 'text-destructive',
    })
  })

  it('describes known and unknown trigger events', () => {
    expect(describeAutomationTriggerEvent({ type: 'status_change', from: 'todo', to: 'done' })).toBe(
      'Status: todo \u2192 done',
    )
    expect(describeAutomationTriggerEvent({ type: 'task_created' })).toBe('Task created')
    expect(describeAutomationTriggerEvent({ type: 'custom_event' })).toBe('custom event')
  })
})
