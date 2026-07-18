'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  duplicateConversation,
  selectConversation,
  useChatStore,
  type Conversation,
} from '@/lib/chat/studio-chat-runtime-adapter'
import {
  assignConversationCampaign,
  deleteConversation,
  fetchConversations,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
} from '@/lib/conversations'
import {
  CONVERSATION_ACTIONS_TOAST_ERRORS,
  CONVERSATION_ACTIONS_TOAST_SUCCESS,
} from '@/lib/conversations/conversation-toast-errors.config'
import {
  LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT,
  LOOP_CHAT_SELECT_CONVERSATION_EVENT,
  type LoopChatActivateConversationDetail,
  type LoopChatSelectConversationDetail,
} from '@/lib/flows/loop-chat-conversation'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import type { ChatMode } from './team-hr-side-chat.types'

interface UseTeamHrConversationActionsOptions {
  activeAgentKey: string
  storageScope: 'hr' | 'atlas' | 'loop'
  spaceId: string | null
  selectedConversationId: string | null
  readStoredConversationId: () => string | null
  persistConversationId: (conversationId: string | null) => void
  notifyLoopConversationChanged: (conversationId: string | null) => void
  setConversations: Dispatch<SetStateAction<Conversation[]>>
  setSelectedConversationId: Dispatch<SetStateAction<string | null>>
  setConversationsLoading: Dispatch<SetStateAction<boolean>>
  setMode: Dispatch<SetStateAction<ChatMode>>
  onNewConversation?: () => void
}

export function useTeamHrConversationActions({
  activeAgentKey,
  storageScope,
  spaceId,
  selectedConversationId,
  readStoredConversationId,
  persistConversationId,
  notifyLoopConversationChanged,
  setConversations,
  setSelectedConversationId,
  setConversationsLoading,
  setMode,
  onNewConversation,
}: UseTeamHrConversationActionsOptions) {
  const pathname = usePathname()
  const loadConversationsSeqRef = useRef(0)

  const loadConversations = useCallback(async () => {
    const seq = ++loadConversationsSeqRef.current
    setConversationsLoading(true)
    try {
      const list = await cachedFetch(`conversations:agent:${activeAgentKey}`, () =>
        fetchConversations(undefined, activeAgentKey),
      )
      if (seq !== loadConversationsSeqRef.current) return
      list.forEach((c) => useChatStore.getState().addConversation(c))
      setConversations(list)

      const stored = readStoredConversationId()

      if (stored) {
        setSelectedConversationId(stored)
        persistConversationId(stored)
        notifyLoopConversationChanged(stored)
        await selectConversation(stored)
        return
      }

      setSelectedConversationId(null)
      persistConversationId(null)
      notifyLoopConversationChanged(null)
      useChatStore.getState().setActiveConversationId(null)
    } finally {
      if (seq === loadConversationsSeqRef.current) {
        setConversationsLoading(false)
      }
    }
  }, [
    activeAgentKey,
    notifyLoopConversationChanged,
    persistConversationId,
    readStoredConversationId,
    setConversations,
    setConversationsLoading,
    setSelectedConversationId,
  ])

  useEffect(() => {
    if (!activeAgentKey) return
    if (storageScope === 'loop' && !spaceId) return
    void loadConversations()
  }, [activeAgentKey, loadConversations, spaceId, storageScope])

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null)
    persistConversationId(null)
    notifyLoopConversationChanged(null)
    useChatStore.getState().setActiveConversationId(null)
    setMode('chat')
    onNewConversation?.()
  }, [
    notifyLoopConversationChanged,
    onNewConversation,
    persistConversationId,
    setMode,
    setSelectedConversationId,
  ])

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      setSelectedConversationId(conversationId)
      persistConversationId(conversationId)
      notifyLoopConversationChanged(conversationId)
      await selectConversation(conversationId)
      setMode('chat')
    },
    [notifyLoopConversationChanged, persistConversationId, setMode, setSelectedConversationId],
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoopChatSelectConversationDetail>).detail
      if (!detail || storageScope !== 'loop' || !spaceId || detail.spaceId !== spaceId) return
      void handleSelectConversation(detail.conversationId)
    }
    window.addEventListener(LOOP_CHAT_SELECT_CONVERSATION_EVENT, handler)
    return () => window.removeEventListener(LOOP_CHAT_SELECT_CONVERSATION_EVENT, handler)
  }, [handleSelectConversation, spaceId, storageScope])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoopChatActivateConversationDetail>).detail
      if (!detail || storageScope !== 'loop' || !spaceId || detail.spaceId !== spaceId) return
      const conversation = detail.conversation
      useChatStore.getState().addConversation(conversation)
      useChatStore.getState().setMessages(conversation.id, [])
      setConversations((prev) => [
        conversation,
        ...prev.filter((row) => row.id !== conversation.id),
      ])
      void handleSelectConversation(conversation.id)
      setMode('chat')
    }
    window.addEventListener(LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT, handler)
    return () => window.removeEventListener(LOOP_CHAT_ACTIVATE_CONVERSATION_EVENT, handler)
  }, [handleSelectConversation, setConversations, setMode, spaceId, storageScope])

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(conversationId)
      useChatStore.getState().removeConversation(conversationId)
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null)
        persistConversationId(null)
      }
      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId))
    },
    [persistConversationId, selectedConversationId, setConversations, setSelectedConversationId],
  )

  const handleRenameConversation = useCallback(
    async (conversationId: string, title: string) => {
      try {
        await renameConversation(conversationId, title)
        useChatStore.getState().updateConversation(conversationId, { title })
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)))
      } catch (err) {
        console.error('Rename conversation failed:', err)
        toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.RENAME_CONVERSATION_FAILED.userMessage)
      }
    },
    [setConversations],
  )

  const handleTogglePinConversation = useCallback(
    async (conversationId: string, pinned: boolean) => {
      try {
        const updated = await setConversationPinned(conversationId, pinned)
        useChatStore.getState().updateConversation(conversationId, { metadata: updated.metadata })
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, metadata: updated.metadata } : c)),
        )
      } catch (err) {
        console.error('Pin conversation failed:', err)
        toast.error(
          pinned
            ? CONVERSATION_ACTIONS_TOAST_ERRORS.PIN_CONVERSATION_FAILED.userMessage
            : CONVERSATION_ACTIONS_TOAST_ERRORS.UNPIN_CONVERSATION_FAILED.userMessage,
        )
      }
    },
    [setConversations],
  )

  const handleToggleArchiveConversation = useCallback(
    async (conversationId: string, archived: boolean) => {
      try {
        const updated = await setConversationArchived(conversationId, archived)
        useChatStore.getState().updateConversation(conversationId, { status: updated.status })
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, status: updated.status } : c)),
        )
      } catch (err) {
        console.error('Archive conversation failed:', err)
        toast.error(
          archived ? 'Could not archive conversation' : 'Could not unarchive conversation',
        )
      }
    },
    [setConversations],
  )

  const handleMoveConversation = useCallback(
    async (conversationId: string, nextCampaignId: string | null) => {
      try {
        const updated = await assignConversationCampaign(conversationId, nextCampaignId)
        useChatStore
          .getState()
          .updateConversation(conversationId, { campaign_id: updated.campaign_id })
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, campaign_id: updated.campaign_id } : c,
          ),
        )
        toast.success(CONVERSATION_ACTIONS_TOAST_SUCCESS.MOVED_TO_CAMPAIGN.userMessage)
      } catch (err) {
        console.error('Move conversation failed:', err)
        toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.MOVE_CONVERSATION_FAILED.userMessage)
      }
    },
    [setConversations],
  )

  const handleDuplicateConversation = useCallback(
    async (conversationId: string) => {
      try {
        const newConv = await duplicateConversation(conversationId, {})
        if ((newConv.agent_id ?? activeAgentKey) === activeAgentKey) {
          setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)])
        }
        toast.success('Conversation duplicated')
      } catch (err) {
        console.error('Duplicate conversation failed:', err)
        toast.error('Could not duplicate conversation.')
      }
    },
    [activeAgentKey, setConversations],
  )

  const buildConversationUrl = useCallback(
    (conversationId: string) => {
      if (typeof window === 'undefined') return ''
      return `${window.location.origin}${pathname}?hr_conv=${encodeURIComponent(conversationId)}`
    },
    [pathname],
  )

  const handleCopyConversationLink = useCallback(
    (conversationId: string) => {
      const url = buildConversationUrl(conversationId)
      if (!url) return
      try {
        void navigator.clipboard.writeText(url)
        toast.success('Link copied')
      } catch {
        toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage)
      }
    },
    [buildConversationUrl],
  )

  const handleCopyConversationId = useCallback((conversationId: string) => {
    try {
      void navigator.clipboard.writeText(conversationId)
      toast.success('ID copied')
    } catch {
      toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.COPY_FAILED.userMessage)
    }
  }, [])

  const handleOpenConversationInNewTab = useCallback(
    (conversationId: string) => {
      const url = buildConversationUrl(conversationId)
      if (!url) return
      openInNewTab(url)
    },
    [buildConversationUrl],
  )

  return {
    loadConversations,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleRenameConversation,
    handleTogglePinConversation,
    handleToggleArchiveConversation,
    handleMoveConversation,
    handleDuplicateConversation,
    handleCopyConversationLink,
    handleCopyConversationId,
    handleOpenConversationInNewTab,
  }
}
