import { describe, expect, it } from 'vitest'
import { shouldRunPostCallSlackAction } from '../post-call-meeting-scope'

describe('post-call Slack meeting scope', () => {
  it('runs the client-only action only for canonical client calls', () => {
    const action = { type: 'request_slack_follow_up_confirm', meeting_scope: 'client' }

    expect(shouldRunPostCallSlackAction(action, { custom_data: { call_kind: 'client' } })).toBe(true)
    for (const callKind of ['private', 'team', 'executive', 'partner', 'sales', undefined]) {
      expect(
        shouldRunPostCallSlackAction(action, { custom_data: { call_kind: callKind } }),
      ).toBe(false)
    }
  })

  it('preserves the existing all-meetings behavior when no scope is configured', () => {
    expect(
      shouldRunPostCallSlackAction(
        { type: 'request_slack_follow_up_confirm' },
        { custom_data: { call_kind: 'team' } },
      ),
    ).toBe(true)
  })
})
