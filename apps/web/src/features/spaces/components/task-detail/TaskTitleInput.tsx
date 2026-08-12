'use client'

import { useRef } from 'react'
import { flushSync } from 'react-dom'

interface TaskTitleInputProps {
  title: string
  /** Last saved title; used to restore on Escape while editing. */
  committedTitle: string
  onTitleChange: (value: string) => void
  onTitleBlur: () => void
}

/**
 * Editable task title `input`. Lives inside the left column of the task modal
 * (under the full-width breadcrumb bar) so the right-side Activity panel can
 * be the full height of the modal body.
 */
export function TaskTitleInput({
  title,
  committedTitle,
  onTitleChange,
  onTitleBlur,
}: TaskTitleInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <input
      ref={inputRef}
      type="text"
      value={title}
      onChange={(e) => onTitleChange(e.target.value)}
      onBlur={onTitleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          e.preventDefault()
          flushSync(() => {
            onTitleChange(committedTitle)
          })
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      className="title-h2 w-full cursor-text rounded-md border-0 border-transparent bg-transparent px-2 py-1 text-left text-[var(--color-foreground)] outline-none ring-0 transition-colors placeholder:text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] focus:ring-0 focus-visible:bg-[var(--color-hover-subtle)]"
      // Task titles are user content — never uppercase them (title-h1 forces caps
      // in unlayered CSS, which beats the normal-case utility).
      style={{ textTransform: 'none' }}
      placeholder="Untitled task"
      spellCheck
      aria-label="Task title"
    />
  )
}
