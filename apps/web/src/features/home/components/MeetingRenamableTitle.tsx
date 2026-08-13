'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'

/** Click-to-rename meeting title — saves on Enter or blur, cancels on Escape. */
export function MeetingRenamableTitle({
  title,
  onRename,
}: {
  title: string
  onRename: (next: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(title)
  }, [title, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = async () => {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === title.trim()) return
    await onRename(next)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void commit()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setDraft(title)
            setEditing(false)
          }
        }}
        className="title-h6 text-foreground border-border w-full rounded-sm border-b border-dashed bg-transparent focus:outline-none"
        aria-label="Meeting title"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/title gap-spacing-2 flex w-full min-w-0 items-center text-left"
      title="Rename meeting"
    >
      <h1 className="title-h6 text-foreground truncate">{title}</h1>
      <Pencil
        className="icon-xs text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100"
        aria-hidden
      />
    </button>
  )
}
