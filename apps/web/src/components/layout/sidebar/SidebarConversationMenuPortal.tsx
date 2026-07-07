'use client'

import { createPortal } from 'react-dom'
import {
  Check,
  ChevronRight,
  Edit2,
  ExternalLink,
  FolderInput,
  Plus,
  Share2,
  Star,
  Trash2,
} from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import type { SidebarCampaignRow } from './sidebar-types'

type ConvRow = {
  id: string
  title?: string | null
  campaign_id?: string | null
  metadata?: Record<string, unknown> | null
}

export function SidebarConversationMenuPortal({
  conv,
  position,
  campaigns,
  moveSubmenuOpenId,
  showShare,
  onClose,
  onStartRename,
  onToggleFavorite,
  onToggleMoveSubmenu,
  onRequestNewCampaign,
  onMoveToCampaign,
  onDeleteConversation,
  onShareConversation,
}: {
  conv: ConvRow
  position: { top: number; left: number }
  campaigns: SidebarCampaignRow[]
  moveSubmenuOpenId: string | null
  showShare: boolean
  onClose: () => void
  onStartRename: () => void
  onToggleFavorite: () => void
  onToggleMoveSubmenu: () => void
  onRequestNewCampaign: () => void
  onMoveToCampaign: (campaignId: string | null) => void
  onDeleteConversation: () => void
  onShareConversation: () => void
}) {
  if (typeof document === 'undefined') return null
  const isFavorite = !!(conv.metadata as Record<string, unknown>)?.isFavorite
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => {
          onClose()
        }}
        aria-hidden
      />
      <div
        data-conv-menu
        className="fixed z-50 w-56 overflow-visible rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-lg"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {showShare && (
          <button
            onClick={onShareConversation}
            className="body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        )}
        <button
          onClick={onStartRename}
          className="body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
        >
          <Edit2 className="h-4 w-4" /> Rename
        </button>
        <button
          onClick={onToggleFavorite}
          className="body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
        >
          <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>

        <div className="relative">
          <button
            onClick={onToggleMoveSubmenu}
            className="body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
          >
            <FolderInput className="h-4 w-4" />
            <span className="flex-1 text-left">Move to Campaign</span>
            <ChevronRight className="h-3 w-3" />
          </button>
          {moveSubmenuOpenId === conv.id && (
            <div className="absolute left-full top-0 z-50 ml-1 w-56 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-lg">
              <button
                onClick={() => {
                  onRequestNewCampaign()
                }}
                className="body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
              >
                <Plus className="h-4 w-4" /> New Campaign
              </button>
              {campaigns.length > 0 && (
                <div className="my-1 border-t border-[var(--color-border)]" />
              )}
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onMoveToCampaign(c.id)}
                  className={`body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] ${
                    conv.campaign_id === c.id ? 'bg-[var(--color-primary)]/10' : ''
                  }`}
                >
                  <LucideIcon name={c.icon} className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">{c.name}</span>
                  {conv.campaign_id === c.id && (
                    <Check className="ml-auto h-3 w-3 text-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            openInNewTab(`/team/${conv.id}`)
            onClose()
          }}
          className="body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
        >
          <ExternalLink className="h-4 w-4" /> Open in new tab
        </button>

        <button
          onClick={() => void onDeleteConversation()}
          className="body-2 text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-3 py-1.5 transition-colors"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </>,
    document.body,
  )
}
