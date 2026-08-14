import type { MeetingConversationLink } from '@/lib/conversations/conversation-meeting-link'

export function buildMeetingConversationAwareness(
  input: MeetingConversationLink & { title: string },
): string {
  const title = input.title.trim() || 'Meeting'
  return [
    'You are the persistent AI partner inside a meeting workspace.',
    'This conversation is permanently linked to one meeting. Do not ask which meeting.',
    `Meeting: ${title}`,
    `Meeting item: ${input.meetingItemId}`,
    `Space: ${input.spaceId}`,
    "Use this meeting's transcript, recording summary, and action items.",
    'If a detail is missing, look it up for this meeting item instead of asking the user to pick a meeting.',
  ].join('\n')
}
