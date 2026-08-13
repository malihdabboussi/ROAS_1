import type { GlobalMeetingChatContext } from '../store/use-global-chat-store'

/**
 * Meeting workspace attaches context before the shell chat has selected that thread.
 * Prefer the meeting conversation immediately so the panel does not stay on a blank new chat.
 * Apply awareness only once the active conversation is the meeting thread.
 */
export function resolveMeetingChatPanel(input: {
  storedMeetingContext: GlobalMeetingChatContext | null
  activeConversationId: string | null
}): {
  meetingContext: GlobalMeetingChatContext | null
  preferredConversationId: string | null
  awarenessContext: string | undefined
} {
  const meetingContext = input.storedMeetingContext
  if (!meetingContext) {
    return {
      meetingContext: null,
      preferredConversationId: null,
      awarenessContext: undefined,
    }
  }
  const preferredConversationId = meetingContext.conversationId.trim() || null
  if (
    input.activeConversationId &&
    preferredConversationId &&
    input.activeConversationId !== preferredConversationId
  ) {
    return {
      meetingContext: null,
      preferredConversationId: null,
      awarenessContext: undefined,
    }
  }
  const awarenessReady =
    Boolean(preferredConversationId) && preferredConversationId === input.activeConversationId
  return {
    meetingContext,
    preferredConversationId,
    awarenessContext: awarenessReady ? meetingContext.awarenessContext : undefined,
  }
}
