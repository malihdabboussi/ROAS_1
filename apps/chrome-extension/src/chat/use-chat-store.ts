import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { AgentPhase, ChatMessage, ContentBlock, StreamState, ToolBlock } from './types'

interface ChatStore {
  messages: ChatMessage[]
  stream: StreamState
  conversationId: string | null
  loading: boolean
}

const DEFAULT_STREAM: StreamState = {
  conversationId: null,
  messageId: null,
  phase: 'idle',
  statusMessage: null,
  content: '',
  contentBlocks: [],
  tools: [],
}

let state: ChatStore = {
  messages: [],
  stream: { ...DEFAULT_STREAM },
  conversationId: null,
  loading: false,
}

const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((l) => l())
}
function getSnapshot() {
  return state
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function setState(partial: Partial<ChatStore>) {
  state = { ...state, ...partial }
  emit()
}

function updateStream(fn: (s: StreamState) => Partial<StreamState>) {
  const patch = fn(state.stream)
  state = { ...state, stream: { ...state.stream, ...patch } }
  emit()
}

function thinkingIdForStream(s: StreamState): string {
  return `thinking-transcript-${s.messageId || 'live'}`
}

export function useChatExtStore() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function chatStoreActions() {
  return {
    setConversationId(id: string | null) {
      setState({ conversationId: id })
    },
    setMessages(msgs: ChatMessage[]) {
      setState({ messages: msgs })
    },
    setLoading(v: boolean) {
      setState({ loading: v })
    },
    resetStream(convId: string | null) {
      setState({ stream: { ...DEFAULT_STREAM, conversationId: convId } })
    },

    onMessageStart(messageId: string) {
      updateStream(() => ({
        messageId,
        phase: 'thinking',
        content: '',
        contentBlocks: [],
        tools: [],
        statusMessage: null,
      }))
    },

    onStatus(phase: string, message: string | null) {
      const mapped: AgentPhase =
        phase === 'streaming' ? 'streaming' : phase === 'executing' ? 'executing' : 'thinking'
      updateStream((s) => {
        let contentBlocks = [...s.contentBlocks]
        if (phase === 'thinking') {
          const hasThinking = contentBlocks.some((b) => b.type === 'thinking_transcript')
          if (!hasThinking) {
            contentBlocks.push({
              type: 'thinking_transcript',
              id: thinkingIdForStream(s),
              content: '',
              state: 'active',
            })
          }
        } else {
          contentBlocks = contentBlocks.map((b) =>
            b.type === 'thinking_transcript' && b.state === 'active'
              ? { ...b, state: 'complete' as const }
              : b,
          )
        }
        return { phase: mapped, statusMessage: message, contentBlocks }
      })
    },

    onThinkingDelta(text: string) {
      updateStream((s) => {
        const blocks = [...s.contentBlocks]
        const id = thinkingIdForStream(s)
        const idx = blocks.findIndex((b) => b.type === 'thinking_transcript')
        const next: ContentBlock = {
          type: 'thinking_transcript',
          id,
          content: text,
          state: 'active',
        }
        if (idx >= 0) blocks[idx] = next
        else blocks.push(next)
        return { contentBlocks: blocks }
      })
    },

    onContentDelta(text: string) {
      updateStream((s) => {
        const blocks = [...s.contentBlocks]
        const last = blocks[blocks.length - 1]
        if (last && last.type === 'text') {
          blocks[blocks.length - 1] = { ...last, content: (last.content ?? '') + text }
        } else {
          blocks.push({ type: 'text', id: `t-${Date.now()}`, content: text })
        }
        return { phase: 'streaming', content: s.content + text, contentBlocks: blocks }
      })
    },

    onToolStart(name: string, label: string, action?: string, toolCallId?: string) {
      const tool: ToolBlock = {
        id: toolCallId || `tool-${name}-${Date.now()}`,
        name,
        label,
        action,
        toolCallId,
        state: 'active',
        startedAt: Date.now(),
        progress: [],
      }
      updateStream((s) => ({
        phase: 'executing',
        statusMessage: null,
        tools: [...s.tools, tool],
        contentBlocks: [...s.contentBlocks, { type: 'tool', id: tool.id, tool }],
      }))
    },

    onToolUpdate(name: string, detail: string, toolCallId?: string) {
      const ts = Date.now()
      const patchTool = (t: ToolBlock): ToolBlock => {
        const match = toolCallId ? t.toolCallId === toolCallId : t.name === name && t.state === 'active'
        if (!match) return t
        const progress = [...(t.progress ?? []), { id: `tp-${name}-${ts}-${(t.progress ?? []).length}`, detail, timestamp: ts }]
        return { ...t, progress }
      }
      updateStream((s) => ({
        tools: s.tools.map(patchTool),
        contentBlocks: s.contentBlocks.map((b) =>
          b.type === 'tool' && b.tool ? { ...b, tool: patchTool(b.tool) } : b,
        ),
      }))
    },

    onToolContentPreview(name: string, preview: string, toolCallId?: string) {
      updateStream((s) => ({
        tools: s.tools.map((t) => {
          const match = toolCallId ? t.toolCallId === toolCallId : t.name === name && t.state === 'active'
          if (!match) return t
          return { ...t, preview }
        }),
        contentBlocks: s.contentBlocks.map((b) => {
          if (b.type !== 'tool' || !b.tool) return b
          const t = b.tool
          const match = toolCallId ? t.toolCallId === toolCallId : t.name === name && t.state === 'active'
          if (!match) return b
          return { ...b, tool: { ...t, preview } }
        }),
      }))
    },

    onGenerationStart(label: string) {
      const id = `gen-${Date.now()}`
      updateStream((s) => ({
        contentBlocks: [
          ...s.contentBlocks,
          { type: 'generation', id, label, state: 'active' },
        ],
      }))
    },

    onGenerationEnd() {
      updateStream((s) => ({
        contentBlocks: s.contentBlocks.map((b) =>
          b.type === 'generation' && b.state === 'active' ? { ...b, state: 'complete' as const } : b,
        ),
      }))
    },

    onToolEnd(name: string, label: string, status: string, toolCallId?: string) {
      updateStream((s) => {
        const tools = s.tools.map((t) => {
          const match = toolCallId ? t.toolCallId === toolCallId : t.name === name && t.state === 'active'
          if (!match) return t
          return {
            ...t,
            label,
            state: (status === 'completed' ? 'complete' : 'failed') as ToolBlock['state'],
            endedAt: Date.now(),
            preview: undefined,
          }
        })
        const hasActive = tools.some((t) => t.state === 'active')
        const blocks = s.contentBlocks.map((b) => {
          if (b.type !== 'tool' || !b.tool) return b
          const t = b.tool
          const match = toolCallId ? t.toolCallId === toolCallId : t.name === name && t.state === 'active'
          if (!match) return b
          return {
            ...b,
            tool: {
              ...t,
              label,
              state: (status === 'completed' ? 'complete' : 'failed') as ToolBlock['state'],
              endedAt: Date.now(),
              preview: undefined,
            },
          }
        })
        return {
          tools,
          contentBlocks: blocks,
          phase: hasActive ? 'executing' : 'thinking',
          statusMessage: hasActive ? label : null,
        }
      })
    },

    onDone() {
      updateStream(() => ({ phase: 'complete', statusMessage: null }))
    },

    onError(message: string) {
      updateStream(() => ({ phase: 'complete', statusMessage: message }))
    },

    appendAssistantMessage() {
      const s = state.stream
      if (!s.content && s.contentBlocks.length === 0) return
      const msg: ChatMessage = {
        id: s.messageId || `msg-${Date.now()}`,
        conversation_id: state.conversationId || '',
        role: 'assistant',
        content: s.content || null,
        metadata: { content_blocks_ordered: s.contentBlocks },
        created_at: new Date().toISOString(),
      }
      setState({ messages: [...state.messages, msg] })
    },
  }
}

export function useScrollToBottom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = containerRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [containerRef])
  return scrollToBottom
}
