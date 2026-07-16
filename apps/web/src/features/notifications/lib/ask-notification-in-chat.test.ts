/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ATTACH_NOTIFICATION_EVENT, askAboutFeedItemInChat } from './ask-notification-in-chat'

const expandAndFocus = vi.fn()
const setPendingComposerText = vi.fn()

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: {
    getState: () => ({ expandAndFocus }),
  },
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: {
    getState: () => ({ setPendingComposerText }),
  },
}))

describe('askAboutFeedItemInChat', () => {
  beforeEach(() => {
    expandAndFocus.mockClear()
    setPendingComposerText.mockClear()
  })

  it('opens chat, prefills composer, and dispatches attach event', async () => {
    const events: CustomEvent[] = []
    const handler = (event: Event) => {
      events.push(event as CustomEvent)
    }
    window.addEventListener(ATTACH_NOTIFICATION_EVENT, handler as EventListener)

    askAboutFeedItemInChat({
      id: 'n-1',
      kind: 'notification',
      typeLabel: 'Skill Gap',
      title: 'Skill gap detected for mission Webinar',
      body: 'roas-webinar-emails is missing',
    })

    expect(expandAndFocus).toHaveBeenCalledTimes(1)
    expect(setPendingComposerText).toHaveBeenCalledWith(
      expect.stringContaining('Help me with this notification.'),
    )
    expect(setPendingComposerText).toHaveBeenCalledWith(
      expect.stringContaining('Skill gap detected for mission Webinar'),
    )

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })

    expect(events).toHaveLength(1)
    expect(events[0]?.detail).toEqual({
      id: 'n-1',
      label: 'Skill gap detected for mission Webinar',
      kind: 'notification',
    })

    window.removeEventListener(ATTACH_NOTIFICATION_EVENT, handler as EventListener)
  })
})
