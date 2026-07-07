'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type InlineEditableArtifactTitleProps = {
  value: string
  placeholder: string
  onCommit: (next: string) => void | Promise<void>
  className?: string
}

/** Click title to edit; blur or Enter saves; Escape cancels (funnel / media preview pattern). */
export function InlineEditableArtifactTitle({
  value,
  placeholder,
  onCommit,
  className = '',
}: InlineEditableArtifactTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commit = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(value)
      setEditing(false)
      return
    }
    if (trimmed === value.trim()) {
      setEditing(false)
      return
    }
    await onCommit(trimmed)
    setEditing(false)
  }, [draft, value, onCommit])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setDraft(value)
            setEditing(false)
          }
        }}
        className={`body-3 px-spacing-2 py-spacing-1 w-full min-w-0 rounded-spacing-1 border border-border bg-background font-medium text-foreground outline-none ${className}`.trim()}
        aria-label={placeholder}
      />
    )
  }

  const display = value.trim() || placeholder

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`body-3 hover:bg-hover-subtle px-spacing-1 p-spacing-0-5 w-full min-w-0 truncate rounded-spacing-1 text-left font-medium text-foreground ${className}`.trim()}
    >
      {display}
    </button>
  )
}
