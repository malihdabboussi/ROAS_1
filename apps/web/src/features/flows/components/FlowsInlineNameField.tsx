'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

export function FlowsInlineNameField({
  value,
  onCommit,
  disabled,
  className,
  inputClassName,
  maxWidthClass = 'max-w-[200px]',
}: {
  value: string
  onCommit: (name: string) => void | Promise<void>
  disabled?: boolean
  className?: string
  inputClassName?: string
  maxWidthClass?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [editing, value])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commit = async () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(value)
      setEditing(false)
      return
    }
    if (trimmed !== value) {
      await onCommit(trimmed)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
          if (event.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        disabled={disabled}
        className={cn(
          'input-glass h-spacing-8 min-w-0 text-sm font-medium',
          maxWidthClass,
          inputClassName,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
      disabled={disabled}
      className={cn(
        'min-w-0 truncate text-left font-medium text-[var(--foreground)] transition-colors hover:text-[var(--foreground)]',
        maxWidthClass,
        className,
      )}
    >
      {value}
    </button>
  )
}
