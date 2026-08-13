'use client'

import Link from 'next/link'
import type { RefObject } from 'react'
import { ChevronDown, FolderKanban, Share2, User, Zap } from 'lucide-react'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
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
  onOpenShare?: () => void
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
  const folderHref = activeSpace.campaign_id
    ? `/campaigns/${activeSpace.campaign_id}`
    : '/campaigns'

  const trail = (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link
          href={folderHref}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {activeSpace.campaign_id ? (
            <FolderKanban className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <User className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="max-w-[120px] truncate">{folderLabel}</span>
        </Link>

        <span className="text-muted-foreground/50 select-none">/</span>

        <button
          ref={switcherTriggerRef}
          type="button"
          onClick={onToggleSwitcher}
          className="text-foreground hover:text-foreground/80 flex min-w-0 max-w-[min(100%,280px)] items-center gap-1 font-medium transition-colors"
          aria-label="Open space menu"
        >
          <LucideIcon
            name={spaceIconName}
            className={`h-3.5 w-3.5 shrink-0 ${spaceIconColor.textColor}`}
          />
          <span className="min-w-0 max-w-[200px] truncate">{activeSpace.title ?? 'Space'}</span>
          <ChevronDown
            className={`text-muted-foreground h-3 w-3 shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip label="Flows" side="bottom">
          <span className="inline-flex">
            <button
              type="button"
              onClick={onOpenAutomations}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1.5 transition-colors"
              aria-label="Flows"
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
            </button>
          </span>
        </Tooltip>
        {onOpenShare ? (
          <button
            type="button"
            onClick={onOpenShare}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            Share
          </button>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <ShellBreadcrumb label={`${folderLabel} / ${activeSpace.title}`}>{trail}</ShellBreadcrumb>
      {activeSpace.description ? (
        <p className="text-muted-foreground px-4 pb-2 pt-3 text-xs">{activeSpace.description}</p>
      ) : null}
    </>
  )
}
