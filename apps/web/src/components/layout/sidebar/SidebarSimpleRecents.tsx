'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ShellChatMenu } from '@/components/shell/ShellChatMenu'

export function SidebarSimpleRecents({ navigation }: { navigation: ReactNode }) {
  const [open, setOpen] = useState(true)
  if (!open) {
    return (
      <div className="px-spacing-2 py-spacing-1">
        <button
          type="button"
          className="hub-menu-section-label gap-spacing-1 group !mb-0 flex w-full items-center text-left"
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          Recents
          <ChevronRight className="icon-xs" aria-hidden />
        </button>
      </div>
    )
  }
  return (
    <ShellChatMenu
      navigationSlot={navigation}
      simpleSidebar
      compactHeaderTitleClassName="body-4 text-tertiary font-semibold uppercase"
      compactHeaderEndSlot={
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground ml-spacing-1 inline-flex shrink-0 items-center justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          onClick={() => setOpen(false)}
          aria-label="Collapse Recents"
          aria-expanded
        >
          <ChevronDown className="icon-xs" aria-hidden />
        </button>
      }
    />
  )
}
