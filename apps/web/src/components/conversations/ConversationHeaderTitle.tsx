'use client'

import { useEffect, useRef, useState } from 'react'

interface ConversationHeaderTitleProps {
  title: string
  onRename: (title: string) => void | Promise<void>
  renameRequestNonce?: number
}

export function ConversationHeaderTitle({
  title,
  onRename,
  renameRequestNonce = 0,
}: ConversationHeaderTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const handledRenameRequestNonce = useRef(renameRequestNonce)

  useEffect(() => {
    if (!editing) setDraft(title)
  }, [editing, title])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  useEffect(() => {
    if (renameRequestNonce === handledRenameRequestNonce.current) return
    handledRenameRequestNonce.current = renameRequestNonce
    setEditing(true)
  }, [renameRequestNonce])

  const commitRename = async () => {
    if (saving) return
    const nextTitle = draft.trim()
    if (!nextTitle || nextTitle === title) {
      setDraft(title)
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onRename(nextTitle)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commitRename()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void commitRename()
          if (event.key === 'Escape') {
            setDraft(title)
            setEditing(false)
          }
        }}
        disabled={saving}
        aria-label="Conversation name"
        className="input-glass body-3 text-foreground h-spacing-8 max-w-spacing-72 min-w-0 flex-1 font-medium"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Rename conversation"
      title="Rename conversation"
      className="text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 body-3 flex min-w-0 flex-1 items-center text-left font-medium transition-colors"
    >
      <span className="min-w-0 flex-1 truncate">{title}</span>
    </button>
  )
}
