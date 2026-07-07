'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  addRosterEntriesToChannel,
  channelsService,
  getChannelIconColorId,
  getChannelIconName,
  triggerSpaceChannelBrainstormCreate,
  useAddPeopleRoster,
  useCanManageChannel,
  useChannelMembers,
  useChannels,
  type Channel,
} from '@/lib/channels'
import {
  AddPeopleToChannelModal,
  channelMembersToRosterKeys,
} from '@/components/channels/AddPeopleToChannelModal'
import { ChannelActionsMenu } from '@/components/channels/ChannelActionsMenu'
import { ChannelSettingsModal } from '@/components/channels/ChannelSettingsModal'
import { StartBrainstormModal } from '@/components/channels/StartBrainstormModal'

export function channelPageUrl(channelId: string, threadId?: string) {
  const base = `/home/channels/${channelId}`
  if (!threadId) return base
  return `${base}?thread=${encodeURIComponent(threadId)}`
}

function ChannelDeleteConfirmDialog({
  open,
  channelName,
  onClose,
  onConfirm,
}: {
  open: boolean
  channelName: string
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}>
      <div className="z-modal-backdrop fixed inset-0 bg-modal-overlay" onClick={onClose} />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden">
          <button type="button" onClick={onClose} className="btn-icon-bare btn-close-absolute">
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
          <div className="px-spacing-6 pt-spacing-6 pb-spacing-4 flex flex-col items-center text-center">
            <div className="bg-destructive/10 mb-spacing-3 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertCircle className="text-destructive h-6 w-6" />
            </div>
            <h2 className="title-h6 text-foreground">Delete #{channelName}?</h2>
            <p className="body-3 text-muted-foreground mt-spacing-2">
              This permanently deletes the channel and all of its messages. This cannot be undone.
            </p>
          </div>
          <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
            <button
              type="button"
              onClick={onClose}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <span className="relative z-10">Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ChannelListActionsHost({
  menuChannel,
  menuAnchor,
  onCloseMenu,
  showUnpinFromView = false,
  onUnpinFromView,
  onRename,
  onDeleted,
  onMarkAsRead,
  spaceActiveChannelId,
  spaceId,
}: {
  menuChannel: Channel | null
  menuAnchor: { top: number; left: number } | null
  onCloseMenu: () => void
  showUnpinFromView?: boolean
  onUnpinFromView?: (channelId: string) => void
  onRename?: (channel: Channel) => void
  onDeleted?: (channelId: string) => void
  onMarkAsRead: (channelId: string) => void
  /** When brainstorm is triggered for this channel id, use the mounted space chat registry. */
  spaceActiveChannelId?: string | null
  /** Active space context for fallback brainstorm creation when the channel is opened from a space. */
  spaceId?: string | null
}) {
  const router = useRouter()
  const { channels, updateChannel, deleteChannel, toggleChannelFavorite } = useChannels()
  const channelId = menuChannel?.id ?? null

  const liveMenuChannel = useMemo(() => {
    if (!channelId) return menuChannel
    return channels.find((c) => c.id === channelId) ?? menuChannel
  }, [channelId, channels, menuChannel])

  const canManage = useCanManageChannel(liveMenuChannel)
  const [addPeopleOpen, setAddPeopleOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [brainstormOpen, setBrainstormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addPeopleChannel, setAddPeopleChannel] = useState<Channel | null>(null)

  const { members, reload: reloadMembers } = useChannelMembers(addPeopleOpen ? channelId : null)
  const existingMemberKeys = channelMembersToRosterKeys(members)
  const addPeopleRoster = useAddPeopleRoster(addPeopleOpen)

  const menuOpen = menuChannel !== null && menuAnchor !== null

  const copyLink = useCallback(async (id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    try {
      await navigator.clipboard.writeText(`${origin}${channelPageUrl(id)}`)
      toast.success('Link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }, [])

  const handleStartBrainstorm = useCallback(() => {
    if (!channelId) return
    if (spaceActiveChannelId && spaceActiveChannelId === channelId) {
      triggerSpaceChannelBrainstormCreate(channelId)
      return
    }
    setBrainstormOpen(true)
  }, [channelId, spaceActiveChannelId])

  const handleBrainstormStart = useCallback(
    async (agentKeys: string[]) => {
      if (!channelId) return
      try {
        const { message } = await channelsService.startBrainstorm(channelId, {
          agent_keys: agentKeys,
          space_id: spaceId ?? undefined,
        })
        setBrainstormOpen(false)
        router.push(channelPageUrl(channelId, message.id))
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Could not start brainstorm.'))
      }
    },
    [channelId, router, spaceId],
  )

  const handlePatchIcon = useCallback(
    async (patch: { icon?: string; icon_color?: string }) => {
      if (!channelId) return
      try {
        await updateChannel(channelId, patch)
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Could not update channel icon.'))
      }
    },
    [channelId, updateChannel],
  )

  const handleAddMembers = useCallback(
    async (entries: Parameters<typeof addRosterEntriesToChannel>[1]) => {
      if (!addPeopleChannel) return
      await addRosterEntriesToChannel(addPeopleChannel.id, entries)
    },
    [addPeopleChannel],
  )

  const handleDelete = useCallback(async () => {
    if (!menuChannel) return
    const id = menuChannel.id
    setDeleteOpen(false)
    onCloseMenu()
    try {
      await deleteChannel(id)
      toast.success('Channel deleted')
      onDeleted?.(id)
      if (
        typeof window !== 'undefined' &&
        window.location.pathname.includes(`/home/channels/${id}`)
      ) {
        router.push('/home/channels')
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not delete channel.'))
    }
  }, [deleteChannel, menuChannel, onCloseMenu, onDeleted, router])

  return (
    <>
      <ChannelActionsMenu
        open={menuOpen}
        anchor={menuAnchor}
        channelName={liveMenuChannel?.name ?? 'channel'}
        canManage={canManage}
        showUnpinFromView={showUnpinFromView}
        onClose={onCloseMenu}
        onCopyLink={() => {
          if (channelId) void copyLink(channelId)
        }}
        onOpenInNewTab={() => {
          if (!channelId) return
          openInNewTab(channelPageUrl(channelId))
        }}
        onMarkAsRead={() => {
          if (channelId) onMarkAsRead(channelId)
        }}
        isFavorite={liveMenuChannel?.is_favorite === true}
        onToggleFavorite={() => {
          if (channelId) void toggleChannelFavorite(channelId)
        }}
        onRename={() => {
          if (liveMenuChannel) onRename?.(liveMenuChannel)
        }}
        onAddMembers={() => {
          if (!liveMenuChannel) return
          setAddPeopleChannel(liveMenuChannel)
          setAddPeopleOpen(true)
        }}
        channelIconName={getChannelIconName(liveMenuChannel)}
        channelIconColorId={getChannelIconColorId(liveMenuChannel)}
        onPatchIcon={(patch) => void handlePatchIcon(patch)}
        onOpenSettings={() => setSettingsOpen(true)}
        onStartBrainstorm={handleStartBrainstorm}
        onUnpinFromView={
          showUnpinFromView && channelId && onUnpinFromView
            ? () => onUnpinFromView(channelId)
            : undefined
        }
        onDelete={() => setDeleteOpen(true)}
      />

      <AddPeopleToChannelModal
        open={addPeopleOpen}
        channel={addPeopleChannel}
        purpose="addMembers"
        existingMemberKeys={existingMemberKeys}
        roster={addPeopleRoster.roster}
        currentUserId={addPeopleRoster.currentUserId}
        workspaceName={addPeopleRoster.workspaceName}
        onAddMembers={handleAddMembers}
        onMembersAdded={() => void reloadMembers()}
        onOpenChange={(next) => {
          if (!next) {
            void reloadMembers()
            setAddPeopleOpen(false)
            setAddPeopleChannel(null)
          }
        }}
      />

      <ChannelSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        channel={liveMenuChannel}
        onSave={async (payload) => {
          if (!channelId) return
          try {
            await updateChannel(channelId, payload)
            toast.success('Channel settings saved')
          } catch (err) {
            toast.error(sanitizeUserError(err, 'Could not save channel settings.'))
            throw err
          }
        }}
      />

      <StartBrainstormModal
        open={brainstormOpen}
        onOpenChange={setBrainstormOpen}
        onStart={(keys) => void handleBrainstormStart(keys)}
      />

      <ChannelDeleteConfirmDialog
        open={deleteOpen}
        channelName={liveMenuChannel?.name ?? 'channel'}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
