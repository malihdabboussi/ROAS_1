'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import {
  ChannelChatContainer,
  useChannelMembers,
  useChannelMessages,
  useChannels,
} from '@/features/channels'
import {
  buildChannelAwarenessContext,
  type ChannelRightPanelAwareness,
} from '@/features/channels/lib/build-channel-awareness-context'
import { useAccountContextGate } from '@/features/org/store/use-org-store'

export default function HomeChannelPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const [rightPanelAwareness, setRightPanelAwareness] = useState<ChannelRightPanelAwareness>({
    activeTab: 'messages',
    openThreadId: null,
    visibleMessageIds: [],
    deliverableThreadFilter: null,
    composerDraft: {
      text: '',
      attachmentNames: [],
      pastedBlockCount: 0,
      recordingState: 'idle',
      linkInputOpen: false,
      uploadingAttachmentCount: 0,
    },
    previewDeliverable: null,
  })

  const id = params?.id
  const thread = searchParams.get('thread')
  const initialOpenThreadId = typeof thread === 'string' && thread.length > 0 ? thread : null
  const { channels } = useChannels(Boolean(id))
  const { members } = useChannelMembers(id ?? null)
  const { messages } = useChannelMessages(id ?? null)
  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === id) ?? null,
    [channels, id],
  )
  const channelAwarenessContext = useMemo(
    () =>
      buildChannelAwarenessContext({
        channel: selectedChannel,
        members,
        messages,
        activeThreadId: rightPanelAwareness.openThreadId ?? initialOpenThreadId,
        rightPanel: {
          ...rightPanelAwareness,
          mobileMode: 'channel',
          chatCollapsed: false,
        },
      }),
    [initialOpenThreadId, members, messages, rightPanelAwareness, selectedChannel],
  )

  useEffect(() => {
    if (isPersonalAccountContext) router.replace('/home')
  }, [isPersonalAccountContext, router])

  useEffect(() => {
    if (!id) return
    setWorkContext({
      surface: 'general',
      channelId: id,
      channelName: selectedChannel?.name ?? 'Channel',
      channelAwarenessContext,
    })
  }, [channelAwarenessContext, id, selectedChannel?.name, setWorkContext])

  const handleRightPanelAwarenessChange = useCallback((next: ChannelRightPanelAwareness) => {
    setRightPanelAwareness(next)
  }, [])

  if (!isAccountContextReady || isPersonalAccountContext || !id) return null

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3">
      <ChannelChatContainer
        channelId={id}
        initialOpenThreadId={initialOpenThreadId}
        omitChatTrailingInset
        onViewContextChange={handleRightPanelAwarenessChange}
      />
    </div>
  )
}
