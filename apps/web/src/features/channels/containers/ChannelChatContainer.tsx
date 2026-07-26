'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  AddPeopleToChannelModal,
  channelMembersToRosterKeys,
} from '@/components/channels/AddPeopleToChannelModal'
import { StartBrainstormModal } from '@/components/channels/StartBrainstormModal'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  addRosterEntriesToChannel,
  channelsService,
  type Channel,
  type ChannelMention,
} from '@/lib/channels'
import type { MissionDeliverable } from '@/lib/missions'
import { useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import { fetchTeamRoster, type TeamRosterEntry } from '@/lib/team/team-roster-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { ChannelChat, type ChannelChatViewState } from '../components/ChannelChat'
import { ChannelThreadPanel } from '../components/ChannelThreadPanel'
import { useChannelMembers } from '../hooks/use-channel-members'
import { useChannelMessages } from '../hooks/use-channel-messages'
import { useChannels } from '../hooks/use-channels'
import type { ChannelRightPanelAwareness } from '../lib/build-channel-awareness-context'
import {
  registerSpaceChannelBrainstormHandlers,
  unregisterSpaceChannelBrainstormHandlers,
  type SpaceChannelBrainstormHandlers,
} from '../lib/channel-space-brainstorm-toolbar'
import { getMissingMentionRosterEntries } from '../lib/mention-membership'
import { consumePendingChannelAddPeople } from '../lib/pending-add-people'

type AddPeopleFlow =
  | { kind: 'postCreate'; channel: Channel }
  | { kind: 'header'; channel: Channel }
  | { kind: 'mention'; channel: Channel; entries: TeamRosterEntry[] }
  | null

export function ChannelChatContainer({
  channelId,
  spaceId,
  campaignId,
  spaceToolbarLayout = false,
  omitChatTrailingInset = false,
  initialOpenThreadId = null,
  onViewContextChange,
}: {
  channelId: string
  /** Active space context — passed through to the API and into the channel-agent runtime so artifact tools auto-scope to this space/campaign. */
  spaceId?: string | null
  /** Resolved campaign for the active space — used to scope channel uploads (`presignedUpload`). */
  campaignId?: string | null
  /** Spaces: invites + brainstorm go in the space toolbar strip; header stays title-only. */
  spaceToolbarLayout?: boolean
  /** Spaces channels sidebar row: symmetric horizontal inset with wrapper `px-*` (drops chat `pr-1.5`). */
  omitChatTrailingInset?: boolean
  initialOpenThreadId?: string | null
  onViewContextChange?: (context: ChannelRightPanelAwareness) => void
}) {
  const { channels, loading: channelsLoading, updateChannel } = useChannels()
  const getActiveOrg = useOrgStore((state) => state.getActiveOrg)
  const workspaceName = getActiveOrg()?.organizations.name ?? 'your workspace'
  const [addPeopleFlow, setAddPeopleFlow] = useState<AddPeopleFlow>(null)
  const mentionMembershipResolverRef = useRef<((added: boolean) => void) | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [roster, setRoster] = useState<TeamRosterEntry[]>([])
  const [rosterLoaded, setRosterLoaded] = useState(false)

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (channelId && currentUserId) {
      void channelsService.markChannelRead(channelId).catch(() => {})
    }
  }, [channelId, currentUserId])

  useEffect(() => {
    if (rosterLoaded) return
    let cancelled = false

    void cachedFetch('team-roster:all', () => fetchTeamRoster({ kind: 'all' }))
      .then((rows) => {
        if (cancelled) return
        setRoster(rows)
        setRosterLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setRosterLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [rosterLoaded])

  const rosterAvatars = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of roster) {
      if (!e.avatar_url) continue
      if (e.kind === 'human' && e.user_id) map.set(e.user_id, e.avatar_url)
      if (e.kind === 'agent' && e.agent_key) map.set(e.agent_key, e.avatar_url)
    }
    return map
  }, [roster])

  const [openThreadId, setOpenThreadId] = useState<string | null>(initialOpenThreadId)
  const [brainstormOpen, setBrainstormOpen] = useState(false)
  const spaceBrainstormHandlers = useMemo<SpaceChannelBrainstormHandlers>(
    () => ({
      openCreateModal: () => setBrainstormOpen(true),
      openThread: (parentMessageId) => setOpenThreadId(parentMessageId),
    }),
    [],
  )

  const [deliverableThreadFilter, setDeliverableThreadFilter] = useState<string | null>(null)
  const [inlinePreviewDeliverable, setInlinePreviewDeliverable] =
    useState<MissionDeliverable | null>(null)
  const [chatViewState, setChatViewState] = useState<ChannelChatViewState>({
    activeTab: 'messages',
    visibleMessageIds: [],
    composerDraft: {
      text: '',
      attachmentNames: [],
      pastedBlockCount: 0,
      recordingState: 'idle',
      linkInputOpen: false,
      uploadingAttachmentCount: 0,
    },
  })

  useEffect(() => {
    const pending = consumePendingChannelAddPeople(channelId)
    if (pending) setAddPeopleFlow({ kind: 'postCreate', channel: pending })
  }, [channelId])

  useEffect(() => {
    if (initialOpenThreadId) setOpenThreadId(initialOpenThreadId)
  }, [initialOpenThreadId, channelId])

  const { members, reload: reloadMembers } = useChannelMembers(channelId)
  const {
    messages,
    pinnedMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    reload: reloadMessages,
  } = useChannelMessages(channelId)

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === channelId) ?? null,
    [channels, channelId],
  )

  useEffect(() => {
    onViewContextChange?.({
      activeTab: chatViewState.activeTab,
      openThreadId,
      visibleMessageIds: chatViewState.visibleMessageIds,
      deliverableThreadFilter,
      composerDraft: chatViewState.composerDraft,
      previewDeliverable: inlinePreviewDeliverable
        ? {
            id: inlinePreviewDeliverable.id,
            title: inlinePreviewDeliverable.title,
            type: inlinePreviewDeliverable.type,
          }
        : null,
    })
  }, [
    chatViewState.activeTab,
    chatViewState.composerDraft,
    chatViewState.visibleMessageIds,
    deliverableThreadFilter,
    inlinePreviewDeliverable,
    onViewContextChange,
    openThreadId,
  ])

  useEffect(() => {
    if (!spaceToolbarLayout) return
    registerSpaceChannelBrainstormHandlers(channelId, spaceBrainstormHandlers)
    return () => unregisterSpaceChannelBrainstormHandlers(channelId, spaceBrainstormHandlers)
  }, [channelId, spaceToolbarLayout, spaceBrainstormHandlers])

  const existingMemberKeys = useMemo(() => channelMembersToRosterKeys(members), [members])
  const handleAddPeopleMembers = useCallback(
    async (entries: TeamRosterEntry[]) => {
      if (!addPeopleFlow?.channel) return
      await addRosterEntriesToChannel(addPeopleFlow.channel.id, entries)
      if (addPeopleFlow.kind === 'mention') {
        mentionMembershipResolverRef.current?.(true)
        mentionMembershipResolverRef.current = null
      }
    },
    [addPeopleFlow],
  )

  const ensureMentionMembers = useCallback(
    async (mentions: ChannelMention[]): Promise<boolean> => {
      if (!selectedChannel) return false
      const entries = getMissingMentionRosterEntries(mentions, roster, existingMemberKeys)
      if (entries.length === 0) return true

      return new Promise<boolean>((resolve) => {
        mentionMembershipResolverRef.current?.(false)
        mentionMembershipResolverRef.current = resolve
        setAddPeopleFlow({ kind: 'mention', channel: selectedChannel, entries })
      })
    },
    [existingMemberKeys, roster, selectedChannel],
  )

  useEffect(
    () => () => {
      mentionMembershipResolverRef.current?.(false)
      mentionMembershipResolverRef.current = null
    },
    [],
  )

  return (
    <section className="bg-background flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <AddPeopleToChannelModal
        open={!!addPeopleFlow}
        channel={addPeopleFlow?.channel ?? null}
        purpose={addPeopleFlow?.kind === 'postCreate' ? 'afterCreate' : 'addMembers'}
        existingMemberKeys={
          addPeopleFlow?.kind === 'header' || addPeopleFlow?.kind === 'mention'
            ? existingMemberKeys
            : undefined
        }
        initialSelectedEntries={
          addPeopleFlow?.kind === 'mention' ? addPeopleFlow.entries : undefined
        }
        roster={roster}
        currentUserId={currentUserId}
        workspaceName={workspaceName}
        onAddMembers={handleAddPeopleMembers}
        onMembersAdded={() => {
          void reloadMembers()
          void reloadMessages()
        }}
        onOpenChange={(next) => {
          if (!next) {
            if (addPeopleFlow?.kind === 'mention') {
              mentionMembershipResolverRef.current?.(false)
              mentionMembershipResolverRef.current = null
            }
            void reloadMembers()
            void reloadMessages()
            setAddPeopleFlow(null)
          }
        }}
      />

      {channelsLoading && !selectedChannel ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="body-2 text-muted-foreground">Loading channel…</p>
        </div>
      ) : (
        <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChannelChat
            channel={selectedChannel}
            members={members}
            messages={messages}
            pinnedMessages={pinnedMessages}
            currentUserId={currentUserId}
            campaignId={campaignId ?? null}
            rosterAvatars={rosterAvatars}
            mentionRoster={roster}
            onEnsureMentionMembers={ensureMentionMembers}
            onSendMessage={async ({ content, mentions, attachments }) => {
              await sendMessage({
                content,
                mentions,
                attachments,
                space_id: spaceId ?? undefined,
              })
            }}
            onEditMessage={async (messageId, content) => {
              await editMessage(messageId, content)
            }}
            onDeleteMessage={async (messageId) => {
              await deleteMessage(messageId)
            }}
            onOpenAddMembers={() => {
              if (!selectedChannel) return
              setAddPeopleFlow({ kind: 'header', channel: selectedChannel })
            }}
            onRenameChannel={async (name) => {
              try {
                await updateChannel(channelId, { name })
              } catch (err) {
                toast.error(sanitizeUserError(err, 'Could not rename channel.'))
                throw err
              }
            }}
            onOpenThread={setOpenThreadId}
            onStartBrainstorm={spaceToolbarLayout ? undefined : () => setBrainstormOpen(true)}
            hideChannelHeaderActions={spaceToolbarLayout}
            deliverableThreadFilter={deliverableThreadFilter}
            onClearDeliverableFilter={() => setDeliverableThreadFilter(null)}
            onOpenDeliverablePreview={setInlinePreviewDeliverable}
            onViewStateChange={setChatViewState}
            omitChatTrailingInset={omitChatTrailingInset}
          />
          <AnimatePresence>
            {openThreadId && (
              <motion.div
                key={openThreadId}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 420, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                className="flex h-full min-h-0 shrink-0 overflow-hidden"
              >
                <ChannelThreadPanel
                  parentMessageId={openThreadId}
                  messages={messages}
                  members={members}
                  currentUserId={currentUserId}
                  channelId={channelId}
                  campaignId={campaignId ?? null}
                  rosterAvatars={rosterAvatars}
                  mentionRoster={roster}
                  onEnsureMentionMembers={ensureMentionMembers}
                  onClose={() => setOpenThreadId(null)}
                  onSendReply={async ({ content, mentions, attachments }) => {
                    await sendMessage({
                      content,
                      mentions,
                      attachments,
                      reply_to_id: openThreadId,
                      space_id: spaceId ?? undefined,
                    })
                  }}
                  onEditMessage={async (messageId, content) => {
                    await editMessage(messageId, content)
                  }}
                  onDeleteMessage={async (messageId) => {
                    await deleteMessage(messageId)
                  }}
                  onViewDeliverables={() => setDeliverableThreadFilter(openThreadId)}
                  onRenameThread={async (messageId, name) => {
                    await channelsService.renameThread(channelId, messageId, name)
                    void reloadMessages()
                  }}
                  onOpenDeliverablePreview={setInlinePreviewDeliverable}
                  omitTrailingInset={omitChatTrailingInset}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {inlinePreviewDeliverable && (
        <DeliverablePreviewModal
          deliverable={inlinePreviewDeliverable}
          agents={[]}
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={() => setInlinePreviewDeliverable(null)}
        />
      )}

      <StartBrainstormModal
        open={brainstormOpen}
        onOpenChange={setBrainstormOpen}
        onStart={async (agentKeys) => {
          if (!channelId) return
          try {
            const { message } = await channelsService.startBrainstorm(channelId, {
              agent_keys: agentKeys,
              space_id: spaceId ?? undefined,
            })
            setBrainstormOpen(false)
            setOpenThreadId(message.id)
            void reloadMessages()
          } catch (err) {
            toast.error(sanitizeUserError(err, 'Could not start brainstorm.'))
          }
        }}
      />
    </section>
  )
}
