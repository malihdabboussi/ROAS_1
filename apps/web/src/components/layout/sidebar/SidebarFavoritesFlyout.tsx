'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, ExternalLink, FolderKanban, LayoutGrid, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import { programDisplayName, type Program } from '@/lib/programs'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import type { SidebarCampaignRow } from './sidebar-types'

export function SidebarFavoritesFlyout({
  favoritePrograms,
  favoriteCampaigns,
  favoriteSpaces,
  onToggleProgramFavorite,
  onToggleCampaignFavorite,
  onToggleSpaceFavorite,
}: {
  favoritePrograms: Program[]
  favoriteCampaigns: SidebarCampaignRow[]
  favoriteSpaces: Space[]
  onToggleProgramFavorite?: (program: Program) => void
  onToggleCampaignFavorite?: (campaign: SidebarCampaignRow) => void
  onToggleSpaceFavorite?: (space: Space) => void
}) {
  const [contextItem, setContextItem] = useState<{
    label: string
    href: string
    top: number
    left: number
    onRemove?: () => void
  } | null>(null)
  useEffect(() => {
    if (!contextItem) return
    const close = () => setContextItem(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [contextItem])

  const favorites = [
    ...favoritePrograms.map((program) => ({
      id: `program-${program.id}`,
      label: programDisplayName(program),
      href: `/programs/${program.id}`,
      icon: FolderKanban,
      onClick: undefined,
      onRemove: onToggleProgramFavorite ? () => onToggleProgramFavorite(program) : undefined,
    })),
    ...favoriteCampaigns.map((campaign) => ({
      id: `campaign-${campaign.id}`,
      label: campaign.name,
      href: `/campaigns/${campaign.id}`,
      icon: Star,
      onClick: undefined,
      onRemove: onToggleCampaignFavorite ? () => onToggleCampaignFavorite(campaign) : undefined,
    })),
    ...favoriteSpaces.map((space) => ({
      id: `space-${space.id}`,
      label: space.title,
      href: '/spaces',
      icon: LayoutGrid,
      onClick: () => {
        useSpacesStore.getState().setActiveSpace(space.id)
        useGlobalChatStore.getState().setCollapsed(true)
      },
      onRemove: onToggleSpaceFavorite ? () => onToggleSpaceFavorite(space) : undefined,
    })),
  ].slice(0, 12)

  if (favorites.length === 0) return null

  return (
    <nav>
      {favorites.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={item.onClick}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setContextItem({
                label: item.label,
                href: item.href,
                top: event.clientY,
                left: event.clientX,
                onRemove: item.onRemove,
              })
            }}
            data-hub-dock-navigate
            className="hub-dock-flyout-row !py-spacing-1"
          >
            <Icon aria-hidden />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        )
      })}
      {contextItem && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="menu"
              aria-label={`${contextItem.label} actions`}
              className="surface-card border-border z-dropdown rounded-spacing-2 p-spacing-2 fixed min-w-56 border shadow-lg"
              style={{ top: contextItem.top, left: contextItem.left }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="gap-spacing-1 flex flex-col">
                <button
                  type="button"
                  className="hub-dock-flyout-row"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}${contextItem.href}`,
                    )
                    toast.success('Link copied')
                    setContextItem(null)
                  }}
                >
                  <Copy aria-hidden />
                  Copy link
                </button>
                <button
                  type="button"
                  className="hub-dock-flyout-row"
                  onClick={() => {
                    openInNewTab(contextItem.href)
                    setContextItem(null)
                  }}
                >
                  <ExternalLink aria-hidden />
                  Open in new tab
                </button>
                {contextItem.onRemove ? (
                  <button
                    type="button"
                    className="hub-dock-flyout-row"
                    onClick={() => {
                      contextItem.onRemove?.()
                      setContextItem(null)
                    }}
                  >
                    <Star aria-hidden />
                    Remove from favorites
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </nav>
  )
}
