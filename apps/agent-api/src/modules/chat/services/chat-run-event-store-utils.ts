export function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function runEventsKey(runId: string): string {
  return `chat:run:${runId}:events`
}

export function runMetaKey(runId: string): string {
  return `chat:run:${runId}:meta`
}

export function conversationActiveRunKey(conversationId: string): string {
  return `chat:conversation:${conversationId}:active_run`
}

export function conversationLockKey(conversationId: string): string {
  return `chat:conversation:${conversationId}:lock`
}
