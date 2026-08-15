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
