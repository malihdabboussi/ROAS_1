'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import { createClient } from '@/lib/supabase/client'
import type { MissionExecutionState, MissionSubtask } from '../types'

type ToolBlock = Extract<MessageContentBlock, { type: 'tool' }>
type ThinkingBlock = Extract<MessageContentBlock, { type: 'thinking_transcript' }>
type TextBlock = Extract<MessageContentBlock, { type: 'text' }>
type MixedBlock = ToolBlock | ThinkingBlock | TextBlock

const CAMPAIGN_TOOL_NAMES = new Set(['campaign_capability', 'vibey_backend'])

function humanizeToolName(name: string, toolAction?: string): string {
  if (CAMPAIGN_TOOL_NAMES.has(name)) {
    if (toolAction) return `Working on ${toolAction.replace(/[_-]+/g, ' ').trim()}`
    return 'Working on artifact'
  }
  switch (name) {
    case 'web_search':
      return 'Researching your market'
    case 'web_fetch':
      return 'Pulling in reference material'
    case 'read':
      return 'Scanning workspace for context'
    case 'exec':
      return 'Running a command'
    case 'write':
      return 'Writing output'
    case 'edit':
      return 'Editing content'
    case 'wait':
      return 'Waiting for results'
    case 'process':
      return 'Managing background process'
    case 'browser':
      return 'Reviewing a live page'
    case 'image':
      return 'Analyzing an image'
    case 'nano-banana-pro':
      return 'Generating a visual'
    case 'tts':
      return 'Creating audio'
    case 'message':
      return 'Sending a message'
    default:
      return `Running ${(name || 'tool').replace(/[_-]+/g, ' ').trim()}`
  }
}

function normalizeExecutionState(raw: unknown): MissionExecutionState | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  return raw as MissionExecutionState
}

function stepsFromExecutionState(es: MissionExecutionState | undefined): ToolBlock[] {
  if (!es) return []
  const completed = Array.isArray(es.completed_actions) ? es.completed_actions : []
  const blocks: ToolBlock[] = []
  for (let i = 0; i < completed.length; i++) {
    const step = completed[i] as unknown as Record<string, unknown>
    const action = typeof step.action === 'string' ? step.action : 'tool'
    const title = typeof step.title === 'string' ? step.title : `row-${i}`
    const toolAction = typeof step.toolAction === 'string' ? step.toolAction : undefined
    const label = typeof step.label === 'string' ? step.label : humanizeToolName(action, toolAction)
    const stateRaw = step.state
    const state = stateRaw === 'failed' ? 'failed' : 'complete'
    const startedAt = typeof step.startedAt === 'number' ? step.startedAt : Date.now() - i * 100
    const endedAt = typeof step.endedAt === 'string' ? new Date(step.endedAt).getTime() : undefined
    blocks.push({
      type: 'tool',
      id: `tool-${title}`,
      name: action,
      label,
      ...(toolAction ? { action: toolAction } : {}),
      state,
      startedAt,
      ...(endedAt != null ? { endedAt } : {}),
    })
  }
  const ct = es.current_tool
  if (ct && es.execution_status === 'streaming') {
    const name = typeof ct.name === 'string' ? ct.name : 'tool'
    const ctAction = typeof ct.action === 'string' ? ct.action : undefined
    const label = typeof ct.label === 'string' ? ct.label : humanizeToolName(name, ctAction)
    const startedAt = typeof ct.startedAt === 'number' ? ct.startedAt : Date.now()
    blocks.push({
      type: 'tool',
      id: `tool-current-${name}-${startedAt}`,
      name,
      label,
      ...(ctAction ? { action: ctAction } : {}),
      state: 'active',
      startedAt,
    })
  }
  return blocks
}

function getBroadcastInnerPayload(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && 'payload' in payload) {
    const p = (payload as { payload: unknown }).payload
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>
  }
  if (payload && typeof payload === 'object' && !Array.isArray(payload))
    return payload as Record<string, unknown>
  return {}
}

export interface UseMissionExecStreamResult {
  blocks: MixedBlock[]
  isStreaming: boolean
}

export function useMissionExecStream(subtask: MissionSubtask | null): UseMissionExecStreamResult {
  const es = useMemo(
    () => normalizeExecutionState(subtask?.execution_state),
    [subtask?.execution_state],
  )

  const shouldSubscribe = !!subtask?.id && subtask.status === 'in_progress'

  const [toolBlocks, setToolBlocks] = useState<ToolBlock[]>([])
  const [thinkingBlock, setThinkingBlock] = useState<ThinkingBlock | null>(null)
  const [assistantBlock, setAssistantBlock] = useState<TextBlock | null>(null)
  const [streamEnded, setStreamEnded] = useState(false)
  const progressRef = useRef<
    Record<string, Array<{ id: string; detail: string; timestamp: number }>>
  >({})
  const prevSubtaskIdRef = useRef<string | null>(null)

  const esSerialized = useMemo(
    () => JSON.stringify(subtask?.execution_state ?? null),
    [subtask?.execution_state],
  )

  useEffect(() => {
    const id = subtask?.id ?? null
    if (prevSubtaskIdRef.current !== id) {
      prevSubtaskIdRef.current = id
      progressRef.current = {}
      setThinkingBlock(null)
      setAssistantBlock(null)
      setStreamEnded(false)
    }
    if (!id) {
      setToolBlocks([])
      return
    }
    const state = normalizeExecutionState(subtask?.execution_state)
    const base = stepsFromExecutionState(state)
    const pr = progressRef.current
    setToolBlocks(
      base.map((b) => {
        const extra = pr[b.id]
        if (extra?.length) return { ...b, progress: [...extra] }
        return b
      }),
    )
    if (state?.execution_status === 'complete' || state?.execution_status === 'failed') {
      setStreamEnded(true)
    }
  }, [subtask?.id, esSerialized])

  const isStreaming =
    !streamEnded &&
    ((subtask?.status === 'in_progress' && es?.execution_status === 'streaming') ||
      toolBlocks.some((b) => b.state === 'active'))

  useEffect(() => {
    if (!shouldSubscribe || !subtask?.id) return

    const supabase = createClient()
    const topic = `mission-exec:${subtask.id}`
    const ch = supabase.channel(topic)

    const onPayload = (event: string, handler: (p: Record<string, unknown>) => void) => {
      ch.on('broadcast', { event }, (msg: unknown) => {
        handler(getBroadcastInnerPayload(msg))
      })
    }

    onPayload('tool_start', (p) => {
      const name = String(p.name ?? 'tool')
      const label = String(p.label ?? humanizeToolName(name))
      const action = typeof p.action === 'string' ? p.action : undefined
      const tool_call_id = typeof p.tool_call_id === 'string' ? p.tool_call_id : undefined
      const id = tool_call_id ? `tool-${tool_call_id}` : `tool-live-${name}-${Date.now()}`
      setStreamEnded(false)
      setThinkingBlock(null)
      setToolBlocks((prev) => {
        let next = prev
        if (tool_call_id) {
          next = prev.filter(
            (b) =>
              !(
                b.type === 'tool' &&
                b.state === 'active' &&
                b.id.startsWith('tool-current-') &&
                b.name === name
              ),
          )
        }
        if (next.some((b) => b.id === id)) return next
        const block: ToolBlock = {
          type: 'tool',
          id,
          name,
          label,
          ...(action ? { action } : {}),
          state: 'active',
          startedAt: Date.now(),
          ...(progressRef.current[id]?.length ? { progress: [...progressRef.current[id]!] } : {}),
        }
        return [...next, block]
      })
    })

    onPayload('tool_update', (p) => {
      const detail = String(p.detail ?? '')
      const tool_call_id = typeof p.tool_call_id === 'string' ? p.tool_call_id : undefined
      const name = typeof p.name === 'string' ? p.name : 'tool'
      const targetId = tool_call_id ? `tool-${tool_call_id}` : null
      const entry = {
        id: `prog-${Date.now()}`,
        detail,
        timestamp: Date.now(),
      }
      setToolBlocks((prev) => {
        let hit = false
        const next = prev.map((b) => {
          if (b.type !== 'tool') return b
          const match =
            (targetId != null && b.id === targetId) ||
            (targetId == null && b.state === 'active' && b.name === name)
          if (!match) return b
          hit = true
          const pr = [...(b.progress ?? []), entry]
          progressRef.current[b.id] = pr
          return { ...b, progress: pr }
        })
        if (!hit && targetId != null) {
          const pr = [...(progressRef.current[targetId] ?? []), entry]
          progressRef.current[targetId] = pr
        }
        return hit ? next : prev
      })
    })

    onPayload('tool_done', (p) => {
      const tool_call_id = typeof p.tool_call_id === 'string' ? p.tool_call_id : undefined
      const name = String(p.name ?? 'tool')
      const targetId = tool_call_id ? `tool-${tool_call_id}` : null
      const failed = p.status === 'failed'
      setToolBlocks((prev) =>
        prev.map((b) => {
          if (b.type !== 'tool') return b
          const match =
            (targetId != null && b.id === targetId) ||
            (targetId == null && b.state === 'active' && b.name === name)
          if (!match) return b
          return {
            ...b,
            state: failed ? 'failed' : 'complete',
            endedAt: Date.now(),
          }
        }),
      )
    })

    onPayload('thinking_delta', (p) => {
      const delta = typeof p.delta === 'string' ? p.delta : ''
      const text = typeof p.text === 'string' ? p.text : ''
      const content = text || delta
      if (!content) return
      setThinkingBlock((prev) => {
        const accumulated = text || (prev?.content ?? '') + delta
        return {
          type: 'thinking_transcript',
          id: prev?.id ?? `thinking-${Date.now()}`,
          content: accumulated,
          state: 'active',
        }
      })
    })

    onPayload('assistant_delta', (p) => {
      const delta = typeof p.delta === 'string' ? p.delta : ''
      if (!delta) return
      setAssistantBlock((prev) => ({
        type: 'text',
        id: prev?.id ?? `assistant-${Date.now()}`,
        content: (prev?.content ?? '') + delta,
      }))
    })

    onPayload('exec_complete', () => {
      setStreamEnded(true)
      setThinkingBlock((prev) => (prev ? { ...prev, state: 'complete' } : null))
      setToolBlocks((prev) =>
        prev.map((b) =>
          b.type === 'tool' && b.state === 'active'
            ? { ...b, state: 'complete' as const, endedAt: Date.now() }
            : b,
        ),
      )
    })

    onPayload('exec_failed', () => {
      setStreamEnded(true)
      setThinkingBlock((prev) => (prev ? { ...prev, state: 'complete' } : null))
      setToolBlocks((prev) =>
        prev.map((b) =>
          b.type === 'tool' && b.state === 'active'
            ? { ...b, state: 'failed' as const, endedAt: Date.now() }
            : b,
        ),
      )
    })

    ch.subscribe()

    return () => {
      void supabase.removeChannel(ch)
    }
  }, [shouldSubscribe, subtask?.id])

  const blocks = useMemo<MixedBlock[]>(() => {
    const result: MixedBlock[] = [...toolBlocks]
    if (thinkingBlock && thinkingBlock.content?.trim()) {
      result.push(thinkingBlock)
    }
    if (assistantBlock && assistantBlock.content.trim()) {
      result.push(assistantBlock)
    }
    return result
  }, [toolBlocks, thinkingBlock, assistantBlock])

  return {
    blocks,
    isStreaming,
  }
}
