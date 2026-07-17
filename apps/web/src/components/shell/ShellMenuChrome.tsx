'use client'

import { useRouter } from 'next/navigation'
import { House, MessageSquare, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useShellStore, type ShellMenuMode } from './use-shell-store'

export function ShellMenuModeToggle() {
  const router = useRouter()
  const menuMode = useShellStore((s) => s.menuMode)
  const setMenuMode = useShellStore((s) => s.setMenuMode)

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
              if (id === 'home') router.push('/home')
            }}
            className={cn(
              'shell-menu-mode-tab',
              menuMode === id && 'shell-menu-mode-tab-active',
            )}
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
  const router = useRouter()
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setMenuMode = useShellStore((s) => s.setMenuMode)

  return (
    <div className="mb-3.5">
      <button
        type="button"
        onClick={() => {
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

export function ShellSidebarSearchButton({
  onClick,
  embedded = false,
}: {
  onClick: () => void
  /** When true, render as a flex child (no outer margin) for toolbar rows. */
  embedded?: boolean
}) {
  const button = (
    <button type="button" onClick={onClick} className="hub-menu-link-row text-muted-foreground">
      <Search />
      <span>Search</span>
    </button>
  )
  if (embedded) return button
  return <div className="mb-1.5">{button}</div>
}
