'use client'

import { useRef, useState } from 'react'
import { ArrowUp, Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
  DRAFT_CARD_USE_EVENT,
  type DraftCardUseDetail,
  type DraftVersion,
} from './draft-versions.utils'

const VERSION_LETTERS = 'ABCDEFGH'

/**
 * Send-ready copy composed by the agent, shown as a card with version tabs
 * (like Claude's message editor): pick a version, edit it live in place —
 * no edit mode, no save button, keystrokes persist as you type — then copy
 * it or send it to the composer with the arrow.
 */
export function DraftVersionsCard({ versions }: { versions: DraftVersion[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [texts, setTexts] = useState(() => versions.map((v) => v.text))

  const active = versions[activeIndex]
  if (!active) return null
  const activeText = texts[activeIndex] ?? active.text
  const activeEdited = activeText !== active.text

  const updateActiveText = (next: string) => {
    setTexts((current) => current.map((t, i) => (i === activeIndex ? next : t)))
  }

  const copyActive = async () => {
    try {
      await navigator.clipboard.writeText(activeText)
      toast.success('Draft copied')
    } catch {
      toast.error('Could not copy the draft')
    }
  }

  const useInComposer = () => {
    window.dispatchEvent(
      new CustomEvent<DraftCardUseDetail>(DRAFT_CARD_USE_EVENT, {
        detail: { text: activeText },
      }),
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
                onClick={() => setActiveIndex(index)}
                className={`gap-spacing-2 px-spacing-3 py-spacing-1 inline-flex items-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-hover-subtle text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
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
        <LiveEditableText
          key={activeIndex}
          initialText={activeText}
          onChange={updateActiveText}
          ariaLabel={`Draft: ${active.label}`}
        />
      </div>

      <div className="gap-spacing-1 px-spacing-3 pb-spacing-3 flex items-center justify-end">
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
      </div>
    </div>
  )
}

/**
 * Plain-text contentEditable that edits truly in place. Uncontrolled after
 * mount: the DOM owns the text (so the caret never jumps) and edits stream up
 * through onChange. Remount (via key) to show a different version.
 */
function LiveEditableText({
  initialText,
  onChange,
  ariaLabel,
}: {
  initialText: string
  onChange: (next: string) => void
  ariaLabel: string
}) {
  const mountText = useRef(initialText)
  return (
    <p
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      spellCheck={false}
      onInput={(event) => onChange(event.currentTarget.textContent ?? '')}
      className="body-3 text-foreground cursor-text whitespace-pre-wrap outline-none"
    >
      {mountText.current}
    </p>
  )
}
