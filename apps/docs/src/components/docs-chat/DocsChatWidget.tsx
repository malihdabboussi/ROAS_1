'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { DocsChatComposer } from './DocsChatComposer'
import { DocsChatMessageBubble, type DocsChatTurn } from './DocsChatMessageBubble'
import { VibeyChatOrb } from './VibeyChatOrb'

async function consumeSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onText: (chunk: string) => void,
) {
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let sep: number
    while ((sep = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      for (const line of block.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        try {
          const j = JSON.parse(payload) as { text?: string }
          if (j.text) onText(j.text)
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }
}

export function DocsChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DocsChatTurn[]>([])
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<DocsChatTurn[]>([])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const scrollBottom = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  const send = useCallback(async (text: string) => {
    const prior = messagesRef.current
    setMessages((m) => [...m, { role: 'user', content: text }])
    setStreaming(true)
    setMessages((m) => [...m, { role: 'assistant', content: '' }])

    let acc = ''
    try {
      const res = await fetch('/api/docs-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history: prior,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        acc = `Error: ${res.status} ${errText.slice(0, 200)}`
        setMessages((m) => {
          const n = [...m]
          n[n.length - 1] = { role: 'assistant', content: acc }
          return n
        })
        return
      }

      const body = res.body
      if (!body) {
        acc = 'No response body'
        setMessages((m) => {
          const n = [...m]
          n[n.length - 1] = { role: 'assistant', content: acc }
          return n
        })
        return
      }

      await consumeSse(body.getReader(), (chunk) => {
        acc += chunk
        setMessages((m) => {
          const n = [...m]
          n[n.length - 1] = { role: 'assistant', content: acc }
          return n
        })
        requestAnimationFrame(scrollBottom)
      })
    } finally {
      setStreaming(false)
      requestAnimationFrame(scrollBottom)
    }
  }, [])

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Ask Vibey about the docs"
          onClick={() => setOpen(true)}
          className="docs-chat-fab fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full md:bottom-6 md:right-6"
        >
          <span className="scale-[1.35]">
            <VibeyChatOrb state="idle" />
          </span>
        </button>
      )}

      {open && (
        <div
          className="docs-chat-panel-shell fixed z-50 flex flex-col overflow-hidden rounded-xl max-md:inset-x-3 max-md:bottom-3 max-md:top-auto max-md:max-h-[90vh] md:bottom-6 md:right-6 md:h-[min(600px,80vh)] md:w-[400px]"
          role="dialog"
          aria-label="Docs chat"
        >
          <div
            className="flex shrink-0 items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>
              Ask Vibey
            </span>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-md p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-center text-[13px]">
                Ask anything about Vibey. Answers use the public docs index.
              </p>
            )}
            {messages.map((turn, i) => {
              const tailStreaming =
                streaming &&
                turn.role === 'assistant' &&
                i === messages.length - 1 &&
                !turn.content.trim()
              if (tailStreaming) {
                return (
                  <div
                    key={`${i}-thinking`}
                    className="text-muted-foreground flex items-center gap-2 text-[12px]"
                  >
                    <VibeyChatOrb state="processing" />
                    <span>Thinking…</span>
                  </div>
                )
              }
              return (
                <div key={`${i}-${turn.role}`}>
                  <DocsChatMessageBubble turn={turn} />
                </div>
              )
            })}
          </div>

          <div className="shrink-0 border-t p-3" style={{ borderColor: 'var(--border)' }}>
            <DocsChatComposer disabled={streaming} onSend={send} />
          </div>
        </div>
      )}
    </>
  )
}
