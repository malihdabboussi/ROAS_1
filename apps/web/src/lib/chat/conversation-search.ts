export interface SearchableConversationMessage {
  content?: string | null
  content_blocks?: Array<{ content: string }> | null
}

export function filterMessagesByQuery<TMessage extends SearchableConversationMessage>(
  messages: TMessage[],
  query: string,
): TMessage[] {
  const q = query.trim().toLowerCase()
  if (!q) return messages
  return messages.filter((message) => {
    const text = (message.content ?? '').toLowerCase()
    if (text.includes(q)) return true
    const blocks = message.content_blocks ?? []
    return blocks.some((block) => block.content.toLowerCase().includes(q))
  })
}
