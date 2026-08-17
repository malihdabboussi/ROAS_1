'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PanelRight } from 'lucide-react'
import { isFullHomeConversation, resolveWorkAreaRestoreHref } from './shell-chat-header-page'
import { useShellStore } from './use-shell-store'

/** Page show/collapse control that sits in the chat header beside the summary toggle. */
export function ShellChatHeaderPageControl() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const conversationId = useSearchParams().get('conv')
  const workAreaOpen = useShellStore((state) => state.workAreaOpen)
  const toggleWorkAreaOpen = useShellStore((state) => state.toggleWorkAreaOpen)
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)
  const openChatDrawer = useShellStore((state) => state.openChatDrawer)
  const recentPages = useShellStore((state) => state.recentWorkAreaPages)
  const fullHomeConversation = isFullHomeConversation(pathname, conversationId)
  const showPage = fullHomeConversation || !workAreaOpen
  const label = showPage ? 'Show page' : 'Collapse page — chat full screen'

  return (
    <button
      type="button"
      onClick={() => {
        if (fullHomeConversation) {
          if (conversationId) openChatDrawer(conversationId)
          setWorkAreaOpen(true)
          router.push(resolveWorkAreaRestoreHref(recentPages))
          return
        }
        toggleWorkAreaOpen()
      }}
      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
      aria-label={label}
      title={label}
      aria-pressed={!showPage}
    >
      <PanelRight className="icon-sm" aria-hidden />
    </button>
  )
}
