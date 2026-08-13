'use client'

import { useRef, useState } from 'react'
import { ArrowUp, Copy, RotateCcw } from 'lucide-react'
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
  const [resetCounts, setResetCounts] = useState(() => versions.map(() => 0))

  const active = versions[activeIndex]
  if (!active) return null
  const activeText = texts[activeIndex] ?? active.text
  const activeEdited = activeText !== active.text

  const updateActiveText = (next: string) => {
    setTexts((current) => current.map((t, i) => (i === activeIndex ? next : t)))
  }

  const resetActive = () => {
    updateActiveText(active.text)
    // Bump the remount key so the uncontrolled editable re-renders the original.
    setResetCounts((current) => current.map((c, i) => (i === activeIndex ? c + 1 : c)))
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
          key={`${activeIndex}:${resetCounts[activeIndex] ?? 0}`}
          initialText={activeText}
          onChange={updateActiveText}
          ariaLabel={`Draft: ${active.label}`}
        />
      </div>

      <div className="gap-spacing-1 px-spacing-3 pb-spacing-3 flex items-center justify-end">
        {activeEdited ? (
          <>
            <span className="typo-caption text-muted-foreground">Edited</span>
            <button
              type="button"
              onClick={resetActive}
              className="btn-icon-bare mr-spacing-2"
              aria-label={`Reset draft: ${active.label}`}
              title="Reset to original"
            >
              <RotateCcw className="icon-xs" aria-hidden />
            </button>
          </>
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
      onInput={(event) => onChange(readEditableText(event.currentTarget))}
      onPaste={(event) => {
        // Force plain text: without this, rich clipboard HTML lands in the DOM
        // while state (read as text) diverges from what the user sees.
        event.preventDefault()
        const text = event.clipboardData.getData('text/plain')
        if (!text) return
        const target = event.currentTarget
        // execCommand keeps the native undo stack and fires input (which syncs
        // state via onInput); jsdom lacks it, so fall back to Range insertion.
        if (
          typeof document.execCommand === 'function' &&
          document.execCommand('insertText', false, text)
        ) {
          return
        }
        insertPlainTextAtSelection(target, text)
        onChange(readEditableText(target))
      }}
      className="body-3 text-foreground cursor-text whitespace-pre-wrap outline-none"
    >
      {mountText.current}
    </p>
  )
}

/**
 * Reads the editable DOM back as plain text with real newlines. textContent
 * drops line structure: Enter inside contentEditable produces <div>/<br>
 * children whose text would silently concatenate into one run-on line.
 * Mirrors innerText semantics (block boundary or <br> → \n, one trailing
 * placeholder newline stripped) in a jsdom-compatible way.
 */
function readEditableText(root: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as HTMLElement
    if (element.tagName === 'BR') {
      out += '\n'
      return
    }
    if (BLOCK_TAGS.has(element.tagName) && out.length > 0 && !out.endsWith('\n')) {
      out += '\n'
    }
    element.childNodes.forEach(walk)
  }
  root.childNodes.forEach(walk)
  // Browsers keep one placeholder <br> at the end of editable content; like
  // innerText, that placeholder does not count as a newline.
  return out.endsWith('\n') ? out.slice(0, -1) : out
}

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE'])

/** Caret-preserving plain-text insert for environments without execCommand. */
function insertPlainTextAtSelection(root: HTMLElement, text: string) {
  const doc = root.ownerDocument
  const selection = doc.defaultView?.getSelection()
  const node = doc.createTextNode(text)
  if (selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    root.appendChild(node)
  }
}
