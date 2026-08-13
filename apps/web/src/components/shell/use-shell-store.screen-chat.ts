import { resolveScreenChatNavigation, type ShellChatScreen } from './shell-screen-chat.config'

export type ShellScreenChatPromptState = {
  screenKey: string
  screenLabel: string
  conversationId: string
}

export interface ShellScreenChatSlice {
  /** Last conversation opened per left-sidebar screen (persisted). */
  lastConversationByScreen: Record<string, string>
  /** Pending "switch to your last <screen> chat?" offer after a navigation. */
  screenChatPrompt: ShellScreenChatPromptState | null
  /** Stamp a conversation as the screen's last chat; invalidates any pending switch prompt. */
  recordScreenConversation: (screenKey: string, conversationId: string) => void
  /** Apply the navigation contract for the screen just navigated to (null = unscoped route). */
  handleScreenNavigation: (screen: ShellChatScreen | null) => void
  acceptScreenChatPrompt: () => void
  dismissScreenChatPrompt: () => void
}

/** Structural view of the shell store the slice reads and writes. */
type ScreenChatHostState = ShellScreenChatSlice & {
  chatDrawer: { open: boolean; conversationId: string | null; width: number; minimized: boolean }
  newChatNonce: number
  openChatDrawer: (conversationId?: string | null) => void
}

type ScreenChatSet = (
  partial:
    | Partial<ScreenChatHostState>
    | ((state: ScreenChatHostState) => Partial<ScreenChatHostState>),
) => void

type ScreenChatPersist = (partial: {
  screenConversations?: Record<string, string>
  chatDrawerConversationId?: string | null
}) => void

export function sanitizeScreenConversations(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

export function createShellScreenChatSlice(
  set: ScreenChatSet,
  get: () => ScreenChatHostState,
  persist: ScreenChatPersist,
): ShellScreenChatSlice {
  return {
    lastConversationByScreen: {},
    screenChatPrompt: null,
    recordScreenConversation: (screenKey, conversationId) => {
      const { lastConversationByScreen, screenChatPrompt } = get()
      if (lastConversationByScreen[screenKey] === conversationId && !screenChatPrompt) return
      const next = { ...lastConversationByScreen, [screenKey]: conversationId }
      set({ lastConversationByScreen: next, screenChatPrompt: null })
      persist({ screenConversations: next })
    },
    handleScreenNavigation: (screen) => {
      const { chatDrawer, lastConversationByScreen } = get()
      const decision = resolveScreenChatNavigation({
        screen,
        chatPaneOpen: chatDrawer.open,
        openConversationId: chatDrawer.conversationId,
        lastScreenConversationId: screen ? (lastConversationByScreen[screen.key] ?? null) : null,
      })
      if (decision.type === 'keep-and-prompt' && screen) {
        set({
          screenChatPrompt: {
            screenKey: screen.key,
            screenLabel: screen.label,
            conversationId: decision.conversationId,
          },
        })
        return
      }
      if (decision.type === 'fresh-chat') {
        set((s) => ({
          newChatNonce: s.newChatNonce + 1,
          chatDrawer: { ...s.chatDrawer, conversationId: null },
          screenChatPrompt: null,
        }))
        persist({ chatDrawerConversationId: null })
        return
      }
      if (get().screenChatPrompt) set({ screenChatPrompt: null })
    },
    acceptScreenChatPrompt: () => {
      const prompt = get().screenChatPrompt
      if (!prompt) return
      get().openChatDrawer(prompt.conversationId)
      get().recordScreenConversation(prompt.screenKey, prompt.conversationId)
    },
    dismissScreenChatPrompt: () => {
      if (get().screenChatPrompt) set({ screenChatPrompt: null })
    },
  }
}
