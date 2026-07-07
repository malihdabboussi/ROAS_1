/** Max files per chat message */
export const CHAT_MAX_FILES = 10

/** Universal per-file size cap (2.5 GB) */
export const CHAT_MAX_FILE_SIZE = 2.5 * 1024 * 1024 * 1024

/** Image per-file size cap (15 MB) */
export const CHAT_MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024

/** Max concurrent presigned uploads */
export const CHAT_UPLOAD_CONCURRENCY = 3

/** `accept` attribute for chat file input (extension list) */
export const CHAT_FILE_INPUT_ACCEPT =
  '.pdf,.docx,.doc,.ppt,.pptx,.txt,.md,.skill,.csv,.tsv,.json,.xml,.yaml,.yml,.xls,.xlsx,.xlsm,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov,.ogg,.mp3,.wav,.m4a,.aac,.flac'

/** Mission quick capture uses the same attachment allowlist as chat. */
export const MISSION_QUICK_CAPTURE_ACCEPT = CHAT_FILE_INPUT_ACCEPT

/** User-facing toast messages for chat errors */
export const CHAT_TOAST_ERRORS = {
  MAX_FILES_EXCEEDED: {
    userMessage: 'You can attach up to 10 files per message. Remove some to add more.',
  },
  FILE_TOO_LARGE: {
    userMessage: "That file couldn't be uploaded. Try again.",
  },
  IMAGE_FILE_TOO_LARGE: {
    userMessage: 'That image is too large. Use a file under 15 MB or compress it.',
  },
  VIDEO_TOO_LARGE: {
    userMessage: "That video couldn't be uploaded. Try again.",
  },
  UPLOAD_FAILED: {
    userMessage: "Couldn't upload that file. Try again.",
  },
  INTEGRATION_UPDATE_FAILED: {
    userMessage: "Couldn't update integration. Try again.",
  },
  INTEGRATION_START_CONNECTION_FAILED: {
    userMessage: "Couldn't start connection. Try again.",
  },
  INTEGRATION_CONNECT_FAILED: {
    userMessage: "Couldn't connect. Try again.",
  },
  CHAT_SEND_ERROR: {
    userMessage: 'Something went wrong. Your message was saved — try sending again.',
  },
  CHAT_SESSION_EXPIRED: {
    userMessage: 'Your session expired. Refresh the page and try again.',
  },
  CHAT_CREDITS_EXHAUSTED: {
    userMessage: 'You have used all your credits. Add more in Settings > Billing.',
  },
  CHAT_RESEND_FAILED: {
    userMessage: 'Failed to resend message — try again.',
  },
  CLOUD_DRIVE_DISCONNECTED: {
    userMessage: 'Connect Google Drive to attach files.',
  },
  CLOUD_DROPBOX_DISCONNECTED: {
    userMessage: 'Connect Dropbox to attach files.',
  },
} as const

export function getChatFileSizeError(file: { size: number; type?: string }): string | null {
  if (file.type?.startsWith('image/') && file.size > CHAT_MAX_IMAGE_FILE_SIZE) {
    return CHAT_TOAST_ERRORS.IMAGE_FILE_TOO_LARGE.userMessage
  }
  if (file.size > CHAT_MAX_FILE_SIZE) {
    return CHAT_TOAST_ERRORS.FILE_TOO_LARGE.userMessage
  }
  return null
}
