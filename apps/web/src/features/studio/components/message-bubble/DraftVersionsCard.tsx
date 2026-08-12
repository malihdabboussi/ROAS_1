'use client'

import { useState } from 'react'
import { ArrowUp, Check, Copy, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { DRAFT_CARD_USE_EVENT, type DraftCardUseDetail, type DraftVersion } from './draft-versions.utils'

const VERSION_LETTERS = 'ABCDEFGH'

/**
 * Send-ready copy composed by the agent, shown as a card with version tabs
 * (like Claude's message editor): pick a version, copy it, click anywhere in
 * the text to edit in place (save/discard/reset controls appear), or send it
 * to the composer with the arrow.
 */
export function DraftVersionsCard({ versions }: { versions: DraftVersion[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [texts, setTexts] = useState(() => versions.map((v) => v.text))
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const active = versions[activeIndex]
  if (!active) return null
  const activeText = texts[activeIndex] ?? active.text
  const activeEdited = activeText !== active.text

  const switchTo = (index: number) => {
    if (editing) return
    setActiveIndex(index)
  }

  const startEdit = () => {
    setEditValue(activeText)
    setEditing(true)
  }

  const saveEdit = () => {
    setTexts((current) => current.map((t, i) => (i === activeIndex ? editValue : t)))
    setEditing(false)
  }

  const resetEdit = () => {
    setTexts((current) => current.map((t, i) => (i === activeIndex ? active.text : t)))
    setEditing(false)
  }

  const copyActive = async () => {
    try {
      await navigator.clipboard.writeText(editing ? editValue : activeText)
      toast.success('Draft copied')
    } catch {
      toast.error('Could not copy the draft')
    }
  }

  const useInComposer = () => {
    const text = editing ? editValue : activeText
    window.dispatchEvent(
      new CustomEvent<DraftCardUseDetail>(DRAFT_CARD_USE_EVENT, { detail: { text } }),
    )
    toast.success('Draft added to the composer')
  }

  return (
    <div className="border-border rounded-spacing-3 bg-background my-spacing-3 flex flex-col overflow-hidden border">
      {versions.length > 1 ? (
        <div className="border-border gap-spacing-1 px-spacing-2 py-spacing-2 flex items-center border-b">
          {versions.map((version, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={`${version.label}-${index}`}
                type="button"
                onClick={() => switchTo(index)}
                disabled={editing && !isActive}
                className={`gap-spacing-2 px-spacing-3 py-spacing-1 inline-flex items-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-hover-subtle text-foreground'
                    : 'text-muted-foreground hover:text-foreground disabled:opacity-40'
                }`}
              >
                <span
                  className={`border-border typo-caption inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    isActive ? 'bg-foreground text-background border-transparent' : ''
                  }`}
                >
                  {VERSION_LETTERS[index] ?? index + 1}
                </span>
                <span className="body-4 font-medium">{version.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="p-spacing-4">
        {editing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={Math.min(18, Math.max(6, editValue.split('\n').length + 1))}
            autoFocus
            className="body-3 text-foreground bg-transparent w-full resize-y outline-none"
            aria-label={`Edit draft: ${active.label}`}
          />
        ) : (
          // Click anywhere in the text to edit — no pencil hunt.
          <p
            onClick={startEdit}
            title="Click to edit"
            className="body-3 text-foreground hover:bg-hover-subtle rounded-spacing-2 -m-spacing-2 p-spacing-2 cursor-text whitespace-pre-wrap transition-colors"
          >
            {activeText}
          </p>
        )}
      </div>

      <div className="gap-spacing-1 px-spacing-3 pb-spacing-3 flex items-center justify-end">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="button-compact button-glass-neutral gap-spacing-1 inline-flex items-center"
            >
              <X className="icon-xs" aria-hidden /> Cancel
            </button>
            <button
              type="button"
              onClick={resetEdit}
              className="button-compact button-glass-neutral gap-spacing-1 inline-flex items-center"
              title="Discard edits and restore the original draft"
            >
              <RotateCcw className="icon-xs" aria-hidden /> Reset
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="button-compact button-glass-primary gap-spacing-1 inline-flex items-center"
            >
              <Check className="icon-xs" aria-hidden /> Save
            </button>
          </>
        ) : (
          <>
            {activeEdited ? (
              <span className="typo-caption text-muted-foreground mr-spacing-2">Edited</span>
            ) : null}
            <button
              type="button"
              onClick={() => void copyActive()}
              className="btn-icon-bare"
              aria-label={`Copy draft: ${active.label}`}
              title="Copy"
            >
              <Copy className="icon-xs" aria-hidden />
            </button>
            <button
              type="button"
              onClick={useInComposer}
              className="btn-icon-bare"
              aria-label={`Use draft in composer: ${active.label}`}
              title="Use in composer"
            >
              <ArrowUp className="icon-xs" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
