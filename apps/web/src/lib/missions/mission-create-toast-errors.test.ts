import { describe, expect, it } from 'vitest'
import {
  MISSION_CONTROL_TOAST_ERRORS,
  resolveMissionCreateToastMessage,
} from './mission-create-toast-errors'

describe('resolveMissionCreateToastMessage', () => {
  it('keeps the existing credit and auth error mappings', () => {
    expect(resolveMissionCreateToastMessage(new Error('credits_exhausted'))).toBe(
      MISSION_CONTROL_TOAST_ERRORS.CREATE_NO_CREDITS.userMessage,
    )
    expect(resolveMissionCreateToastMessage(new Error('Backend error 403'))).toBe(
      MISSION_CONTROL_TOAST_ERRORS.CREATE_FORBIDDEN.userMessage,
    )
  })

  it('keeps the existing character-limit message', () => {
    expect(resolveMissionCreateToastMessage(new Error('title at most 2000 character'))).toBe(
      'Mission text is too long. Use at most 2,000 characters.',
    )
  })

  it('falls back to the generic create failure message', () => {
    expect(resolveMissionCreateToastMessage(new Error('unknown'))).toBe(
      MISSION_CONTROL_TOAST_ERRORS.CREATE_FAILED.userMessage,
    )
  })
})
