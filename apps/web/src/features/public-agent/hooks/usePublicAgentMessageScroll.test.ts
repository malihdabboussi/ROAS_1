import { describe, expect, it } from 'vitest'
import {
  getPublicAgentBottomSpacerHeight,
  shouldAnchorPublicAgentLatestUser,
} from './usePublicAgentMessageScroll'

describe('usePublicAgentMessageScroll helpers', () => {
  it('reserves anchor space only while a user turn is pending or streaming', () => {
    expect(
      shouldAnchorPublicAgentLatestUser(
        [
          { id: 'user-1', role: 'user' },
          { id: 'assistant-1', role: 'assistant' },
        ],
        false,
      ),
    ).toBe(false)
    expect(
      shouldAnchorPublicAgentLatestUser(
        [
          { id: 'user-1', role: 'user' },
          { id: 'assistant-1', role: 'assistant' },
        ],
        true,
      ),
    ).toBe(true)
    expect(shouldAnchorPublicAgentLatestUser([{ id: 'user-1', role: 'user' }], false)).toBe(true)
  })

  it('drops the spacer after the active turn no longer needs top anchoring', () => {
    expect(
      getPublicAgentBottomSpacerHeight({
        scrollAreaHeight: 420,
        latestUserMessageHeight: 72,
        shouldReserveSpace: true,
      }),
    ).toBe(348)
    expect(
      getPublicAgentBottomSpacerHeight({
        scrollAreaHeight: 420,
        latestUserMessageHeight: 72,
        shouldReserveSpace: false,
      }),
    ).toBe(0)
  })
})
