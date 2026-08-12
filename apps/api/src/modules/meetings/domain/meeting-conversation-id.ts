import { createHash } from 'node:crypto'

const MEETING_CONVERSATION_NAMESPACE = 'roas:meeting-conversation:'

export function buildMeetingConversationId(meetingItemId: string): string {
  const hex = createHash('sha256')
    .update(`${MEETING_CONVERSATION_NAMESPACE}${meetingItemId}`)
    .digest('hex')
    .slice(0, 32)
    .split('')

  hex[12] = '5'
  hex[16] = ((Number.parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16)

  const value = hex.join('')
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
}
