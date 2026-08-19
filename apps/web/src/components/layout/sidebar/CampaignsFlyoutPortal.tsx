'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { Pin, Plus } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'

export function CampaignsFlyoutPortal({
  anchorRef,
  campaigns,
  activeCampaignId,
  onSelect,
  onCreateNew,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  campaigns: {
    id: string
    name: string
    icon: string
    isPinned: boolean
    isSystemGeneral: boolean
    isSystemPersonal?: boolean
  }[]
  activeCampaignId: string | null
  onSelect: (c: { id: string; name: string; icon: string }) => void
  onCreateNew: () => void
  onClose: () => void
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.top, left: rect.right + 8 })
  }, [anchorRef])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('[data-flyout-campaigns]') &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorRef])

  return (
    <div
      data-flyout-campaigns
      className="fixed z-50 w-64 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Campaigns
        </span>
        <button
          onClick={onCreateNew}
          aria-label="New campaign"
          title="New campaign"
          className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
        >
          <Plus className="icon-md shrink-0" />
        </button>
      </div>
      <div className="scrollbar-hide max-h-[250px] overflow-y-auto py-1">
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`nav-glass-hover-purple flex w-full items-center gap-2 px-3 py-1.5 text-left transition-all ${
              activeCampaignId === c.id
                ? 'nav-glass-selected-purple nav-glass-text-purple'
                : 'text-[var(--color-muted-foreground)]'
            }`}
          >
            <LucideIcon name={c.icon} className="icon-md shrink-0" />
            <span className="body-2 truncate">{c.name}</span>
            {c.isPinned && <Pin className="ml-auto h-3 w-3 shrink-0 text-[var(--color-primary)]" />}
          </button>
        ))}
      </div>
    </div>
  )
}
