export const CHAT_WORKING_STATUS_PHRASES = [
  'Working...',
  'Getting oriented...',
  'Planning next moves...',
  'Thinking through it...',
  'Connecting the dots...',
  'Moving things along...',
  'Checking the next step...',
  'Keeping the thread moving...',
] as const

export const CHAT_WORKING_STATUS_HOLD_MS = 2_500
export const CHAT_WORKING_STATUS_CYCLE_MS = 3_000

export function resolveWorkingStatusLabel(input: {
  pinnedLabel?: string | null
  cycling: boolean
  cycleIndex: number
}): string {
  const phrases = CHAT_WORKING_STATUS_PHRASES
  const pinned = input.pinnedLabel?.trim() ?? ''
  if (!input.cycling) return pinned || phrases[0]
  return phrases[input.cycleIndex % phrases.length] ?? phrases[0]
}
