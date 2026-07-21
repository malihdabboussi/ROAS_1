import { describe, expect, it } from 'vitest'
import { filterFlows } from './flows-filters'

describe('filterFlows', () => {
  it('keeps Team loops in the same collection behind the Team filter', () => {
    const flows = [
      {
        name: 'Observe Slack team',
        enabled: true,
        is_draft: false,
        trigger: { type: 'schedule' },
        actions: [{ type: 'observe_slack_team' }],
      },
      {
        name: 'Create weekly report',
        enabled: true,
        is_draft: false,
        trigger: { type: 'schedule' },
        actions: [{ type: 'create_task' }],
      },
    ]

    expect(
      filterFlows(flows, {
        search: '',
        draftFilter: 'all',
        enabledFilter: 'all',
        triggerFilter: 'all',
        surfaceFilter: 'team',
        incompleteOnly: false,
      }).map((flow) => flow.name),
    ).toEqual(['Observe Slack team'])
  })
})
