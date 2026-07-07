import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChatComposer } from '../../chat/ChatComposer'
import { MessageBubble } from '../../chat/MessageBubble'
import type { ChatMessage } from '../../chat/types'
import { chatStoreActions, useChatExtStore } from '../../chat/use-chat-store'
import { connectChatStream, sendExtensionMessage } from '../../shared/chrome-utils'
import { getAppOrigin } from '../../shared/config'
import type { BrainScopeOption, PageCapture } from '../../shared/types'
import type { ExtDropdownOption } from '../../ui/ExtDropdown'
import { ExtDropdown } from '../../ui/ExtDropdown'
import { Tooltip } from '../../ui/Tooltip'
import { VibeyOrbLoader } from '../../ui/VibeyOrbLoader'

type Conv = { id: string; title?: string | null }

const STORAGE_CONV = 'vibey_ext_conversation_id'

function buildPageSystemContext(capture: PageCapture | null): string {
  if (!capture) return ''
  const parts = [
    '--- Page context (Vibey extension) ---',
    `URL: ${capture.url}`,
    `Title: ${capture.title || capture.articleTitle || ''}`.trim(),
  ]
  if (capture.selectionText?.trim()) parts.push(`Selection:\n${capture.selectionText.trim()}`)
  if (capture.articleText?.trim()) {
    parts.push(`Article excerpt:\n${capture.articleText.trim().slice(0, 8000)}`)
  }
  return parts.filter(Boolean).join('\n')
}

type Props = {
  session: boolean
  capture: PageCapture | null
  scope: BrainScopeOption | undefined
}

export function ChatTab({ session, capture, scope }: Props) {
  const store = useChatExtStore()
  const actions = chatStoreActions()
  const [conversations, setConversations] = useState<Conv[]>([])
  const [includePage, setIncludePage] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const streamRef = useRef<ReturnType<typeof connectChatStream> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const campaignId = scope?.scopeType === 'campaign' ? (scope.campaignId ?? undefined) : undefined

  const loadConversations = useCallback(async () => {
    if (!session) return
    const res = await sendExtensionMessage<{ ok: boolean; conversations?: Conv[]; error?: string }>(
      {
        type: 'LIST_CONVERSATIONS',
      },
    )
    if (!res.ok) return
    const list = (res.conversations ?? []).map((c) => {
      const o = c as Record<string, unknown>
      return { id: String(o.id), title: (o.title as string) ?? null }
    })
    setConversations(list)
    const stored = await chrome.storage.local.get(STORAGE_CONV)
    const saved = typeof stored[STORAGE_CONV] === 'string' ? (stored[STORAGE_CONV] as string) : null
    const activeId = saved && list.some((x) => x.id === saved) ? saved : (list[0]?.id ?? null)
    if (activeId && activeId !== store.conversationId) {
      actions.setConversationId(activeId)
    }
  }, [session])

  const loadMessages = useCallback(async () => {
    if (!store.conversationId || !session) return
    actions.setLoading(true)
    const res = await sendExtensionMessage<{
      ok: boolean
      messages?: ChatMessage[]
      error?: string
    }>({
      type: 'FETCH_MESSAGES',
      conversation_id: store.conversationId,
      limit: 80,
    })
    actions.setLoading(false)
    if (res.ok) {
      actions.setMessages(res.messages ?? [])
    }
  }, [store.conversationId, session])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])
  useEffect(() => {
    void loadMessages()
  }, [loadMessages])
  useEffect(() => {
    return () => {
      streamRef.current?.disconnect()
    }
  }, [])


  const persistConv = (id: string) => {
    void chrome.storage.local.set({ [STORAGE_CONV]: id })
  }

  const newConversation = async () => {
    setErr(null)
    const res = await sendExtensionMessage<{
      ok: boolean
      conversation?: Record<string, unknown>
      error?: string
    }>({
      type: 'CREATE_CONVERSATION',
      title: 'Extension',
      ...(campaignId ? { campaign_id: campaignId } : {}),
    })
    if (!res.ok) {
      setErr(res.error ?? 'Create failed')
      return
    }
    const id = res.conversation?.id ? String(res.conversation.id) : null
    if (id) {
      actions.setConversationId(id)
      actions.setMessages([])
      persistConv(id)
      void loadConversations()
    }
  }

  const send = (text: string, model?: string) => {
    if (
      !store.conversationId ||
      (store.stream.phase !== 'idle' && store.stream.phase !== 'complete')
    )
      return
    setErr(null)
    streamRef.current?.disconnect()

    const ctx = includePage && capture ? buildPageSystemContext(capture) : ''
    const content = ctx ? `${ctx}\n\n${text}` : text

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      conversation_id: store.conversationId,
      role: 'user',
      content: text,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    actions.setMessages([...store.messages, userMsg])
    actions.resetStream(store.conversationId)

    const conn = connectChatStream({
      onEvent: (ev) => {
        const t = ev.type as string
        if (t === 'message_start' && typeof ev.message_id === 'string')
          actions.onMessageStart(ev.message_id)
        if (t === 'status')
          actions.onStatus(ev.phase as string, typeof ev.message === 'string' ? ev.message : null)
        if (t === 'content_delta' && typeof ev.content === 'string')
          actions.onContentDelta(ev.content)
        if (t === 'thinking_delta') {
          const text = typeof ev.text === 'string' ? ev.text : ''
          actions.onThinkingDelta(text)
        }
        if (t === 'tool_update')
          actions.onToolUpdate(
            (ev.name as string) ?? 'tool',
            typeof ev.detail === 'string' ? ev.detail : '',
            ev.tool_call_id as string | undefined,
          )
        if (t === 'tool_content_preview')
          actions.onToolContentPreview(
            (ev.name as string) ?? 'tool',
            typeof ev.content === 'string' ? ev.content : '',
            ev.tool_call_id as string | undefined,
          )
        if (t === 'generation_start' && typeof ev.label === 'string') actions.onGenerationStart(ev.label)
        if (t === 'generation_end') actions.onGenerationEnd()
        if (t === 'tool_start')
          actions.onToolStart(
            ev.name as string,
            ev.label as string,
            ev.action as string | undefined,
            ev.tool_call_id as string | undefined,
          )
        if (t === 'tool_end')
          actions.onToolEnd(
            ev.name as string,
            ev.label as string,
            (ev.status as string) ?? 'completed',
            ev.tool_call_id as string | undefined,
          )
        if (t === 'error' && typeof ev.message === 'string') {
          setErr(ev.message)
          actions.onError(ev.message)
        }
      },
      onDone: () => {
        actions.appendAssistantMessage()
        actions.resetStream(store.conversationId)
        void loadMessages()
      },
      onError: (m) => {
        setErr(m)
        actions.onError(m)
      },
    })
    streamRef.current = conn
    conn.start({
      conversation_id: store.conversationId,
      content,
      campaign_id: campaignId,
      ...(typeof model === 'string' && model.trim().length > 0 ? { model: model.trim() } : {}),
    })
  }

  const stop = () => {
    streamRef.current?.abort()
    actions.appendAssistantMessage()
    actions.resetStream(store.conversationId)
  }

  if (!session) return null

  const streaming = store.stream.phase !== 'idle' && store.stream.phase !== 'complete'
  const origin = getAppOrigin().replace(/\/$/, '')

  const turnData = useMemo(() => {
    const leadingMessages: ChatMessage[] = []
    const turns: { user: ChatMessage; responses: ChatMessage[] }[] = []
    let currentTurn: { user: ChatMessage; responses: ChatMessage[] } | null = null
    for (const m of store.messages) {
      if (m.role === 'user') {
        if (currentTurn) turns.push(currentTurn)
        currentTurn = { user: m, responses: [] }
      } else if (currentTurn) {
        currentTurn.responses.push(m)
      } else {
        leadingMessages.push(m)
      }
    }
    if (currentTurn) turns.push(currentTurn)
    return { leadingMessages, turns }
  }, [store.messages])

  const [spacerHeight, setSpacerHeight] = useState(0)
  const [lastUserPromptHeight, setLastUserPromptHeight] = useState(0)
  const lastUserPromptRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)
  const isProgrammaticScrollRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSpacerHeight(entry.contentRect.height)
    })
    ro.observe(el)
    setSpacerHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [store.conversationId])

  useEffect(() => {
    const el = lastUserPromptRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        const h = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
        setLastUserPromptHeight(h)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [turnData.turns.length])

  const lastAnchoredConvIdRef = useRef<string | null>(null)
  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || store.messages.length === 0) return
    const currentCount = store.messages.length
    const prevCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount
    const convChanged = lastAnchoredConvIdRef.current !== store.conversationId
    lastAnchoredConvIdRef.current = store.conversationId
    const newMessage = currentCount > prevCount && prevCount > 0
    if (!newMessage && !convChanged) return
    const latestUserMsg = [...store.messages].reverse().find((m) => m.role === 'user')
    if (!latestUserMsg) return
    setTimeout(() => {
      const el = scrollEl.querySelector(`[data-turn-id="${latestUserMsg.id}"]`)
      if (el instanceof HTMLElement) {
        isProgrammaticScrollRef.current = true
        const containerTop = scrollEl.getBoundingClientRect().top
        const elTop = el.getBoundingClientRect().top
        scrollEl.scrollTop += elTop - containerTop
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false
        })
      }
    }, 80)
  }, [store.messages.length, store.messages, store.conversationId])

  const chatOptions = useMemo((): ExtDropdownOption[] => {
    const rows: ExtDropdownOption[] =
      conversations.length === 0
        ? [{ value: '', label: '— Create one —' }]
        : conversations.map((c) => ({
            value: c.id,
            label: (c.title || 'Untitled chat').trim() || 'Untitled chat',
          }))
    const id = store.conversationId
    if (id && !rows.some((r) => r.value === id)) {
      rows.unshift({ value: id, label: `Chat ${id.slice(0, 8)}…` })
    }
    return rows
  }, [conversations, store.conversationId])

  const [rightSlot, setRightSlot] = useState<HTMLElement | null>(null)
  const [leftSlot, setLeftSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightSlot(document.getElementById('ext-chat-header-actions'))
    setLeftSlot(document.getElementById('ext-header-left-actions'))
  }, [])

  return (
    <div className="chat-shell">
      {leftSlot &&
        createPortal(
          <ExtDropdown
            value={store.conversationId ?? ''}
            options={chatOptions}
            onChange={(id) => {
              if (id) {
                actions.setConversationId(id)
                persistConv(id)
              }
            }}
            className="ext-header-dropdown"
          />,
          leftSlot,
        )}
      {rightSlot &&
        createPortal(
          <>
            <Tooltip label="New conversation">
              <button
                type="button"
                className="btn-icon-inline"
                aria-label="New conversation"
                onClick={() => void newConversation()}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Open in Studio">
              <button
                type="button"
                className="btn-icon-inline"
                aria-label="Open in Studio"
                onClick={() => chrome.tabs.create({ url: `${origin}/studio` })}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </Tooltip>
          </>,
          rightSlot,
        )}

      <div className="chat-messages" ref={scrollRef}>
        {store.loading && store.messages.length === 0 && (
          <VibeyOrbLoader text="Loading conversation…" />
        )}

        {turnData.leadingMessages.map((m) => (
          <div key={m.id} data-message-id={m.id}>
            <MessageBubble message={m} />
          </div>
        ))}

        {turnData.turns.map((turn, turnIdx) => {
          const isLastTurn = turnIdx === turnData.turns.length - 1
          return (
            <div
              key={turn.user.id}
              data-turn-id={turn.user.id}
              className={`chat-turn ${isLastTurn ? 'chat-turn-last' : ''}`}
            >
              <div
                ref={isLastTurn ? lastUserPromptRef : undefined}
                className="chat-turn-sticky"
              >
                <div className="surface-bg">
                  <MessageBubble message={turn.user} />
                </div>
                <div className="chat-sticky-fade" />
              </div>

              <div
                className="chat-turn-responses"
                style={
                  isLastTurn
                    ? { minHeight: Math.max(0, spacerHeight - lastUserPromptHeight) }
                    : undefined
                }
              >
                {turn.responses.map((m) => (
                  <div key={m.id} data-message-id={m.id}>
                    <MessageBubble message={m} />
                  </div>
                ))}
                {isLastTurn && streaming && (
                  <MessageBubble
                    message={{
                      id: store.stream.messageId || 'streaming',
                      conversation_id: store.conversationId || '',
                      role: 'assistant',
                      content: store.stream.content || null,
                      metadata: {},
                      created_at: new Date().toISOString(),
                    }}
                    isStreaming
                    streamBlocks={store.stream.contentBlocks}
                    streamTools={store.stream.tools}
                    streamStatusMessage={store.stream.statusMessage}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {err && (
        <p className="ext-err" style={{ padding: '0 var(--spacing-3)' }}>
          {err}
        </p>
      )}

      <div className="chat-composer">
        <ChatComposer
          conversationId={store.conversationId}
          defaultModel={null}
          campaignModelStrategy={
            scope?.scopeType === 'campaign' ? scope.campaignModelStrategy ?? null : null
          }
          onSend={send}
          onStop={stop}
          streaming={streaming}
          disabled={!store.conversationId}
          pageContext={includePage}
          onTogglePage={() => setIncludePage((v) => !v)}
          hasPage={!!capture}
        />
      </div>
    </div>
  )
}
