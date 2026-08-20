export type MeetingConversationLink = {
  meetingItemId: string
  spaceId: string
}

export function readMeetingConversationLink(
  metadata: Record<string, unknown> | null | undefined,
): MeetingConversationLink | null {
  if (!metadata) return null
  const meetingItemId =
    typeof metadata.meeting_item_id === 'string' ? metadata.meeting_item_id.trim() : ''
  const spaceId = typeof metadata.space_id === 'string' ? metadata.space_id.trim() : ''
  const isMeeting = metadata.context_type === 'meeting' || Boolean(meetingItemId)
  if (!isMeeting || !meetingItemId || !spaceId) return null
  return { meetingItemId, spaceId }
}

export function readMeetingConversationTitle(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const title = typeof metadata?.meeting_title === 'string' ? metadata.meeting_title.trim() : ''
  return title || null
}

/** Connections labels the linked meeting, never the recap/chat title. */
export function resolveLinkedMeetingTitle(input: {
  contextTitle?: string | null
  metadata?: Record<string, unknown> | null
  workAreaTitle?: string | null
}): string {
  const fromContext = input.contextTitle?.trim() ?? ''
  if (fromContext) return fromContext
  const fromMetadata = readMeetingConversationTitle(input.metadata)
  if (fromMetadata) return fromMetadata
  const fromWorkArea = input.workAreaTitle?.trim() ?? ''
  if (fromWorkArea) return fromWorkArea
  return 'Meeting'
}
