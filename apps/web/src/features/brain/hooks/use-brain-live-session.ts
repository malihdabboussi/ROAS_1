'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { backendPost } from '@/lib/api/backend-client'
import { useChatStore } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  buildBrainLiveWsUrl,
  describeBrainLiveWsClose,
  resolveBrainLiveWsOrigin,
} from '@/lib/brain/brain-live-ws-url'
import { AudioPlaybackQueue } from '../lib/audio-playback'
import {
  checkMicPermission,
  classifyMicError,
  getUserId,
  MIC_SAMPLE_RATE,
  startMicCapture,
} from './brain-live-session-audio'
import {
  useBrainLiveSessionMessages,
  type LiveSessionDelegationSnapshot,
} from './use-brain-live-session-messages'
import type {
  BrainLiveScope,
  LiveSessionState,
  ServerEvent,
  ToolCallEvent,
} from './brain-live-session.types'

export type { BrainLiveScope, LiveSessionState, ToolCallEvent } from './brain-live-session.types'

export function useBrainLiveSession(scope?: BrainLiveScope) {
  const [state, setState] = useState<LiveSessionState>('idle')
  const [inputTranscript, setInputTranscript] = useState('')
  const [outputTranscript, setOutputTranscript] = useState('')
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null)
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null)
  const [toolCallEvents, setToolCallEvents] = useState<ToolCallEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const audioLevelRef = useRef(0)
  const micInputLevelRef = useRef(0)
  const [isMuted, setIsMuted] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const playbackRef = useRef<AudioPlaybackQueue | null>(null)
  const sessionStartRef = useRef<number>(0)
  const animFrameRef = useRef<number>(0)
  const mountedRef = useRef(true)
  const stateRef = useRef<LiveSessionState>('idle')
  const isMutedRef = useRef(false)

  const delegationStartedThisTurnRef = useRef(false)
  const conversationIdRef = useRef<string | null>(scope?.conversationId ?? null)
  const {
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
  } = useBrainLiveSessionMessages(conversationIdRef)

  useEffect(() => {
    conversationIdRef.current = scope?.conversationId ?? null
  }, [scope?.conversationId])

  const updateState = useCallback((s: LiveSessionState) => {
    stateRef.current = s
    setState(s)
  }, [])

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current
    isMutedRef.current = next
    setIsMuted(next)
  }, [])

  const pollAmplitude = useCallback(() => {
    if (!mountedRef.current) return
    const playback = playbackRef.current
    if (playback) {
      audioLevelRef.current = playback.getAmplitude()
    }
    animFrameRef.current = requestAnimationFrame(pollAmplitude)
  }, [])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    if (playbackRef.current) {
      playbackRef.current.destroy()
      playbackRef.current = null
    }
    audioLevelRef.current = 0
    micInputLevelRef.current = 0
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch {}
      wsRef.current = null
    }
  }, [])

  const connectSession = useCallback(
    async (reconnect: boolean) => {
      if (stateRef.current !== 'idle' && stateRef.current !== 'error') return
      updateState('connecting')
      setError(null)
      setInputTranscript('')
      setOutputTranscript('')
      setActiveToolCall(null)
      setActiveToolLabel(null)
      setToolCallEvents([])
      clearTurnMessages()
      if (!reconnect) {
        clearDelegations()
      }

      try {
        const permResult = await checkMicPermission()
        if (permResult) {
          setError(permResult)
          updateState('error')
          return
        }

        const {
          sessionId,
          wsUrl: machineWsBase,
          machineId,
          delegations,
        } = await backendPost<{
          sessionId: string
          wsUrl: string | null
          machineId?: string | null
          delegations: LiveSessionDelegationSnapshot[]
        }>('/api/brain/live-session', {
          scope: scope ?? { type: 'user' },
          conversationId: scope?.conversationId ?? undefined,
          voiceName: scope?.voiceName ?? undefined,
          reconnect: reconnect || undefined,
        })

        if (reconnect && delegations && delegations.length > 0) {
          hydrateDelegationSnapshots(delegations)
        }

        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: MIC_SAMPLE_RATE,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          })
        } catch (err) {
          const micError = classifyMicError(err)
          setError(micError)
          updateState('error')
          return
        }
        micStreamRef.current = stream

        const playback = new AudioPlaybackQueue()
        await playback.init()
        playback.onStateChange = (playing) => {
          if (!mountedRef.current) return
          if (playing && stateRef.current === 'listening') {
            updateState('speaking')
          } else if (!playing && stateRef.current === 'speaking') {
            updateState('listening')
            if (delegationStartedThisTurnRef.current) {
              delegationStartedThisTurnRef.current = false
              new Audio('/sounds/voice-tool-working.mp3').play().catch(() => {})
            }
          }
        }
        playbackRef.current = playback

        const uid = await getUserId()
        const backendOrigin = resolveBrainLiveWsOrigin({
          machineWsBase,
          publicWsUrl: process.env.NEXT_PUBLIC_API_WS_URL,
          windowHostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
        })
        const wsUrl = buildBrainLiveWsUrl(backendOrigin, sessionId, uid, machineId)

        const ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws

        ws.onopen = () => {
          sessionStartRef.current = Date.now()
        }

        ws.onmessage = (event) => {
          if (!mountedRef.current) return

          if (event.data instanceof ArrayBuffer) {
            playback.enqueue(event.data)
            return
          }

          try {
            const msg: ServerEvent = JSON.parse(event.data as string)
            const store = useChatStore.getState()
            const convId = conversationIdRef.current

            switch (msg.type) {
              case 'ready':
                updateState('listening')
                startMicCapture(stream, ws, isMutedRef, micInputLevelRef)
                animFrameRef.current = requestAnimationFrame(pollAmplitude)
                break

              case 'inputTranscript':
                if (msg.text) {
                  setInputTranscript(msg.text)
                  if (!tempUserMsgIdRef.current) createTempUserMessage()
                  if (convId && tempUserMsgIdRef.current) {
                    store.updateMessage(convId, tempUserMsgIdRef.current, { content: msg.text })
                  }
                }
                break

              case 'outputTranscript':
                if (msg.text) {
                  setOutputTranscript((prev) => prev + msg.text)
                  if (!hasCreatedAssistantMsgRef.current) createTempAssistantMessage()
                  if (convId && tempAssistantMsgIdRef.current) {
                    store.appendToMessage(convId, tempAssistantMsgIdRef.current, msg.text!)
                    store.appendTextToOrderedBlocks(
                      convId,
                      tempAssistantMsgIdRef.current,
                      msg.text!,
                    )
                  }
                }
                break

              case 'delegationStarted': {
                const did = (msg.delegation_id as string) ?? ''
                const task = (msg.task as string) ?? ''
                if (did && convId) getOrCreateDelegationMessage(did, task)
                delegationStartedThisTurnRef.current = true
                break
              }

              case 'toolCallStart': {
                const action = (msg.action as string) ?? 'tool'
                const label = (msg.label as string) ?? 'Working...'
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did ? getOrCreateDelegationMessage(did) : null
                setActiveToolCall(action)
                setActiveToolLabel(label)
                updateState('toolCall')
                setToolCallEvents((prev) => [...prev, { action, label, status: 'running' }])
                if (convId && targetMsgId) {
                  store.pushToolToOrderedBlocks(convId, targetMsgId, {
                    name: action,
                    label,
                    state: 'active',
                    startedAt: Date.now(),
                  })
                } else if (convId) {
                  if (!hasCreatedAssistantMsgRef.current) createTempAssistantMessage()
                  if (tempAssistantMsgIdRef.current) {
                    store.pushToolToOrderedBlocks(convId, tempAssistantMsgIdRef.current, {
                      name: action,
                      label,
                      state: 'active',
                      startedAt: Date.now(),
                    })
                  }
                }
                break
              }

              case 'toolCallEnd': {
                const action = (msg.action as string) ?? 'tool'
                const status = msg.success ? 'completed' : 'failed'
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did
                  ? delegationMsgMapRef.current.get(did)
                  : tempAssistantMsgIdRef.current
                setActiveToolCall(null)
                setActiveToolLabel(null)
                if (stateRef.current === 'toolCall') updateState('listening')
                setToolCallEvents((prev) =>
                  prev.map((e) =>
                    e.action === action && e.status === 'running'
                      ? { ...e, status: msg.success ? 'completed' : 'failed' }
                      : e,
                  ),
                )
                if (convId && targetMsgId) {
                  store.updateToolBlockByName(convId, targetMsgId, action, status, Date.now())
                }
                break
              }

              case 'toolUpdate': {
                const name = (msg.name as string) ?? 'tool'
                const detail = (msg.detail as string) ?? ''
                const toolCallId = msg.tool_call_id as string | undefined
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did
                  ? delegationMsgMapRef.current.get(did)
                  : tempAssistantMsgIdRef.current
                if (detail && convId && targetMsgId) {
                  store.appendToolProgressToOrderedBlocks(
                    convId,
                    targetMsgId,
                    name,
                    detail,
                    Date.now(),
                    toolCallId,
                  )
                }
                break
              }

              case 'generationStart': {
                const label = (msg.label as string) ?? 'Generating...'
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did
                  ? delegationMsgMapRef.current.get(did)
                  : tempAssistantMsgIdRef.current
                if (convId && targetMsgId) {
                  store.pushGenerationStartToOrderedBlocks(convId, targetMsgId, {
                    label,
                    timestamp: Date.now(),
                  })
                }
                break
              }

              case 'generationEnd': {
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did
                  ? delegationMsgMapRef.current.get(did)
                  : tempAssistantMsgIdRef.current
                if (convId && targetMsgId) {
                  store.completeGenerationInOrderedBlocks(convId, targetMsgId, Date.now())
                }
                break
              }

              case 'uiBlock': {
                const block = msg.block as Record<string, unknown> | undefined
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did
                  ? getOrCreateDelegationMessage(did)
                  : tempAssistantMsgIdRef.current
                if (block && convId && targetMsgId) {
                  store.appendUiBlockToOrderedBlocks(convId, targetMsgId, block)
                }
                break
              }

              case 'thinkingDelta': {
                const delta = (msg.delta as string) ?? ''
                const text = (msg.text as string) ?? ''
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did
                  ? getOrCreateDelegationMessage(did)
                  : tempAssistantMsgIdRef.current
                if (convId && targetMsgId && (delta || text)) {
                  const msgs = store.messagesByConversation[convId] ?? []
                  const existing = msgs.find((m) => m.id === targetMsgId)
                  const ordered =
                    ((existing?.metadata as Record<string, unknown>)
                      ?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
                  const thinkIdx = ordered.findIndex((b) => b.type === 'thinking_transcript')
                  const content = text || delta
                  const block = {
                    type: 'thinking_transcript' as const,
                    id: 'thinking-transcript',
                    content,
                    state: 'active' as const,
                  }
                  const next =
                    thinkIdx !== -1
                      ? ordered.map((b, i) => (i === thinkIdx ? block : b))
                      : [block, ...ordered]
                  const meta = (existing?.metadata as Record<string, unknown>) ?? {}
                  store.updateMessage(convId, targetMsgId, {
                    metadata: { ...meta, content_blocks_ordered: next },
                  })
                }
                break
              }

              case 'statusUpdate': {
                const phase = (msg.phase as string) ?? 'thinking'
                const message = typeof msg.message === 'string' ? msg.message : null
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did
                  ? (delegationMsgMapRef.current.get(did) ?? getOrCreateDelegationMessage(did))
                  : tempAssistantMsgIdRef.current
                if (convId && targetMsgId) {
                  if (phase === 'compacting') {
                    store.pushSessionCompactionToOrderedBlocks(convId, targetMsgId, {
                      label: message ?? 'Summarizing our conversation',
                      timestamp: Date.now(),
                    })
                    break
                  }
                  store.completeSessionCompactionInOrderedBlocks(convId, targetMsgId, Date.now())
                }
                if (convId) {
                  store.updateConversationStreamUI(convId, () => ({
                    agentPhase: phase as 'thinking' | 'executing' | 'streaming',
                    ...(message !== null ? { agentStatusMessage: message } : {}),
                  }))
                }
                break
              }

              case 'contentDelta': {
                const delta = (msg.content as string) ?? ''
                const did = msg.delegation_id as string | undefined
                const targetMsgId = did ? delegationMsgMapRef.current.get(did) : null
                if (delta && convId && targetMsgId) {
                  store.appendToMessage(convId, targetMsgId, delta)
                  store.appendTextToOrderedBlocks(convId, targetMsgId, delta)
                }
                break
              }

              case 'delegationComplete': {
                const did = (msg.delegation_id as string) ?? ''
                const completedStatus = (msg.status as 'completed' | 'failed') ?? 'completed'
                if (did) {
                  updateDelegationTaskStatus(did, completedStatus)
                  const dmId = delegationMsgMapRef.current.get(did)
                  if (convId && dmId) {
                    updateDelegationMessageStatus(dmId, completedStatus)
                    store.setConversationStreamingMessageId(convId, null)
                  }
                }
                if (convId) {
                  store.updateConversationStreamUI(convId, () => ({
                    agentPhase: 'streaming' as const,
                    agentStatusMessage: null,
                    activeTools: [],
                  }))
                }
                break
              }

              case 'interrupted':
                playback.flush()
                setOutputTranscript('')
                break

              case 'turnComplete':
                if (delegationStartedThisTurnRef.current) {
                  delegationStartedThisTurnRef.current = false
                  new Audio('/sounds/voice-tool-working.mp3').play().catch(() => {})
                }
                if (stateRef.current === 'speaking') updateState('listening')
                setInputTranscript('')
                setOutputTranscript('')
                setToolCallEvents([])
                if (convId) store.setConversationStreamingMessageId(convId, null)
                clearTurnMessages()
                break

              case 'messageSaved': {
                const saved = msg.message as Record<string, unknown> | undefined
                if (!saved || !convId) break
                handleSavedMessage(saved)
                setInputTranscript('')
                setOutputTranscript('')
                break
              }

              case 'sessionEnded':
                if (convId) store.setConversationStreamingMessageId(convId, null)
                cleanup()
                updateState('idle')
                break

              case 'error':
                setError(typeof msg.message === 'string' ? msg.message : 'Unknown error')
                if (convId) store.setConversationStreamingMessageId(convId, null)
                cleanup()
                updateState('error')
                break
            }
          } catch {}
        }

        ws.onerror = () => {
          if (stateRef.current === 'error') return
          setError('Connection error')
          cleanup()
          updateState('error')
        }

        ws.onclose = (event) => {
          if (mountedRef.current && stateRef.current !== 'idle' && stateRef.current !== 'error') {
            const closeMessage = describeBrainLiveWsClose(event.code, event.reason)
            if (closeMessage) {
              setError(closeMessage)
              cleanup()
              updateState('error')
              return
            }
            cleanup()
            updateState('idle')
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session')
        cleanup()
        updateState('error')
      }
    },
    [
      cleanup,
      updateState,
      pollAmplitude,
      scope,
      clearTurnMessages,
      clearDelegations,
      createTempUserMessage,
      createTempAssistantMessage,
      getOrCreateDelegationMessage,
      hydrateDelegationSnapshots,
      updateDelegationTaskStatus,
      updateDelegationMessageStatus,
      handleSavedMessage,
    ],
  )

  const startSession = useCallback(() => connectSession(false), [connectSession])
  const reconnectSession = useCallback(() => connectSession(true), [connectSession])

  const endSession = useCallback(() => {
    const ws = wsRef.current
    const convId = conversationIdRef.current
    const tasks = delegationTasksRef.current
    if (ws?.readyState === WebSocket.OPEN && tasks.length > 0 && convId) {
      ws.send(
        JSON.stringify({
          type: 'saveVoiceTasks',
          conversationId: convId,
          tasks: tasks.map((t) => ({
            delegationId: t.delegationId,
            task: t.task,
            status: t.status,
          })),
        }),
      )
    }
    syncDelegationTaskMetadata(tasks)
    cleanup()
    updateState('idle')
  }, [cleanup, delegationTasksRef, syncDelegationTaskMetadata, updateState])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  const sendApproval = useCallback((delegationId: string, message: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'approveTask', delegationId, message }))
    }
  }, [])

  return {
    state,
    inputTranscript,
    outputTranscript,
    activeToolCall,
    activeToolLabel,
    toolCallEvents,
    audioLevelRef,
    micInputLevelRef,
    error,
    isMuted,
    delegationTasks,
    startSession,
    reconnectSession,
    endSession,
    toggleMute,
    sendApproval,
  }
}
