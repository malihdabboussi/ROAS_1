const LEGACY_DEFAULTS = [
  /^chat with vibey$/i,
  /^new conversation$/i,
  /^new agent$/i,
  /^team conversation$/i,
]

/** Strip auto-generated/legacy default titles in conversation UI. */
export function stripLegacySpacesConversationTitle(raw: string | null | undefined): string {
  const title = (raw ?? '').trim()
  if (LEGACY_DEFAULTS.some((re) => re.test(title))) return ''
  return title
}
