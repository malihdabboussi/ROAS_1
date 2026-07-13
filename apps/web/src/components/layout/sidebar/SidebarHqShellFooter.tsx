'use client'

import { MessageSquare } from 'lucide-react'
import { surfaceFromPathname } from '@/components/global-chat/config/work-context.config'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { cn } from '@/lib/utils/cn'
import { AvatarDropdown } from '../AvatarDropdown'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqShellFooter({
  c,
  expanded,
  pathname,
  featureUpdates,
  onChatNavigate,
  onChatHover,
}: {
  c: SidebarControllerReturn
  expanded: boolean
  pathname: string
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  onChatNavigate?: () => void
  onChatHover?: () => void
}) {
  const chatCollapsed = useGlobalChatStore((s) => s.collapsed)
  const setChatCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const expandChat = useGlobalChatStore((s) => s.expandAndFocus)

  const toggleChat = () => {
    if (!chatCollapsed) {
      setChatCollapsed(true)
      onChatNavigate?.()
      return
    }
    expandChat({ workContext: { surface: surfaceFromPathname(pathname) } })
    onChatNavigate?.()
  }

  const chatButton = (
    <button
      type="button"
      onClick={toggleChat}
      onMouseEnter={onChatHover}
      onFocus={onChatHover}
      className={cn(
        'flex transition-all',
        expanded
          ? 'nav-glass-hover-purple body-3 w-full items-center gap-2 rounded-lg px-3 py-2'
          : 'w-full flex-col items-center gap-1.5 px-1 py-2',
        expanded && !chatCollapsed && 'nav-glass-selected-purple nav-glass-text-purple',
      )}
      aria-label={chatCollapsed ? 'Open chat sidebar' : 'Close chat sidebar'}
      aria-pressed={!chatCollapsed}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-lg border border-transparent p-1.5 transition-all',
          expanded
            ? 'shrink-0 text-current'
            : !chatCollapsed
              ? 'nav-glass-selected-purple nav-glass-text-purple'
              : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <MessageSquare className="icon-md" />
      </span>
      <span
        className={cn(
          expanded ? 'body-3' : 'text-[10px] leading-tight',
          !chatCollapsed ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        Chat
      </span>
    </button>
  )

  const profileBlock = (
    <div
      className={cn(
        'flex gap-2',
        expanded ? 'items-center px-3 py-2' : 'flex-col items-center px-1 py-2',
      )}
    >
      <AvatarDropdown
        displayName={c.displayName}
        email={c.email ?? ''}
        avatarUrl={c.avatarUrl ?? null}
        initials={c.initials}
        sidebarCollapsed={!expanded}
        featureUpdates={featureUpdates}
      />
      {expanded ? (
        <span className="body-3 max-w-full truncate text-foreground">
          {c.displayName}
        </span>
      ) : null}
    </div>
  )

  return (
    <div
      className={cn(
        'hub-sidebar-shell-footer shrink-0',
        expanded ? 'space-y-0.5 px-2 py-2' : 'flex flex-col items-center gap-0.5 px-1 py-2',
      )}
    >
      {chatButton}
      {profileBlock}
    </div>
  )
}
