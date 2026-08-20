export const WORK_REQUEST_MESSAGES = {
  loading: 'Getting your Service Request ready…',
  openingChat: 'Opening your chat…',
  invalidTitle: 'LINK UNAVAILABLE',
  invalidBody: 'This Service Request review link is not valid.',
  expiredTitle: 'REVIEW LINK EXPIRED',
  expiredBody: 'Ask for a fresh review link in the original conversation.',
  revokedTitle: 'REVIEW LINK REPLACED',
  revokedBody: 'Use the newest review link from the original conversation.',
  refreshRequiredTitle: 'FRESH LINK NEEDED',
  refreshRequiredBody: 'I kept the draft safe. Ask for a new secure link in the original thread.',
  finalizedTitle: 'SERVICE REQUEST SUBMITTED',
  finalizedBody: 'Your request is now a native ROAS task.',
  mirrorPending: 'The ROAS task is saved. The ClickUp mirror still needs another try.',
  retryClickUp: 'Retry ClickUp',
  retryingClickUp: 'Retrying ClickUp…',
  saved: 'All set — your draft changes are saved.',
  saving: 'Saving your changes…',
  submitting: 'Creating the ROAS task…',
  assigneeOtherPlaceholder: 'Type a Portal name or email',
} as const

export function workRequestMirrorPendingBody(lastError?: string | null): string {
  const detail = lastError?.trim()
  if (!detail || detail === 'ClickUp mirror is pending') return WORK_REQUEST_MESSAGES.mirrorPending
  if (detail.startsWith(WORK_REQUEST_MESSAGES.mirrorPending)) return detail
  return `${WORK_REQUEST_MESSAGES.mirrorPending} ${detail}`
}
