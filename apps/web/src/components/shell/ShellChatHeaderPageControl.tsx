'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PanelRight } from 'lucide-react'
import { isFullHomeConversation } from './shell-chat-header-page'
import { useShellStore } from './use-shell-store'

/** Page show/collapse control. Chat header owns it only while the page card is closed. */
export function ShellChatHeaderPageControl() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const convParam = useSearchParams().get('conv')
  const workAreaOpen = useShellStore((state) => state.workAreaOpen)
  const artifactTarget = useShellStore((state) => state.artifactViewer.target)
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)
  const openChatDrawer = useShellStore((state) => state.openChatDrawer)
  const lastWorkAreaPageByConversation = useShellStore(
    (state) => state.lastWorkAreaPageByConversation,
  )
  const drawerConversationId = useShellStore((state) => state.chatDrawer.conversationId)
  const conversationId = convParam ?? drawerConversationId
  const rememberedPage = conversationId ? lastWorkAreaPageByConversation[conversationId] : undefined
  const fullHomeConversation = isFullHomeConversation(pathname, convParam)

  if (artifactTarget || (fullHomeConversation ? !rememberedPage : workAreaOpen)) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (fullHomeConversation && rememberedPage) {
          if (convParam) openChatDrawer(convParam)
          setWorkAreaOpen(true)
          if (rememberedPage?.restore) {
            useShellStore.getState().setPendingWorkRestore(rememberedPage.restore)
          }
          router.push(rememberedPage.href)
          return
        }
        setWorkAreaOpen(true)
      }}
      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
      aria-label="Show page"
      title="Show page"
    >
      <PanelRight className="icon-sm" aria-hidden />
    </button>
  )
}
