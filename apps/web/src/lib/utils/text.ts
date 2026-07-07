/**
 * Text utilities — emoji stripping, formatting.
 * Shared across chat, markdown renderer, and any agent-sourced content.
 */

const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu

/**
 * Strip emoji and symbols from text.
 * @param s - Input string (labels, status, content from agents)
 * @param options.preserveFormatting - If true, keeps newlines and whitespace (for content). If false, collapses spaces and trims (for labels).
 */
export function stripEmoji(s: string, options?: { preserveFormatting?: boolean }): string {
  const noEmoji = s.replace(EMOJI_REGEX, '')
  if (options?.preserveFormatting) return noEmoji
  return noEmoji.replace(/\s+/g, ' ').trim()
}
