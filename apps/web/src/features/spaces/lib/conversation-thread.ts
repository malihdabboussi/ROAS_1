export interface ThreadMessage {
  id: string
  role: string
  content: string
  created_at: string
}

/** Cursor for loading older messages: the created_at of the oldest loaded message. */
export function olderCursor(messages: ThreadMessage[]): string | null {
  return messages[0]?.created_at ?? null
}

/** Prepends an older (ascending) page to the thread, deduping by message id. */
export function mergeOlderMessages(
  existing: ThreadMessage[],
  older: ThreadMessage[],
): ThreadMessage[] {
  const existingIds = new Set(existing.map((m) => m.id))
  const fresh = older.filter((m) => !existingIds.has(m.id))
  return [...fresh, ...existing]
}
