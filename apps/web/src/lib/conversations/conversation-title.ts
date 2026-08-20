const LEGACY_DEFAULTS = [
  /^chat with vibey$/i,
  /^chat with roas$/i,
  /^new conversation$/i,
  /^new agent$/i,
  /^team conversation$/i,
  /^slack chat$/i,
  /^untitled conversation$/i,
  /^channel$/i,
]

const RAW_OPENERS =
  /^(hi|hey|hello|yo|sup|all right|alright|ok|okay|so|can you|could you|do we|do you|let me|please|thanks|thank you|hrey)\b/i

type ConversationTitleRecord = {
  title?: string | null
  metadata?: Record<string, unknown> | null
}

export function isMeetingConversation(
  conversation: Pick<ConversationTitleRecord, 'metadata'>,
): boolean {
  const metadata = conversation.metadata
  if (!metadata) return false
  return metadata.context_type === 'meeting' || Boolean(metadata.meeting_item_id)
}

/** User-facing title without prefixes that are already represented by row iconography. */
export function getConversationDisplayTitle(conversation: ConversationTitleRecord): string {
  const title = stripLegacySpacesConversationTitle(conversation.title)
  if (!isMeetingConversation(conversation)) return title
  return title.replace(/^meeting\s*[—–-]\s*/i, '').trim()
}

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

/** Meeting threads keep the meeting name. Recap prompts must not rename them. */
export function shouldAutogenConversationTitle(
  conversation: ConversationTitleRecord,
  firstUserMessage?: string | null,
): boolean {
  if (isMeetingConversation(conversation)) return false
  return needsGeneratedConversationTitle(conversation.title, firstUserMessage)
}

/** First-message titles never replace a meeting thread's meeting name. */
export function canApplyFirstMessageTitle(
  conversation: ConversationTitleRecord | null | undefined,
  mode: 'placeholder' | 'reaffirm' = 'placeholder',
): boolean {
  if (!conversation || isMeetingConversation(conversation)) return false
  return mode === 'reaffirm'
    ? shouldReaffirmFirstMessageTitle(conversation.title)
    : isPlaceholderConversationTitle(conversation.title)
}

/**
 * True when the stored title still looks like a raw first-message dump (or a
 * legacy placeholder) rather than a short topic label like Claude/ChatGPT.
 */
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

function cleanMessageForTitle(raw: string): string {
  return raw
    .replace(/<((?:https?:\/\/|mailto:)[^>|]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:\/\/[^>]+)>/g, '')
    .replace(/<@([A-Z0-9]+)>/gi, '')
    .replace(/<#([A-Z0-9]+)\|([^>]+)>/gi, '$2')
    .replace(/<#([A-Z0-9]+)>/gi, '')
    .replace(/:([a-z0-9_+-]+):/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Deterministic list title from the first user message when LLM naming fails. */
export function titleFromFirstUserMessage(raw: string | null | undefined, maxLen = 48): string {
  const collapsed = cleanMessageForTitle(raw ?? '')
  if (!collapsed) return ''
  const sentence = collapsed.split(/(?<=[.!?])\s+/)[0] ?? collapsed
  if (sentence.length <= maxLen) return sentence
  const sliced = sentence.slice(0, maxLen)
  const boundary = sliced.lastIndexOf(' ')
  return (boundary > 16 ? sliced.slice(0, boundary) : sliced).trim()
}

/**
 * Prefer a model-suggested title; otherwise use a first-message snippet so the
 * sidebar never stays on a blank / "Untitled" placeholder after a send.
 */
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

/** Preserve a curated generated title when the successful turn finishes after title generation. */
export function shouldReaffirmFirstMessageTitle(raw: string | null | undefined): boolean {
  return needsGeneratedConversationTitle(raw)
}
