import { PASTED_TEXT_CHAR_THRESHOLD } from './pasted-text.constants'

export function getLargePasteTextFromClipboard(
  clipboardData: DataTransfer | null | undefined,
): string | null {
  if (!clipboardData) return null
  const text = clipboardData.getData('text/plain')
  if (!text || text.length < PASTED_TEXT_CHAR_THRESHOLD) return null
  return text
}
