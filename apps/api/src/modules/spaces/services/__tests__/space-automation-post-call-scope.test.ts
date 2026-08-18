import { describe, expect, it } from 'vitest'
import { shouldRunPostCallSlackAction } from '../post-call-meeting-scope'

describe('post-call Slack meeting scope', () => {
  it('never runs personal calls, even when scope is all', () => {
    expect(
      shouldRunPostCallSlackAction(
        { type: 'request_slack_follow_up_confirm', meeting_scope: 'all' },
        { custom_data: { call_kind: 'private' } },
      ),
    ).toBe(false)
  })

  it('runs the client-only action only for canonical client calls', () => {
    const action = { type: 'request_slack_follow_up_confirm', meeting_scope: 'client' }

    expect(shouldRunPostCallSlackAction(action, { custom_data: { call_kind: 'client' } })).toBe(
      true,
    )
    for (const callKind of ['private', 'team', 'executive', 'partner', 'sales', undefined]) {
      expect(shouldRunPostCallSlackAction(action, { custom_data: { call_kind: callKind } })).toBe(
        false,
      )
    }
  })

  it('runs team-and-client scope for team or client, never personal', () => {
    const action = {
      type: 'request_slack_follow_up_confirm',
      meeting_scope: 'client_and_team',
    }
    expect(shouldRunPostCallSlackAction(action, { custom_data: { call_kind: 'team' } })).toBe(true)
    expect(shouldRunPostCallSlackAction(action, { custom_data: { call_kind: 'client' } })).toBe(
      true,
    )
    expect(shouldRunPostCallSlackAction(action, { custom_data: { call_kind: 'private' } })).toBe(
      false,
    )
  })

  it('runs unscoped actions for team but not personal', () => {
    expect(
      shouldRunPostCallSlackAction(
        { type: 'request_slack_follow_up_confirm' },
        { custom_data: { call_kind: 'team' } },
      ),
    ).toBe(true)
    expect(
      shouldRunPostCallSlackAction(
        { type: 'request_slack_follow_up_confirm' },
        { custom_data: { call_kind: 'private' } },
      ),
    ).toBe(false)
  })
})
