const LEGACY_DEFAULTS = [
  /^chat with vibey$/i,
  /^chat with roas$/i,
  /^new conversation$/i,
  /^new agent$/i,
  /^team conversation$/i,
  /^slack chat$/i,
  /^untitled conversation$/i,
]

/**
 * Injected context blocks the platform prepends to agent prompts. They must
 * never become conversation titles: strip them before deriving a title, and
 * treat any title that begins with one as needing regeneration. (Prod 2026-08-19:
 * eleven Slack chats were titled "[Ask kind] Kind: client Signals: …".)
 */
const INJECTED_CONTEXT_HEADERS = [
  'Ask kind',
  'Slack channel identity',
  'Client context',
  'Assets',
  'Slack thread context',
  'Current message',
  'Quoted message identity',
  'Forwarded Slack message',
  'Forwarded thread context',
  'Recent channel discussion',
]
const INJECTED_HEADER_PATTERN = new RegExp(
  `^\\[(?:${INJECTED_CONTEXT_HEADERS.join('|')})\\]`,
)

export function stripInjectedContextBlocks(raw: string | null | undefined): string {
  let text = raw ?? ''
  if (!text.includes('[')) return text
  // The thread wrapper labels the human's ask explicitly — prefer it outright.
  const current = text.match(/\[Current message\]\n([^]+)/)?.[1]
  if (current) text = current
  const headers = INJECTED_CONTEXT_HEADERS.join('|')
  // Drop each bracketed block: its header line through the blank line ending it.
  text = text.replace(
    new RegExp(`\\[(?:${headers})\\][^]*?(\\n\\n|$)`, 'g'),
    '\n',
  )
  return text.trim()
}

export function startsWithInjectedContextHeader(raw: string | null | undefined): boolean {
  return INJECTED_HEADER_PATTERN.test((raw ?? '').trim())
}

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
  if (startsWithInjectedContextHeader(raw)) return true
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
  const collapsed = stripInjectedContextBlocks(raw)
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

/** Prefer a Gemini topic; otherwise keep/restore the first-message snippet. */
export function pickGeneratedConversationTitle(input: {
  currentTitle: string | null
  firstMessage: string
  suggested: string
}): string | null {
  const next = resolveSuggestedConversationTitle(input.suggested, input.firstMessage, 60)
  if (!next || next === input.currentTitle) return null
  return next
}
