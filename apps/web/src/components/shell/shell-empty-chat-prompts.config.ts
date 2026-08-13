import type { LucideIcon } from 'lucide-react'

/** Placeholders for empty / new conversations (ClickUp Brain–style). */
export const SHELL_EMPTY_CHAT_PLACEHOLDER = 'Ask, create, search, @ to mention…'

/**
 * Single quick-start row above the empty-chat composer.
 * One curated set — not duplicated under the hero or as a second pill row.
 */
export interface ShellEmptyChatQuickStart {
  id: string
  label: string
  icon: LucideIcon
  iconName: string
  prompt: string
  systemContext: string
}

export type ShellChatQuickStart = ShellEmptyChatQuickStart
