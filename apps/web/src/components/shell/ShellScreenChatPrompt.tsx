'use client'

import { ChevronRight, MessageSquare, X } from 'lucide-react'
import { SHELL_SCREEN_CHAT_MESSAGES } from './shell-screen-chat.config'
import { useShellStore } from './use-shell-store'

/** Non-blocking "switch to your last <screen> chat?" offer after a navigation. */
export function ShellScreenChatPrompt() {
  const prompt = useShellStore((s) => s.screenChatPrompt)
  const acceptScreenChatPrompt = useShellStore((s) => s.acceptScreenChatPrompt)
  const dismissScreenChatPrompt = useShellStore((s) => s.dismissScreenChatPrompt)

  if (!prompt) return null

  return (
    <div className="chat-surface-rec-banner mx-spacing-2 mt-spacing-2 gap-spacing-1 flex shrink-0 items-center">
      <button
        type="button"
        className="hover:bg-hover-subtle gap-spacing-2 p-spacing-1 flex min-w-0 flex-1 items-center rounded-lg text-left transition-colors"
        aria-label={SHELL_SCREEN_CHAT_MESSAGES.switchLabel(prompt.screenLabel)}
        onClick={acceptScreenChatPrompt}
      >
        <MessageSquare className="icon-sm text-primary shrink-0" aria-hidden />
        <span className="body-4 text-foreground min-w-0 flex-1">
          {SHELL_SCREEN_CHAT_MESSAGES.switchPrompt(prompt.screenLabel)}
        </span>
        <ChevronRight className="icon-sm text-muted-foreground shrink-0" aria-hidden />
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors"
        aria-label={SHELL_SCREEN_CHAT_MESSAGES.dismissLabel}
        onClick={dismissScreenChatPrompt}
      >
        <X className="icon-sm" aria-hidden />
      </button>
    </div>
  )
}
