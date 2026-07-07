import { describe, expect, it } from 'vitest'
import {
  CHAT_FILE_INPUT_ACCEPT,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_FILES,
  CHAT_MAX_IMAGE_FILE_SIZE,
  CHAT_TOAST_ERRORS,
  CHAT_UPLOAD_CONCURRENCY,
  MISSION_QUICK_CAPTURE_ACCEPT,
  getChatFileSizeError,
} from './chat-toast-errors.config'

describe('chat-toast-errors config', () => {
  it('preserves the shared chat upload policy', () => {
    expect(CHAT_MAX_FILES).toBe(10)
    expect(CHAT_MAX_FILE_SIZE).toBe(2.5 * 1024 * 1024 * 1024)
    expect(CHAT_MAX_IMAGE_FILE_SIZE).toBe(15 * 1024 * 1024)
    expect(CHAT_UPLOAD_CONCURRENCY).toBe(3)
    expect(CHAT_FILE_INPUT_ACCEPT).toContain('.pdf')
    expect(CHAT_FILE_INPUT_ACCEPT).toContain('.xlsx')
    expect(CHAT_FILE_INPUT_ACCEPT).toContain('.flac')
    expect(MISSION_QUICK_CAPTURE_ACCEPT).toBe(CHAT_FILE_INPUT_ACCEPT)
  })

  it('maps file size validation to the existing user-facing messages', () => {
    expect(
      getChatFileSizeError({
        size: CHAT_MAX_IMAGE_FILE_SIZE + 1,
        type: 'image/png',
      }),
    ).toBe(CHAT_TOAST_ERRORS.IMAGE_FILE_TOO_LARGE.userMessage)

    expect(
      getChatFileSizeError({
        size: CHAT_MAX_FILE_SIZE + 1,
        type: 'application/pdf',
      }),
    ).toBe(CHAT_TOAST_ERRORS.FILE_TOO_LARGE.userMessage)

    expect(
      getChatFileSizeError({
        size: CHAT_MAX_IMAGE_FILE_SIZE,
        type: 'image/png',
      }),
    ).toBeNull()
  })

  it('preserves the resend failure toast used by chat edit retries', () => {
    expect(CHAT_TOAST_ERRORS.CHAT_RESEND_FAILED.userMessage).toBe(
      'Failed to resend message — try again.',
    )
  })
})
