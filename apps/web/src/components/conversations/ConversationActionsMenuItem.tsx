'use client'

import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ConversationActionsMenuItemProps {
  icon: ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
  selected?: boolean
  disabled?: boolean
}

export function ConversationActionsMenuItem(props: ConversationActionsMenuItemProps) {
  const { icon, label, onClick, destructive, selected, disabled } = props
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent',
        destructive
          ? 'text-red-600 hover:bg-red-500/10 [&_svg]:text-red-600'
          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)]',
      )}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected ? <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" /> : null}
    </button>
  )
}
