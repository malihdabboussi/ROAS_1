const LEGACY_DEFAULTS = [
  /^chat with vibey$/i,
  /^chat with roas$/i,
  /^new conversation$/i,
  /^new agent$/i,
  /^team conversation$/i,
]

/** Strip auto-generated/legacy default titles in conversation UI. */
export function stripLegacySpacesConversationTitle(raw: string | null | undefined): string {
  const title = (raw ?? '').trim()
  if (!title) return ''
  if (LEGACY_DEFAULTS.some((re) => re.test(title))) return ''
  return title
}

export function isPlaceholderConversationTitle(raw: string | null | undefined): boolean {
  return stripLegacySpacesConversationTitle(raw).length === 0
}

/** Deterministic list title from the first user message when LLM naming fails. */
export function titleFromFirstUserMessage(
  raw: string | null | undefined,
  maxLen = 80,
): string {
  const collapsed = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!collapsed) return ''
  return collapsed.length > maxLen ? collapsed.slice(0, maxLen) : collapsed
}

/**
 * Prefer a model-suggested title; otherwise use a first-message snippet so the
 * sidebar never stays on a blank / "Untitled" placeholder after a send.
 */
export function resolveSuggestedConversationTitle(
  suggested: string | null | undefined,
  firstUserMessage: string,
  maxLen = 80,
): string {
  const fromModel = (suggested ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
  if (fromModel && !isPlaceholderConversationTitle(fromModel)) return fromModel
  return titleFromFirstUserMessage(firstUserMessage, maxLen)
}
