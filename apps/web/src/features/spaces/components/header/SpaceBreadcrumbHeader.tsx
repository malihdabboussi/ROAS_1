'use client'

import type { RefObject } from 'react'
import { ChevronDown, FolderKanban, Share2, User, Zap } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { Tooltip } from '@/components/ui/tooltip'
import type { Space } from '../../types'

export type SpaceBreadcrumbHeaderProps = {
  activeSpace: Space
  folderLabel: string
  spaceIconName: string
  spaceIconColor: ReturnType<typeof getIconColor>
  switcherOpen: boolean
  switcherTriggerRef: RefObject<HTMLButtonElement | null>
  onToggleSwitcher: () => void
  onOpenAutomations: () => void
  onOpenShare: () => void
}

export function SpaceBreadcrumbHeader({
  activeSpace,
  folderLabel,
  spaceIconName,
  spaceIconColor,
  switcherOpen,
  switcherTriggerRef,
  onToggleSwitcher,
  onOpenAutomations,
  onOpenShare,
}: SpaceBreadcrumbHeaderProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="pl-spacing-2 flex min-w-0 items-center gap-1.5 text-sm">
          <div className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
            {activeSpace.campaign_id ? (
              <FolderKanban className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <User className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="max-w-[120px] truncate">{folderLabel}</span>
          </div>

          <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>

          <button
            ref={switcherTriggerRef}
            type="button"
            onClick={onToggleSwitcher}
            className="hover:text-[var(--foreground)]/80 flex min-w-0 max-w-[min(100%,280px)] items-center gap-1 font-medium text-[var(--foreground)] transition-colors"
            aria-label="Open space menu"
          >
            <LucideIcon
              name={spaceIconName}
              className={`h-3.5 w-3.5 shrink-0 ${spaceIconColor.textColor}`}
            />
            <span className="min-w-0 max-w-[200px] truncate">{activeSpace.title ?? 'Space'}</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform ${switcherOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip label="Flows" side="bottom">
            <span className="inline-flex">
              <button
                type="button"
                onClick={onOpenAutomations}
                className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                aria-label="Flows"
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
              </button>
            </span>
          </Tooltip>
          <button
            type="button"
            onClick={onOpenShare}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            Share
          </button>
        </div>
      </div>
      {activeSpace.description && (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {activeSpace.description}
        </p>
      )}
    </div>
  )
}
