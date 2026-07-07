'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RxDoubleArrowLeft, RxDoubleArrowRight } from 'react-icons/rx'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, MoreHorizontal } from 'lucide-react'
import { ChannelIcon, ChannelListActionsHost } from '@/components/channels'
import { useChannelUnread, useChannels, type Channel } from '@/lib/channels'
import { cn } from '@/lib/utils/cn'

/** Matches `globals.css` --spacing-60 / `w-spacing-60` (expanded rail). */
const CHANNELS_RAIL_EXPANDED_PX = 240
/** Matches spaces chat collapsed rail width. */
const CHANNELS_RAIL_COLLAPSED_PX = 48

const railWidthTransition = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1] as const,
}

const innerPresenceTransition = {
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1] as const,
}

const GROUP_HEADER_CLS =
  'px-spacing-2 pb-1 pt-1 typo-section-label text-muted-foreground'

export function SpaceChannelsSidebar({
  channelIds,
  channelsById,
  activeChannelId,
  spaceId,
  onSelectChannel,
  onRemoveChannel,
}: {
  channelIds: string[]
  channelsById: Map<string, Channel>
  activeChannelId: string | undefined
  spaceId?: string | null
  onSelectChannel: (channelId: string) => void
  onRemoveChannel: (channelId: string) => void
}) {
  const { channels, updateChannel } = useChannels()
  const { markRead } = useChannelUnread()
  const liveChannelsById = useMemo(() => {
    const map = new Map(channelsById)
    for (const channel of channels) {
      map.set(channel.id, channel)
    }
    return map
  }, [channelsById, channels])
  const [collapsed, setCollapsed] = useState(false)
  const [menuChannelId, setMenuChannelId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const menuChannel = menuChannelId ? (liveChannelsById.get(menuChannelId) ?? null) : null

  const { favoriteChannelIds, otherChannelIds } = useMemo(() => {
    const favorite: string[] = []
    const other: string[] = []
    for (const id of channelIds) {
      if (liveChannelsById.get(id)?.is_favorite) favorite.push(id)
      else other.push(id)
    }
    return { favoriteChannelIds: favorite, otherChannelIds: other }
  }, [channelIds, liveChannelsById])

  const orderedChannelIds = useMemo(
    () => [...favoriteChannelIds, ...otherChannelIds],
    [favoriteChannelIds, otherChannelIds],
  )

  const renderChannelRow = (channelId: string) => {
    const channel = liveChannelsById.get(channelId)
    const active = channelId === activeChannelId
    const renaming = renameId === channelId
    return (
      <div
        key={channelId}
        className={cn(
          'px-spacing-2 py-spacing-1 group/channel-row flex items-center gap-1 rounded-lg transition-colors',
          active
            ? 'bg-primary/10 text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {renaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <ChannelIcon channel={channel} className="icon-sm shrink-0" />
            <input
              ref={renameInputRef}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onBlur={() => void submitRename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submitRename()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelRename()
                }
              }}
              className="body-3 min-w-0 flex-1 rounded-md border border-primary bg-background px-1.5 py-0.5 text-foreground outline-none"
            />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelectChannel(channelId)}
              className="body-3 flex min-w-0 flex-1 items-center gap-1.5 text-left"
            >
              <ChannelIcon channel={channel} className="icon-sm shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {channel?.name ?? 'Unavailable channel'}
              </span>
              {channel?.is_private ? (
                <Lock className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
              ) : null}
            </button>
            <button
              type="button"
              onClick={(e) => openMenu(e, channelId)}
              className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-opacity',
                menuChannelId === channelId
                  ? 'opacity-100'
                  : 'opacity-0 group-hover/channel-row:opacity-100',
              )}
              aria-label="Channel actions"
              aria-haspopup="menu"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (!renameId) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renameId])

  const openMenu = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuAnchor({ top: rect.bottom + 4, left: rect.right - 224 })
    setMenuChannelId(channelId)
  }

  const closeMenu = () => {
    setMenuChannelId(null)
    setMenuAnchor(null)
  }

  const startRename = (channel: Channel) => {
    setRenameId(channel.id)
    setRenameDraft(channel.name)
  }

  const submitRename = async () => {
    if (!renameId) return
    const trimmed = renameDraft.trim()
    setRenameId(null)
    setRenameDraft('')
    if (!trimmed) return
    const channel = liveChannelsById.get(renameId)
    if (!channel || trimmed === channel.name) return
    await updateChannel(renameId, { name: trimmed })
  }

  const cancelRename = () => {
    setRenameId(null)
    setRenameDraft('')
  }

  return (
    <>
      <motion.aside
        initial={false}
        animate={{
          width: collapsed ? CHANNELS_RAIL_COLLAPSED_PX : CHANNELS_RAIL_EXPANDED_PX,
        }}
        transition={railWidthTransition}
        className="border-border bg-background rounded-spacing-4 flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border"
        aria-label="Channels"
      >
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <AnimatePresence mode="sync" initial={false}>
            {collapsed ? (
              <motion.div
                key="collapsed"
                className="gap-spacing-2 py-spacing-3 absolute inset-0 flex min-h-0 min-w-0 flex-col items-center overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={innerPresenceTransition}
              >
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
                  aria-label="Expand channels sidebar"
                  title="Expand channels sidebar"
                >
                  <RxDoubleArrowRight className="icon-sm" aria-hidden />
                </button>
                <div className="gap-spacing-1 px-spacing-1 flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto">
                  {orderedChannelIds.map((channelId) => {
                    const channel = liveChannelsById.get(channelId)
                    const active = channelId === activeChannelId
                    return (
                      <button
                        key={channelId}
                        type="button"
                        onClick={() => onSelectChannel(channelId)}
                        className={cn(
                          'h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors',
                          active
                            ? 'nav-glass-selected-purple text-foreground'
                            : 'text-muted-foreground hover:bg-hover-subtle',
                        )}
                        aria-label={channel?.name ?? 'Channel'}
                        title={channel?.name ?? 'Channel'}
                      >
                        <ChannelIcon channel={channel} className="icon-sm" />
                      </button>
                    )
                  })}
                </div>
                <div className="mt-auto flex shrink-0 items-center justify-center">
                  <span
                    className="typo-section-label text-muted-foreground"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    Channels
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={innerPresenceTransition}
              >
                <div className="border-border bg-muted group/channels-header gap-spacing-2 px-spacing-4 py-spacing-3 flex shrink-0 items-center border-b">
                  <p
                    className={cn(
                      'body-3 text-foreground min-w-0 flex-1 truncate font-semibold transition-transform duration-500 ease-in-out',
                      'group-hover/channels-header:translate-x-1',
                    )}
                  >
                    Channels
                  </p>
                  <div
                    className={cn(
                      'flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
                      'pointer-events-none translate-x-2 opacity-0',
                      'group-hover/channels-header:pointer-events-auto group-hover/channels-header:translate-x-0 group-hover/channels-header:opacity-100',
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setCollapsed(true)}
                      className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
                      aria-label="Collapse channels sidebar"
                      title="Collapse channels sidebar"
                    >
                      <RxDoubleArrowLeft className="icon-sm" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="p-spacing-2 min-h-0 flex-1 overflow-y-auto">
                  {favoriteChannelIds.length > 0 ? (
                    <div className="mb-spacing-2 space-y-spacing-1">
                      <p className={GROUP_HEADER_CLS}>Favourite</p>
                      {favoriteChannelIds.map(renderChannelRow)}
                    </div>
                  ) : null}
                  <div className="space-y-spacing-1">
                    {favoriteChannelIds.length > 0 && otherChannelIds.length > 0 ? (
                      <p className={GROUP_HEADER_CLS}>Channels</p>
                    ) : null}
                    {(favoriteChannelIds.length > 0 ? otherChannelIds : channelIds).map(
                      renderChannelRow,
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      <ChannelListActionsHost
        menuChannel={menuChannel}
        menuAnchor={menuAnchor}
        onCloseMenu={closeMenu}
        showUnpinFromView
        onUnpinFromView={onRemoveChannel}
        onMarkAsRead={(id) => void markRead(id)}
        onRename={startRename}
        spaceActiveChannelId={activeChannelId ?? null}
        spaceId={spaceId ?? null}
      />
    </>
  )
}
