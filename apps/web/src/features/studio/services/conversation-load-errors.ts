export function isConversationUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|404|gone|deleted|insufficient permissions|forbidden|403/i.test(message)
}
