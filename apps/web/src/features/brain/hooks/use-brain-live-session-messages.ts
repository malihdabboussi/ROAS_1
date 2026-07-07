import { useCallback, useRef, useState, type MutableRefObject } from 'react'
import { useChatStore, type Message } from '@/lib/chat/studio-chat-runtime-adapter'

export interface LiveSessionDelegationTask {
  delegationId: string
  messageId: string
  task: string
  status: 'running' | 'completed' | 'failed'
}

export interface LiveSessionDelegationSnapshot {
  delegationId: string
  task: string
  status: 'running' | 'completed' | 'failed'
  currentTool: string | null
  toolSteps: Array<{ name: string; label: string; status: string }>
  content: string
  orderedBlocks: Array<Record<string, unknown>>
  startedAt: number
  completedAt?: number
}

export function useBrainLiveSessionMessages(
  conversationIdRef: MutableRefObject<string | null>,
) {
  const [delegationTasks, setDelegationTasks] = useState<LiveSessionDelegationTask[]>([])
  const tempUserMsgIdRef = useRef<string | null>(null)
  const tempAssistantMsgIdRef = useRef<string | null>(null)
  const delegationMsgMapRef = useRef<Map<string, string>>(new Map())
  const hasCreatedAssistantMsgRef = useRef(false)
  const delegationTasksRef = useRef(delegationTasks)
  delegationTasksRef.current = delegationTasks

  const clearTurnMessages = useCallback(() => {
    tempUserMsgIdRef.current = null
    tempAssistantMsgIdRef.current = null
    hasCreatedAssistantMsgRef.current = false
  }, [])

  const clearDelegations = useCallback(() => {
    setDelegationTasks([])
    delegationMsgMapRef.current.clear()
  }, [])

  const createTempUserMessage = useCallback(() => {
    const convId = conversationIdRef.current
    if (!convId) return null
    const id = `voice-user-${Date.now()}`
    const msg: Message = {
      id,
      conversation_id: convId,
      role: 'user',
      content: '',
      content_blocks: null,
      created_at: new Date().toISOString(),
      metadata: { source: 'voice_live' },
    }
    useChatStore.getState().addMessage(convId, msg)
    tempUserMsgIdRef.current = id
    return id
  }, [conversationIdRef])

  const createTempAssistantMessage = useCallback(() => {
    const convId = conversationIdRef.current
    if (!convId) return null
    const id = `voice-assistant-${Date.now()}`
    const msg: Message = {
      id,
      conversation_id: convId,
      role: 'assistant',
      content: '',
      content_blocks: null,
      created_at: new Date().toISOString(),
      metadata: { source: 'voice_live', content_blocks_ordered: [] },
    }
    const store = useChatStore.getState()
    store.addMessage(convId, msg)
    store.setConversationStreamingMessageId(convId, id)
    tempAssistantMsgIdRef.current = id
    hasCreatedAssistantMsgRef.current = true
    return id
  }, [conversationIdRef])

  const getOrCreateDelegationMessage = useCallback(
    (delegationId: string, task?: string) => {
      const existing = delegationMsgMapRef.current.get(delegationId)
      if (existing) return existing
      const convId = conversationIdRef.current
      if (!convId) return null
      const id = `voice-delegation-${delegationId.slice(0, 8)}-${Date.now()}`
      const msg: Message = {
        id,
        conversation_id: convId,
        role: 'assistant',
        content: '',
        content_blocks: null,
        created_at: new Date().toISOString(),
        metadata: {
          source: 'voice_live',
          delegation_task: true,
          delegation_id: delegationId,
          voice_task_label: task ?? '',
          voice_task_status: 'running',
          content_blocks_ordered: [],
        },
      }
      const store = useChatStore.getState()
      store.addMessage(convId, msg)
      store.setConversationStreamingMessageId(convId, id)
      delegationMsgMapRef.current.set(delegationId, id)
      setDelegationTasks((prev) => [
        ...prev,
        { delegationId, messageId: id, task: task ?? '', status: 'running' },
      ])
      return id
    },
    [conversationIdRef],
  )

  const hydrateDelegationSnapshots = useCallback(
    (delegations: LiveSessionDelegationSnapshot[]) => {
      const convId = conversationIdRef.current
      const store = useChatStore.getState()
      for (const delegation of delegations) {
        if (delegationMsgMapRef.current.has(delegation.delegationId)) continue
        const msgId = `voice-delegation-${delegation.delegationId.slice(0, 8)}-${Date.now()}`
        if (convId) {
          const msg: Message = {
            id: msgId,
            conversation_id: convId,
            role: 'assistant',
            content: delegation.content,
            content_blocks: null,
            created_at: new Date(delegation.startedAt).toISOString(),
            metadata: {
              source: 'voice_live',
              delegation_task: true,
              delegation_id: delegation.delegationId,
              voice_task_label: delegation.task,
              voice_task_status: delegation.status,
              content_blocks_ordered: delegation.orderedBlocks,
            },
          }
          store.addMessage(convId, msg)
        }
        delegationMsgMapRef.current.set(delegation.delegationId, msgId)
        setDelegationTasks((prev) => {
          if (prev.some((task) => task.delegationId === delegation.delegationId)) return prev
          return [
            ...prev,
            {
              delegationId: delegation.delegationId,
              messageId: msgId,
              task: delegation.task,
              status: delegation.status,
            },
          ]
        })
      }
    },
    [conversationIdRef],
  )

  const updateDelegationTaskStatus = useCallback(
    (delegationId: string, status: 'running' | 'completed' | 'failed') => {
      setDelegationTasks((prev) =>
        prev.map((task) => (task.delegationId === delegationId ? { ...task, status } : task)),
      )
    },
    [],
  )

  const updateDelegationMessageStatus = useCallback(
    (messageId: string, status: 'running' | 'completed' | 'failed') => {
      const convId = conversationIdRef.current
      if (!convId) return
      const store = useChatStore.getState()
      const messages = store.messagesByConversation[convId] ?? []
      const existing = messages.find((message) => message.id === messageId)
      const existingMeta = (existing?.metadata as Record<string, unknown>) ?? {}
      store.updateMessage(convId, messageId, {
        metadata: { ...existingMeta, voice_task_status: status },
      })
    },
    [conversationIdRef],
  )

  const syncDelegationTaskMetadata = useCallback(
    (tasks: LiveSessionDelegationTask[]) => {
      const convId = conversationIdRef.current
      if (!convId || tasks.length === 0) return
      const store = useChatStore.getState()
      for (const task of tasks) {
        const messageId = delegationMsgMapRef.current.get(task.delegationId)
        if (!messageId) continue
        const messages = store.messagesByConversation[convId] ?? []
        const existing = messages.find((message) => message.id === messageId)
        const existingMeta = (existing?.metadata as Record<string, unknown>) ?? {}
        store.updateMessage(convId, messageId, {
          metadata: {
            ...existingMeta,
            voice_task_status: task.status,
            voice_task_label: task.task,
          },
        })
      }
    },
    [conversationIdRef],
  )

  const handleSavedMessage = useCallback(
    (saved: Record<string, unknown>) => {
      const convId = conversationIdRef.current
      if (!convId) return
      const store = useChatStore.getState()
      const savedId = String(saved.id ?? '')
      const savedRole = String(saved.role ?? '')
      if (!savedId) return
      if (savedRole === 'user' && tempUserMsgIdRef.current) {
        store.updateMessage(convId, tempUserMsgIdRef.current, {
          id: savedId,
          content: String(saved.content ?? ''),
          created_at: String(saved.created_at ?? ''),
        })
        tempUserMsgIdRef.current = null
        return
      }
      if (savedRole === 'assistant' && tempAssistantMsgIdRef.current) {
        const existingMsgs = store.messagesByConversation[convId] ?? []
        const existingMsg = existingMsgs.find((message) => message.id === tempAssistantMsgIdRef.current)
        const existingOrdered = (existingMsg?.metadata as Record<string, unknown>)
          ?.content_blocks_ordered
        const dbMeta = (saved.metadata as Record<string, unknown>) ?? {}
        const mergedMeta = {
          ...dbMeta,
          ...(existingOrdered ? { content_blocks_ordered: existingOrdered } : {}),
        }
        store.updateMessage(convId, tempAssistantMsgIdRef.current, {
          id: savedId,
          content: String(saved.content ?? ''),
          created_at: String(saved.created_at ?? ''),
          metadata: mergedMeta,
        })
        tempAssistantMsgIdRef.current = null
        hasCreatedAssistantMsgRef.current = false
        return
      }
      store.addMessage(convId, saved as unknown as Message)
    },
    [conversationIdRef],
  )

  return {
    delegationTasks,
    delegationTasksRef,
    delegationMsgMapRef,
    tempUserMsgIdRef,
    tempAssistantMsgIdRef,
    hasCreatedAssistantMsgRef,
    clearTurnMessages,
    clearDelegations,
    createTempUserMessage,
    createTempAssistantMessage,
    getOrCreateDelegationMessage,
    hydrateDelegationSnapshots,
    updateDelegationTaskStatus,
    updateDelegationMessageStatus,
    syncDelegationTaskMetadata,
    handleSavedMessage,
  }
}
