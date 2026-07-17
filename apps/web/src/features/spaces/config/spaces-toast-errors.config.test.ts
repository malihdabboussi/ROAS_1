import { describe, expect, it } from 'vitest'

import {
  SPACES_ACTIONS_TOAST_ERRORS,
  SPACES_ACTIONS_TOAST_SUCCESS,
} from './spaces-toast-errors.config'

describe('spaces action toast config', () => {
  it('keeps conversation action messages stable for shared side-chat consumers', () => {
    expect(SPACES_ACTIONS_TOAST_ERRORS.RENAME_CONVERSATION_FAILED.userMessage).toBe(
      'Could not rename conversation.',
    )
    expect(SPACES_ACTIONS_TOAST_ERRORS.PIN_CONVERSATION_FAILED.userMessage).toBe(
      'Could not pin conversation.',
    )
    expect(SPACES_ACTIONS_TOAST_ERRORS.UNPIN_CONVERSATION_FAILED.userMessage).toBe(
      'Could not unpin conversation.',
    )
    expect(SPACES_ACTIONS_TOAST_ERRORS.MOVE_CONVERSATION_FAILED.userMessage).toBe(
      'Could not move conversation.',
    )
    expect(SPACES_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage).toBe(
      'Failed to copy — try again.',
    )
    expect(SPACES_ACTIONS_TOAST_ERRORS.CREATE_GOOGLE_DOC_FAILED.userMessage).toBe(
      "Couldn't create the Google Doc — check your Drive connection and try again.",
    )
    expect(SPACES_ACTIONS_TOAST_SUCCESS.GOOGLE_DOC_CREATED.userMessage).toBe(
      'Google Doc created and linked.',
    )
    expect(SPACES_ACTIONS_TOAST_SUCCESS.MOVED_TO_CAMPAIGN.userMessage).toBe(
      'Moved to campaign.',
    )
  })
})
