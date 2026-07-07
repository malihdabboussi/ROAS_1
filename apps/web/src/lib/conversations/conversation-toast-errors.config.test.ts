import { describe, expect, it } from 'vitest'

import {
  CONVERSATION_ACTIONS_TOAST_ERRORS,
  CONVERSATION_ACTIONS_TOAST_SUCCESS,
} from './conversation-toast-errors.config'

describe('conversation action toast config', () => {
  it('keeps shared conversation action messages stable', () => {
    expect(CONVERSATION_ACTIONS_TOAST_ERRORS.RENAME_CONVERSATION_FAILED.userMessage).toBe(
      'Could not rename conversation.',
    )
    expect(CONVERSATION_ACTIONS_TOAST_ERRORS.PIN_CONVERSATION_FAILED.userMessage).toBe(
      'Could not pin conversation.',
    )
    expect(CONVERSATION_ACTIONS_TOAST_ERRORS.UNPIN_CONVERSATION_FAILED.userMessage).toBe(
      'Could not unpin conversation.',
    )
    expect(CONVERSATION_ACTIONS_TOAST_ERRORS.MOVE_CONVERSATION_FAILED.userMessage).toBe(
      'Could not move conversation.',
    )
    expect(CONVERSATION_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage).toBe(
      'Failed to copy — try again.',
    )
    expect(CONVERSATION_ACTIONS_TOAST_SUCCESS.MOVED_TO_CAMPAIGN.userMessage).toBe(
      'Moved to campaign.',
    )
  })
})
