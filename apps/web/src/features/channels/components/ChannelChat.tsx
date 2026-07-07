'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent } from '@/components/ui/navigation/tabs'
import type {
  Channel,
  ChannelMember,
  ChannelMention,
  ChannelMessage,
} from '@/lib/channels'
import type { MissionDeliverable } from '@/lib/missions'
import type { ChannelComposerVisibleState } from './ChannelComposer'
import { ChannelChatMessagesPanel } from './ChannelChatMessagesPanel'
import { ChannelChatTabs } from './ChannelChatTabs'
import { ChannelContextTab } from './ChannelContextTab'
import { groupMessagesByDate } from './ChannelDateSeparator'
import { ChannelHeader } from './ChannelHeader'
import {
  formatChannelJumpLabel,
  getChannelSenderMeta,
  type ChannelChatActiveTab,
} from './channel-chat-utils'
import { DeliverablesView } from './DeliverablesView'

export type { ChannelChatActiveTab } from './channel-chat-utils'

export interface ChannelChatViewState {
  activeTab: ChannelChatActiveTab
  visibleMessageIds: string[]
  composerDraft: ChannelComposerVisibleState
}

export function ChannelChat({
  channel,
  members,
  messages,
  pinnedMessages,
  currentUserId,
  campaignId,
  rosterAvatars,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onOpenAddMembers,
  onRenameChannel,
  onOpenThread,
  onStartBrainstorm,
  deliverableThreadFilter,
  onClearDeliverableFilter,
  onOpenDeliverablePreview,
  onViewStateChange,
  hideChannelHeaderActions = false,
  omitChatTrailingInset = false,
}: {
  channel: Channel | null
  members: ChannelMember[]
  messages: ChannelMessage[]
  pinnedMessages: ChannelMessage[]
  currentUserId: string | null
  /** Resolved campaign for the active space — used to scope channel uploads. */
  campaignId?: string | null
  rosterAvatars?: Map<string, string>
  onSendMessage: (payload: {
    content: string
    mentions: ChannelMention[]
    attachments?: string[]
  }) => Promise<void> | void
  onEditMessage: (messageId: string, content: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
  onOpenAddMembers: () => void
  onRenameChannel: (name: string) => Promise<void>
  onOpenThread?: (messageId: string) => void
  onStartBrainstorm?: () => void
  deliverableThreadFilter?: string | null
  onClearDeliverableFilter?: () => void
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  onViewStateChange?: (state: ChannelChatViewState) => void
  hideChannelHeaderActions?: boolean
  /** When true (spaces channels sidebar + chat row), omit outer `pr-1.5` so horizontal gutters match `px-*` wrapper. */
  omitChatTrailingInset?: boolean
}) {
  const [activeTab, setActiveTab] = useState<ChannelChatActiveTab>('messages')
  const [composerDraft, setComposerDraft] = useState<ChannelComposerVisibleState>({
    text: '',
    attachmentNames: [],
    pastedBlockCount: 0,
    recordingState: 'idle',
    linkInputOpen: false,
    uploadingAttachmentCount: 0,
  })
  const prevFilterRef = useRef<string | null | undefined>(undefined)
  const visibleMessageIdsRef = useRef<string[]>([])
  const reportedActiveTabRef = useRef<ChannelChatActiveTab>('messages')

  useEffect(() => {
    if (deliverableThreadFilter && deliverableThreadFilter !== prevFilterRef.current) {
      setActiveTab('deliverables')
    }
    prevFilterRef.current = deliverableThreadFilter
  }, [deliverableThreadFilter])

  const scrollRef = useRef<HTMLDivElement>(null)
  const wasNearBottomRef = useRef(true)
  const prevMainMessageStateRef = useRef<{ len: number; lastId: string | null }>({
    len: 0,
    lastId: null,
  })
  const scrollMainToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const attempt = (remaining: number) => {
      const container = scrollRef.current
      if (!container) return
      const maxTop = container.scrollHeight - container.clientHeight
      if (maxTop <= 0 && remaining > 0) {
        requestAnimationFrame(() => attempt(remaining - 1))
        return
      }
      if (behavior === 'smooth')
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      else container.scrollTop = container.scrollHeight
      wasNearBottomRef.current = true
    }
    requestAnimationFrame(() => attempt(6))
  }, [])

  const senderMeta = useMemo(() => {
    const map = new Map<string, { label: string; avatarUrl: string | null }>()
    for (const message of messages) {
      map.set(message.id, getChannelSenderMeta(message, members, rosterAvatars))
    }
    return map
  }, [messages, members, rosterAvatars])

  const mainMessages = useMemo(() => messages.filter((m) => !m.reply_to_id), [messages])

  const repliesByParent = useMemo(() => {
    const map = new Map<string, ChannelMessage[]>()
    for (const m of messages) {
      if (!m.reply_to_id) continue
      const arr = map.get(m.reply_to_id)
      if (arr) arr.push(m)
      else map.set(m.reply_to_id, [m])
    }
    return map
  }, [messages])

  const dateGroups = useMemo(() => groupMessagesByDate(mainMessages), [mainMessages])

  useEffect(() => {
    prevMainMessageStateRef.current = { len: 0, lastId: null }
    wasNearBottomRef.current = true
  }, [channel?.id])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const isNearBottom = () =>
      container.scrollHeight - (container.scrollTop + container.clientHeight) <= 96
    const onScroll = () => {
      wasNearBottomRef.current = isNearBottom()
    }
    wasNearBottomRef.current = isNearBottom()
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll to bottom when switching back to the messages tab
  useEffect(() => {
    if (activeTab !== 'messages') return
    scrollMainToBottom('auto')
  }, [activeTab, scrollMainToBottom])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const lastMessage = mainMessages[mainMessages.length - 1] ?? null
    const lastId = lastMessage?.id ?? null
    const prev = prevMainMessageStateRef.current
    const appended = mainMessages.length > prev.len && lastId !== prev.lastId

    if (prev.len === 0 && mainMessages.length > 0) {
      scrollMainToBottom('auto')
    } else if (appended && wasNearBottomRef.current) {
      scrollMainToBottom('smooth')
    }

    prevMainMessageStateRef.current = { len: mainMessages.length, lastId }
  }, [mainMessages, scrollMainToBottom])

  const jumpToDate = useCallback((dateKey: string) => {
    const container = scrollRef.current
    if (!container) return
    const target = container.querySelector(
      `[data-date-separator="${dateKey}"]`,
    ) as HTMLElement | null
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      toast.success(`Jumped to ${formatChannelJumpLabel(dateKey)}`)
      return
    }
    const allSeparators = container.querySelectorAll('[data-date-separator]')
    let closest: HTMLElement | null = null
    for (const el of allSeparators) {
      const key = el.getAttribute('data-date-separator') ?? ''
      if (key <= dateKey) closest = el as HTMLElement
    }
    if (closest) {
      closest.scrollIntoView({ behavior: 'smooth', block: 'start' })
      toast.success(`Jumped to nearest date`)
    } else {
      toast.error(`No messages found for ${formatChannelJumpLabel(dateKey)}`)
    }
  }, [])

  const reportVisibleMessages = useCallback(() => {
    if (activeTab !== 'messages') {
      visibleMessageIdsRef.current = []
      reportedActiveTabRef.current = activeTab
      onViewStateChange?.({ activeTab, visibleMessageIds: [], composerDraft })
      return
    }

    const container = scrollRef.current
    if (!container) {
      onViewStateChange?.({
        activeTab,
        visibleMessageIds: visibleMessageIdsRef.current,
        composerDraft,
      })
      return
    }

    const containerRect = container.getBoundingClientRect()
    const nextIds = Array.from(container.querySelectorAll<HTMLElement>('[data-message-id]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        return rect.bottom > containerRect.top && rect.top < containerRect.bottom
      })
      .map((el) => el.dataset.messageId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    const previousIds = visibleMessageIdsRef.current
    const changed =
      reportedActiveTabRef.current !== activeTab ||
      previousIds.length !== nextIds.length ||
      previousIds.some((id, index) => id !== nextIds[index])
    reportedActiveTabRef.current = activeTab
    visibleMessageIdsRef.current = nextIds
    if (changed) onViewStateChange?.({ activeTab, visibleMessageIds: nextIds, composerDraft })
  }, [activeTab, composerDraft, onViewStateChange])

  useEffect(() => {
    reportVisibleMessages()
    const container = scrollRef.current
    if (!container || activeTab !== 'messages') return

    container.addEventListener('scroll', reportVisibleMessages, { passive: true })
    window.addEventListener('resize', reportVisibleMessages)
    return () => {
      container.removeEventListener('scroll', reportVisibleMessages)
      window.removeEventListener('resize', reportVisibleMessages)
    }
  }, [activeTab, mainMessages.length, reportVisibleMessages])

  useEffect(() => {
    onViewStateChange?.({
      activeTab,
      visibleMessageIds: visibleMessageIdsRef.current,
      composerDraft,
    })
  }, [activeTab, composerDraft, onViewStateChange])

  if (!channel) {
    return (
      <section className="bg-background flex h-full min-h-0 flex-1 items-center justify-center">
        <p className="body-2 text-muted-foreground max-w-md text-center">
          This channel isn&apos;t available. Open{' '}
          <span className="text-foreground font-medium">Home</span> and choose another channel under
          Channels.
        </p>
      </section>
    )
  }

  return (
    <section
      className={
        omitChatTrailingInset
          ? 'bg-background flex h-full min-h-0 flex-1'
          : 'bg-background flex h-full min-h-0 flex-1 pb-3 pr-1.5 pt-3'
      }
    >
      <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border">
        <ChannelHeader
          channel={channel}
          headerActionsVariant={hideChannelHeaderActions ? 'titleOnly' : 'default'}
          onOpenAddMembers={onOpenAddMembers}
          onRenameChannel={onRenameChannel}
          onStartBrainstorm={hideChannelHeaderActions ? undefined : onStartBrainstorm}
          onOpenContextTab={() => setActiveTab('context')}
        />

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === 'messages' || value === 'deliverables' || value === 'context')
              setActiveTab(value)
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <ChannelChatTabs
            activeTab={activeTab}
            deliverableThreadFilter={deliverableThreadFilter}
            onTabChange={setActiveTab}
            onClearDeliverableFilter={onClearDeliverableFilter}
          />

          <TabsContent value="messages" className="flex min-h-0 flex-1 flex-col">
            <ChannelChatMessagesPanel
              channelId={channel.id}
              campaignId={campaignId}
              members={members}
              messages={messages}
              pinnedMessages={pinnedMessages}
              dateGroups={dateGroups}
              repliesByParent={repliesByParent}
              senderMeta={senderMeta}
              currentUserId={currentUserId}
              rosterAvatars={rosterAvatars}
              scrollRef={scrollRef}
              onJumpToDate={jumpToDate}
              onSendMessage={onSendMessage}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onOpenThread={onOpenThread}
              onOpenDeliverablePreview={onOpenDeliverablePreview}
              onComposerDraftChange={setComposerDraft}
            />
          </TabsContent>

          <TabsContent value="deliverables" className="flex min-h-0 flex-1 flex-col">
            <DeliverablesView
              messages={messages}
              members={members}
              rosterAvatars={rosterAvatars}
              onOpenThread={onOpenThread}
              threadFilterId={deliverableThreadFilter}
              onClearThreadFilter={onClearDeliverableFilter}
            />
          </TabsContent>

          <TabsContent value="context" className="flex min-h-0 flex-1 flex-col">
            {channel && <ChannelContextTab channel={channel} />}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
