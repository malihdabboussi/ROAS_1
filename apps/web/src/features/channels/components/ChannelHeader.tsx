'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Component, FolderKanban, Lock, UserPlus } from 'lucide-react'
import {
  getCachedCampaigns,
  useCampaignCacheVersion,
} from '@/features/home/lib/home-feed-campaign-cache'
import type { Channel } from '../services/channels.service'
import { ChannelIcon } from './ChannelIcon'

export function ChannelHeader({
  channel,
  onOpenAddMembers,
  onRenameChannel,
  onStartBrainstorm,
  onOpenContextTab,
  headerActionsVariant = 'default',
}: {
  channel: Channel
  onOpenAddMembers: () => void
  onRenameChannel: (name: string) => Promise<void>
  onStartBrainstorm?: () => void
  /** Opens the channel's Context tab when the campaign chip is clicked. */
  onOpenContextTab?: () => void
  /** In Spaces, invites + brainstorm live in the space toolbar instead. */
  headerActionsVariant?: 'default' | 'titleOnly'
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(channel.name)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useCampaignCacheVersion()
  const boundCampaignId =
    typeof channel.metadata?.default_campaign_id === 'string' &&
    channel.metadata.default_campaign_id
      ? channel.metadata.default_campaign_id
      : null
  const boundCampaignName = boundCampaignId
    ? ((channel.org_id ? getCachedCampaigns(channel.org_id) : undefined)?.find(
        (campaign) => campaign.id === boundCampaignId,
      )?.name ?? 'Campaign')
    : null

  useLayoutEffect(() => {
    if (!editing) setDraft(channel.name)
  }, [channel.name, channel.id, editing])

  useLayoutEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  const cancelEdit = () => {
    setDraft(channel.name)
    setEditing(false)
  }

  const commitEdit = async () => {
    if (saving) return
    const trimmed = draft.trim()
    if (!trimmed) {
      cancelEdit()
      return
    }
    if (trimmed === channel.name) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onRenameChannel(trimmed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="shrink-0 px-4 py-2.5 md:px-6">
      <div className="gap-spacing-2 flex items-center">
        <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
          <ChannelIcon channel={channel} className="h-4 w-4 shrink-0" />
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              disabled={saving}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void commitEdit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelEdit()
                }
              }}
              className="body-2 text-foreground border-border bg-background focus-visible:ring-ring min-w-0 max-w-full flex-1 rounded-md border px-2 py-0.5 font-semibold uppercase leading-tight outline-none focus-visible:ring-2 disabled:opacity-60"
              aria-label="Channel name"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="body-2 text-foreground hover:text-foreground/90 min-w-0 truncate text-left font-semibold uppercase leading-tight transition-colors"
            >
              {channel.name}
            </button>
          )}
          {channel.is_private && (
            <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          {boundCampaignId && (
            <button
              type="button"
              onClick={onOpenContextTab}
              title="Channel context — agents use this campaign here"
              className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors"
            >
              <FolderKanban className="h-2.5 w-2.5" aria-hidden />
              {boundCampaignName}
            </button>
          )}
          {channel.description && (
            <span className="body-4 text-muted-foreground hidden truncate sm:block">
              {channel.description}
            </span>
          )}
        </div>

        {headerActionsVariant === 'default' ? (
          <div
            className="gap-spacing-2 flex shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onOpenAddMembers}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground body-4 gap-spacing-1 px-spacing-3 py-spacing-2 hidden items-center rounded-lg font-medium transition-all duration-200 sm:inline-flex"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              Add team members
            </button>
            <button
              type="button"
              onClick={onOpenAddMembers}
              className="btn-icon-glass rounded-spacing-2 sm:hidden"
              aria-label="Add team members"
            >
              <UserPlus className="icon-sm" />
            </button>
            {onStartBrainstorm && (
              <button
                type="button"
                onClick={onStartBrainstorm}
                className="btn-icon-glass rounded-spacing-2"
                aria-label="Start brainstorm"
              >
                <Component className="icon-sm" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
