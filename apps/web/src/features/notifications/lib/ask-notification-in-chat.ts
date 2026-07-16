import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'

export const ATTACH_NOTIFICATION_EVENT = 'space-vibey:attach-notification'

export type AttachNotificationDetail = {
  id: string
  label: string
  kind: 'notification' | 'awareness'
}

function truncateLabel(value: string, max = 80): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function buildComposerPrompt(input: {
  typeLabel: string
  title: string
  body?: string | null
}): string {
  const parts = [
    'Help me with this notification.',
    '',
    `Type: ${input.typeLabel}`,
    `Title: ${input.title.trim()}`,
  ]
  const body = input.body?.trim()
  if (body) {
    parts.push('', body)
  }
  return parts.join('\n')
}

/** Open global chat, attach the feed item as a chip, and prefill the composer. */
export function askAboutFeedItemInChat(input: {
  id: string
  kind: 'notification' | 'awareness'
  typeLabel: string
  title: string
  body?: string | null
}): void {
  const label = truncateLabel(input.title || input.typeLabel)
  const prompt = buildComposerPrompt(input)

  useGlobalChatStore.getState().expandAndFocus()
  useChatStore.getState().setPendingComposerText(prompt)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent<AttachNotificationDetail>(ATTACH_NOTIFICATION_EVENT, {
          detail: { id: input.id, label, kind: input.kind },
        }),
      )
    })
  })
}
