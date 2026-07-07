/** Past ~2 lines in artifact preview cards; longer bullets get extra vertical margin */
export const LONG_LIST_ITEM_CHAR_THRESHOLD = 130

export function isLongListItemText(text: string): boolean {
  return text.replace(/\s+/g, ' ').trim().length > LONG_LIST_ITEM_CHAR_THRESHOLD
}
