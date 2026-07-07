import { getSlashTokenAtCursor } from '../../utils/textarea-caret-viewport'
import { getSlashTokenBackspaceDeleteFrom } from './chat-input-slash-menu'

interface SlashSelectionTextUpdate {
  nextText: string
  cursor: number
}

interface SlashBackspaceTextUpdate extends SlashSelectionTextUpdate {
  changed: boolean
}

export function getSlashSelectionTextUpdate(
  text: string,
  cursor: number,
  itemKey: string,
): SlashSelectionTextUpdate {
  const safeCursor = Math.min(cursor, text.length)
  const token = getSlashTokenAtCursor(text, safeCursor)
  const insert = `/${itemKey} `
  if (!token) {
    return { nextText: insert, cursor: insert.length }
  }
  return {
    nextText: text.slice(0, token.from) + insert + text.slice(safeCursor),
    cursor: token.from + insert.length,
  }
}

export function getSlashBackspaceTextUpdate(
  text: string,
  cursor: number,
  knownKeys: readonly string[],
): SlashBackspaceTextUpdate {
  const from = getSlashTokenBackspaceDeleteFrom(text, cursor, knownKeys)
  if (from === null) {
    return { changed: false, nextText: text, cursor }
  }
  return {
    changed: true,
    nextText: text.slice(0, from) + text.slice(cursor),
    cursor: from,
  }
}
