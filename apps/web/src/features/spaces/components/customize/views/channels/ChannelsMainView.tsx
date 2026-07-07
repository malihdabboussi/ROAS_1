'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Hash, MessageSquare, Plus, Trash2, X } from 'lucide-react'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { ChannelPickerModal, useChannels } from '@/features/channels'
import {
  buildSpaceChannelViewPatch,
  getChannelIdsFromView,
} from '../../../../lib/space-channel-view-patch'
import type { ViewDef } from '../../../../types/space-schema'
import { CustomizeViewManagementSection } from '../../../customize-view-management-section'

export function ChannelsMainView({
  activeView,
  viewIconName,
  viewIconColor,
  nameDraft,
  setNameDraft,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  onClose,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onOpenSharingPermissions,
}: {
  activeView: ViewDef
  viewIconName: string
  viewIconColor: { textColor: string }
  nameDraft: string
  setNameDraft: (v: string) => void
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  onClose: () => void
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
}) {
  const { channels } = useChannels()
  const [pickerOpen, setPickerOpen] = useState(false)
  const channelById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  )
  const isSingleChannel = activeView.type === 'channel'
  const channelIds = getChannelIdsFromView(activeView)

  async function patchChannels(ids: string[]) {
    const activeId =
      activeView.channels_config?.active_channel_id &&
      ids.includes(activeView.channels_config.active_channel_id)
        ? activeView.channels_config.active_channel_id
        : ids[0]
    await onViewPatch(buildSpaceChannelViewPatch(activeView, ids, activeId))
  }

  async function removeChannel(channelId: string) {
    await patchChannels(channelIds.filter((id) => id !== channelId))
  }

  async function moveChannel(channelId: string, direction: -1 | 1) {
    const index = channelIds.indexOf(channelId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= channelIds.length) return
    const next = [...channelIds]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(nextIndex, 0, moved)
    await patchChannels(next)
  }

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconPicker
            className="z-10 shrink-0"
            value={viewIconName}
            color={activeView.icon_color}
            size="sm"
            onChange={(name) => void onViewPatch({ icon: name })}
            onColorChange={(colorId: IconColorId) => void onViewPatch({ icon_color: colorId })}
            customTrigger={
              <LucideIcon name={viewIconName} className={`h-4 w-4 ${viewIconColor.textColor}`} />
            }
          />
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim()
              if (!trimmed) {
                setNameDraft(activeView.name)
                return
              }
              if (trimmed !== activeView.name) void onViewPatch({ name: trimmed })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1 font-semibold text-[var(--foreground)] outline-none focus:border-[var(--border)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!isSingleChannel ? (
          <div className="space-y-2.5 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">
                  Pinned channels
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                aria-label="Add channel"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {channelIds.length === 0 ? (
              <p className="body-3 text-[var(--color-muted-foreground)]">
                No channels are pinned to this view yet.
              </p>
            ) : (
              <div className="space-y-1">
                {channelIds.map((channelId, index) => {
                  const channel = channelById.get(channelId)
                  return (
                    <div
                      key={channelId}
                      className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                        <span className="body-3 truncate text-[var(--foreground)]">
                          {channel?.name ?? 'Unavailable channel'}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => void moveChannel(channelId, -1)}
                          disabled={index === 0}
                          className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
                          aria-label="Move channel up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveChannel(channelId, 1)}
                          disabled={index === channelIds.length - 1}
                          className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
                          aria-label="Move channel down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeChannel(channelId)}
                          className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                          aria-label="Remove channel"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        <CustomizeViewManagementSection
          activeView={activeView}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onSharingPermissions={onOpenSharingPermissions}
        />
      </div>

      {!isSingleChannel ? (
        <ChannelPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          mode="multi"
          selectedChannelIds={channelIds}
          title="Add channels"
          description="Choose the channels that belong in this space's view."
          onSelectChannels={(selected) => {
            void patchChannels(selected.map((channel) => channel.id))
          }}
        />
      ) : null}
    </motion.div>
  )
}
