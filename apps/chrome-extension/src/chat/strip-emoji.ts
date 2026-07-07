const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu

export function stripEmoji(s: string, options?: { preserveFormatting?: boolean }): string {
  const noEmoji = s.replace(EMOJI_REGEX, '')
  if (options?.preserveFormatting) return noEmoji
  return noEmoji.replace(/\s+/g, ' ').trim()
}
