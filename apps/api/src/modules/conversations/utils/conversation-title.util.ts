const LEGACY_DEFAULTS = [
  /^chat with vibey$/i,
  /^chat with roas$/i,
  /^new conversation$/i,
  /^new agent$/i,
  /^team conversation$/i,
  /^slack chat$/i,
  /^untitled conversation$/i,
]

const RAW_OPENERS =
  /^(hi|hey|hello|yo|sup|all right|alright|ok|okay|so|can you|could you|do we|do you|let me|please|thanks|thank you|hrey)\b/i

export function isPlaceholderConversationTitle(raw: string | null | undefined): boolean {
  const title = (raw ?? '').trim()
  if (!title) return true
  return LEGACY_DEFAULTS.some((re) => re.test(title))
}

export function needsGeneratedConversationTitle(
  raw: string | null | undefined,
  firstUserMessage?: string | null,
): boolean {
  if (isPlaceholderConversationTitle(raw)) return true
  const title = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!title) return true
  if (/<[#@]!?[A-Z0-9]+/i.test(title)) return true
  const words = title.split(' ').filter(Boolean)
  if (words.length >= 8) return true
  if (title.length >= 48) return true
  if (/^(hi|hey|hello|yo)[\s!.?]*$/i.test(title)) return true
  if (RAW_OPENERS.test(title) && words.length >= 3) return true
  if (firstUserMessage) {
    const snippet = titleFromFirstUserMessage(firstUserMessage, 48)
    if (snippet && title === snippet) return true
  }
  return false
}

export function titleFromFirstUserMessage(raw: string | null | undefined, maxLen = 48): string {
  const collapsed = (raw ?? '')
    .replace(/<((?:https?:\/\/|mailto:)[^>|]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:\/\/[^>]+)>/g, '')
    .replace(/<@([A-Z0-9]+)>/gi, '')
    .replace(/<#([A-Z0-9]+)\|([^>]+)>/gi, '$2')
    .replace(/<#([A-Z0-9]+)>/gi, '')
    .replace(/:([a-z0-9_+-]+):/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!collapsed) return ''
  const sentence = collapsed.split(/(?<=[.!?])\s+/)[0] ?? collapsed
  if (sentence.length <= maxLen) return sentence
  const sliced = sentence.slice(0, maxLen)
  const boundary = sliced.lastIndexOf(' ')
  return (boundary > 16 ? sliced.slice(0, boundary) : sliced).trim()
}

export function resolveSuggestedConversationTitle(
  suggested: string | null | undefined,
  firstUserMessage: string,
  maxLen = 60,
): string {
  const fromModel = resolveGeneratedConversationTitle(suggested, maxLen)
  if (fromModel) return fromModel
  return titleFromFirstUserMessage(firstUserMessage, Math.min(maxLen, 48))
}

/** Model title only — never a first-message dump. Used for Slack and similar sources. */
export function resolveGeneratedConversationTitle(
  suggested: string | null | undefined,
  maxLen = 60,
): string {
  const fromModel = (suggested ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
  if (fromModel && !isPlaceholderConversationTitle(fromModel)) return fromModel
  return ''
}

/** Slack keeps `Slack Chat` until Gemini returns a topic; other chats may snippet-fallback. */
export function pickGeneratedConversationTitle(input: {
  currentTitle: string | null
  firstMessage: string
  suggested: string
  isSlack: boolean
}): string | null {
  const generated = input.isSlack
    ? resolveGeneratedConversationTitle(input.suggested, 60)
    : resolveSuggestedConversationTitle(input.suggested, input.firstMessage, 60)
  if (generated && generated !== input.currentTitle) return generated
  if (input.isSlack) return null
  const fallback = titleFromFirstUserMessage(input.firstMessage, 48)
  if (!fallback || fallback === input.currentTitle) return null
  return fallback
}
