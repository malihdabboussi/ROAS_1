import { rememberWorkAreaPage, type ShellWorkAreaPageTarget } from './shell-work-area-page'

export interface ShellWorkAreaConversationSlice {
  /** Last work-area page per conversation (persisted). */
  lastWorkAreaPageByConversation: Record<string, ShellWorkAreaPageTarget>
  recordWorkAreaPage: (target: ShellWorkAreaPageTarget, conversationId?: string | null) => void
}

type WorkAreaConversationHostState = ShellWorkAreaConversationSlice & {
  recentWorkAreaPages: ShellWorkAreaPageTarget[]
}

type WorkAreaConversationSet = (
  partial:
    | Partial<WorkAreaConversationHostState>
    | ((state: WorkAreaConversationHostState) => Partial<WorkAreaConversationHostState>),
) => void

type WorkAreaConversationPersist = (partial: {
  lastWorkAreaPageByConversation?: Record<string, ShellWorkAreaPageTarget>
}) => void

export function createShellWorkAreaConversationSlice(
  set: WorkAreaConversationSet,
  persist: WorkAreaConversationPersist,
): ShellWorkAreaConversationSlice {
  return {
    lastWorkAreaPageByConversation: {},
    recordWorkAreaPage: (target, conversationId) => {
      if (new URLSearchParams(target.href.split('?')[1] ?? '').has('conv')) return
      set((s) => {
        const title = target.title.trim() || target.href
        const titleKey = title.toLocaleLowerCase()
        // A feature host and the top bar can both record the same surface id —
        // never let the payload-less record drop the host's restore payload.
        const restore =
          target.restore ?? s.recentWorkAreaPages.find((entry) => entry.id === target.id)?.restore
        const page: ShellWorkAreaPageTarget = {
          id: target.id,
          title,
          href: target.href,
          ...(restore ? { restore } : {}),
        }
        const lastWorkAreaPageByConversation = rememberWorkAreaPage(
          s.lastWorkAreaPageByConversation,
          conversationId ?? target.conversationId,
          page,
        )
        persist({ lastWorkAreaPageByConversation })
        return {
          lastWorkAreaPageByConversation,
          recentWorkAreaPages: [
            page,
            ...s.recentWorkAreaPages.filter(
              (entry) =>
                entry.id !== target.id && entry.title.trim().toLocaleLowerCase() !== titleKey,
            ),
          ].slice(0, 8),
        }
      })
    },
  }
}
