'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { CheckCheck, Lock, MoreHorizontal, Plus } from 'lucide-react'
import { ChannelIcon, ChannelListActionsHost, CreateChannelModal } from '@/components/channels'
import { Tooltip } from '@/components/ui/tooltip'
import {
  stashPendingChannelAddPeople,
  useChannelUnread,
  useChannels,
  type Channel,
} from '@/lib/channels'
import { cn } from '@/lib/utils/cn'

export function HomeCommunicationNav({
  pathname,
  onNavigate,
  cacheOnly = false,
}: {
  pathname: string
  onNavigate?: () => void
  cacheOnly?: boolean
}) {
  const router = useRouter()
  const { channels, loading, createChannel, updateChannel } = useChannels(!cacheOnly)
  const [createOpen, setCreateOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { counts: unreadCounts, markRead } = useChannelUnread(!cacheOnly)
  const CHANNELS_RECENT_LIMIT = 5

  const [menuChannelId, setMenuChannelId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const activeChannelId = pathname.match(/^\/home\/channels\/([^/]+)/)?.[1] ?? null
  const menuChannel = menuChannelId ? (channels.find((c) => c.id === menuChannelId) ?? null) : null

  useEffect(() => {
    if (activeChannelId) void markRead(activeChannelId)
  }, [activeChannelId, markRead])

  useEffect(() => {
    if (!renameId) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renameId])

  const openMenuAt = (clientX: number, clientY: number, channelId: string) => {
    setMenuAnchor({ top: clientY, left: clientX })
    setMenuChannelId(channelId)
  }

  const openMenuFromButton = (e: React.MouseEvent, channelId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    openMenuAt(rect.right - 224, rect.bottom + 4, channelId)
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
    const channel = channels.find((c) => c.id === renameId)
    if (!channel || trimmed === channel.name) return
    await updateChannel(renameId, { name: trimmed })
  }

  const cancelRename = () => {
    setRenameId(null)
    setRenameDraft('')
  }

  return (
    <>
      <div className="home-sidebar-comm-channels-heading-wrap">
        <div className="channels-heading-row">
          <span className="typo-caption text-muted-foreground font-medium">Channels</span>
          <div className="flex items-center gap-1">
            <Tooltip label="Mark all as read" side="top">
              <button
                type="button"
                disabled={!Object.values(unreadCounts).some((n) => n > 0)}
                onClick={() => {
                  for (const id of Object.keys(unreadCounts)) {
                    if (unreadCounts[id]! > 0) void markRead(id)
                  }
                }}
                className="channels-heading-new-channel-btn disabled:text-muted-foreground/35 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-default"
                aria-label="Mark all channels as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip label="New channel" side="top">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="channels-heading-new-channel-btn text-muted-foreground hover:text-foreground transition-colors"
                aria-label="New channel"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {loading && (
        <p className="home-sidebar-comm-loading typo-caption text-muted-foreground">Loading…</p>
      )}

      {!loading &&
        (() => {
          const sorted = [...channels].sort((a, b) => a.name.localeCompare(b.name))
          const visible = expanded ? sorted : sorted.slice(0, CHANNELS_RECENT_LIMIT)
          return (
            <>
              {visible.map((ch) => {
                const unread = unreadCounts[ch.id] ?? 0
                const active = pathname === `/home/channels/${ch.id}`
                const renaming = renameId === ch.id
                return (
                  <div
                    key={ch.id}
                    className={cn(
                      'group/channel-row flex items-center gap-1 rounded-lg px-1 transition-all',
                      active
                        ? 'home-sidebar-item-active text-foreground'
                        : 'text-muted-foreground',
                    )}
                    onContextMenu={
                      renaming
                        ? undefined
                        : (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openMenuAt(e.clientX, e.clientY, ch.id)
                          }
                    }
                  >
                    {renaming ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
                        <ChannelIcon channel={ch} className="h-4 w-4 shrink-0" />
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
                          className="body-3 border-primary bg-background text-foreground min-w-0 flex-1 rounded-md border px-1.5 py-0.5 font-medium outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <Link
                          href={`/home/channels/${ch.id}`}
                          onClick={() => {
                            onNavigate?.()
                            void markRead(ch.id)
                          }}
                          className={cn(
                            'nav-glass-hover-purple flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 transition-all',
                            active ? 'home-sidebar-item-active' : '',
                          )}
                        >
                          <ChannelIcon channel={ch} className="h-4 w-4 shrink-0" />
                          <span
                            className={`body-3 min-w-0 flex-1 truncate ${unread > 0 ? 'text-foreground font-semibold' : ''}`}
                          >
                            {ch.name}
                          </span>
                          {ch.is_private ? (
                            <Lock className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden />
                          ) : null}
                          {unread > 0 && (
                            <span className="bg-primary text-primary-foreground typo-xs inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1 font-bold">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => openMenuFromButton(e, ch.id)}
                          className={cn(
                            'text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1 transition-opacity',
                            menuChannelId === ch.id
                              ? 'opacity-100'
                              : 'opacity-0 group-hover/channel-row:opacity-100',
                          )}
                          aria-label="Channel actions"
                          aria-haspopup="menu"
                          aria-expanded={menuChannelId === ch.id}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
              {sorted.length > CHANNELS_RECENT_LIMIT && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                  <span className="body-3">
                    {expanded ? 'See less' : `See more (${sorted.length - CHANNELS_RECENT_LIMIT})`}
                  </span>
                </button>
              )}
            </>
          )
        })()}

      <ChannelListActionsHost
        menuChannel={menuChannel}
        menuAnchor={menuAnchor}
        onCloseMenu={closeMenu}
        onMarkAsRead={(id) => void markRead(id)}
        onRename={startRename}
        onDeleted={(id) => {
          if (activeChannelId === id) router.push('/home/channels')
        }}
      />

      <CreateChannelModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        channels={channels}
        onCreate={async (payload) => {
          const channel = await createChannel(payload)
          stashPendingChannelAddPeople(channel)
          onNavigate?.()
          router.push(`/home/channels/${channel.id}`)
          return channel
        }}
      />
    </>
  )
}
