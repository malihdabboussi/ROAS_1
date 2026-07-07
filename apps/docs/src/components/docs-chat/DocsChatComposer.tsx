'use client'

import { useCallback, useEffect, useRef } from 'react'

interface Props {
  disabled?: boolean
  onSend: (text: string) => void
  placeholder?: string
}

export function DocsChatComposer({ disabled, onSend, placeholder = 'Ask about the docs…' }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ta.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [resize])

  const submit = () => {
    const v = ta.current?.value.trim()
    if (!v || disabled) return
    ta.current!.value = ''
    resize()
    onSend(v)
  }

  return (
    <div
      className="flex items-end gap-2 rounded-xl px-3 py-2"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <textarea
        ref={ta}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        onInput={resize}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        className="max-h-[200px] min-h-10 w-full flex-1 resize-none bg-transparent text-[14px] outline-none"
        style={{ color: 'var(--foreground)' }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={submit}
        className="nav-item-active shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium"
      >
        Send
      </button>
    </div>
  )
}
