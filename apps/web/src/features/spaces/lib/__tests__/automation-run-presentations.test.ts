import { describe, expect, it } from 'vitest'
import {
  describeAutomationRunOutcome,
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
    expect(
      describeAutomationTriggerEvent({ type: 'status_change', from: 'todo', to: 'done' }),
    ).toBe('Status: todo \u2192 done')
    expect(describeAutomationTriggerEvent({ type: 'task_created' })).toBe('Task created')
    expect(describeAutomationTriggerEvent({ type: 'custom_event' })).toBe('custom event')
  })

  it('explains skipped and productive Slack intelligence runs', () => {
    expect(
      describeAutomationRunOutcome([
        { type: 'observe_slack_team', result: { skipped: true, skipped_reason: 'quiet_hours' } },
      ]),
    ).toEqual({ label: 'Skipped', detail: 'Quiet hours' })
    expect(
      describeAutomationRunOutcome([
        {
          type: 'observe_slack_team',
          result: {
            channels_observed: 42,
            messages_observed: 18,
            signals_detected: 3,
            proposed: 2,
            model_total_tokens: 1250,
            provider_cost_usd: 0.0142,
          },
        },
      ]),
    ).toEqual({
      label: 'Proposed 2',
      detail: '18 messages · 3 signals · 1,250 tokens · $0.0142',
    })
  })
})
