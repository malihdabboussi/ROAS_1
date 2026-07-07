/** Minimal message shape for assistant action pin logic. */
export type AssistantActionPinMessage = {
  id: string
  role: string
}

/** Last assistant message stays pinned until the user sends another message. */
export function resolvePinnedAssistantMessageId(
  messages: ReadonlyArray<AssistantActionPinMessage>,
): string | null {
  const last = messages[messages.length - 1]
  if (!last || last.role === 'user') return null
  return last.id
}

export function shouldPinAssistantActions(
  messageId: string,
  messages: ReadonlyArray<AssistantActionPinMessage>,
): boolean {
  const pinnedId = resolvePinnedAssistantMessageId(messages)
  return pinnedId !== null && pinnedId === messageId
}
