import type { LucideIcon } from 'lucide-react'

/** Placeholders for empty / new conversations (ClickUp Brain–style). */
export const SHELL_EMPTY_CHAT_PLACEHOLDER = 'Ask, create, search, @ to mention…'

/** Create-menu / composer quick-start contract. */
export interface ShellEmptyChatQuickStart {
  id: string
  label: string
  icon: LucideIcon
  iconName: string
  prompt: string
  systemContext: string
}

export type ShellChatQuickStart = ShellEmptyChatQuickStart
