'use client'

import { usePathname, useRouter } from 'next/navigation'
import { House, MessageSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { isShellWorkspaceRoute } from './shell-route-policy'
import { useShellStore, type ShellMenuMode } from './use-shell-store'

export function ShellMenuModeToggle() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const menuMode = useShellStore((s) => s.menuMode)
  const setMenuMode = useShellStore((s) => s.setMenuMode)
  const chatDrawerOpen = useShellStore((s) => s.chatDrawer.open)
  const restoreChatDrawer = useShellStore((s) => s.restoreChatDrawer)

  const modes: { id: ShellMenuMode; label: string; icon: typeof House }[] = [
    { id: 'home', label: 'Home', icon: House },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ]

  return (
    <div className="mb-3">
      <div className="shell-menu-mode-toggle">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMenuMode(id)
              if (id === 'home') {
                router.push('/home')
                return
              }
              // Chat tab: show the chat menu. If the drawer is closed on a
              // workspace route, pull the chat up (restore last / empty drawer).
              if (id === 'chat' && isShellWorkspaceRoute(pathname) && !chatDrawerOpen) {
                restoreChatDrawer()
              }
            }}
            className={cn('shell-menu-mode-tab', menuMode === id && 'shell-menu-mode-tab-active')}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ShellSidebarNewButton() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const openFreshChatDrawer = useShellStore((s) => s.openFreshChatDrawer)
  const setMenuMode = useShellStore((s) => s.setMenuMode)

  return (
    <div className="mb-3.5">
      <button
        type="button"
        onClick={() => {
          if (isShellWorkspaceRoute(pathname)) {
            openFreshChatDrawer()
            return
          }
          requestNewChat()
          setMenuMode('chat')
          router.push('/home?chat=new')
        }}
        className="chip-glass-green shell-sidebar-new-btn"
      >
        <Plus />
        <span>New</span>
      </button>
    </div>
  )
}
