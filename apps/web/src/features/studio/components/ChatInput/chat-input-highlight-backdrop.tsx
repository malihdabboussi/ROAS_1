import type { ReactNode } from 'react'
import type { SlashItem } from './chat-input-slash-menu'

const SLASH_CMD_REGEX = /(^|\s)(\/[a-zA-Z][a-zA-Z0-9_-]*)/gm
const HAS_SLASH_CMD_REGEX = /(^|\s)\/[a-zA-Z]/m

export function hasChatInputSlashCommand(text: string): boolean {
  return HAS_SLASH_CMD_REGEX.test(text)
}

export function renderChatInputHighlightBackdrop(
  text: string,
  slashItems: readonly Pick<SlashItem, 'key' | 'type'>[],
): ReactNode {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match
  SLASH_CMD_REGEX.lastIndex = 0
  while ((match = SLASH_CMD_REGEX.exec(text)) !== null) {
    const prefix = match[1]!
    const cmd = match[2]!
    const cmdKey = cmd.slice(1)
    const start = match.index
    if (start + prefix.length > lastIndex) {
      parts.push(text.slice(lastIndex, start + prefix.length))
    }
    const isSkill = slashItems.some((item) => item.type === 'skill' && item.key === cmdKey)
    parts.push(
      <span
        key={start}
        className={isSkill ? 'slash-skill-highlight' : 'slash-command-highlight'}
        style={{ color: 'transparent' }}
      >
        {cmd}
      </span>,
    )
    lastIndex = start + prefix.length + cmd.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  parts.push('\n')
  return parts
}
