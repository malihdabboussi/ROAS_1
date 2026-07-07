'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import type { AdEditingChangeHandler, AdFieldChangeHandler } from './ad-preview.types'

export function EditableAdText({
  value,
  field,
  onFieldChange,
  multiline = false,
  className = '',
  darkBg: _darkBg = false,
  autoFocus = false,
  onEditEnd,
  onEditingChange,
}: {
  value: string
  field: string
  onFieldChange?: AdFieldChangeHandler
  multiline?: boolean
  className?: string
  darkBg?: boolean
  autoFocus?: boolean
  onEditEnd?: () => void
  onEditingChange?: AdEditingChangeHandler
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(autoFocus)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (ref.current) {
      ref.current.innerText = value
      if (autoFocus) {
        ref.current.focus()
        const sel = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(ref.current)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }, [])

  useEffect(() => {
    if (!active && ref.current) ref.current.innerText = value
  }, [value, active])

  const commit = useCallback(() => {
    const text = ref.current?.innerText?.trim() ?? ''
    setActive(false)
    onEditEnd?.()
    onEditingChange?.(false)
    if (text && text !== valueRef.current && onFieldChange) onFieldChange(field, text)
  }, [field, onFieldChange, onEditEnd, onEditingChange])

  const activate = useCallback(() => {
    if (active || !onFieldChange) return
    setActive(true)
    onEditingChange?.(true)
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    })
  }, [active, onFieldChange, onEditingChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (ref.current) ref.current.innerText = valueRef.current
        setActive(false)
        onEditEnd?.()
        onEditingChange?.(false)
      }
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault()
        ref.current?.blur()
      }
    },
    [multiline, onEditEnd, onEditingChange],
  )

  const resolvedClassName = active ? className.replace(/line-clamp-\d+/g, '') : className

  return (
    <div className={`group/edit relative ${onFieldChange && !active ? 'cursor-text' : ''}`}>
      {onFieldChange && !active && (
        <div className="pointer-events-none absolute -right-1 -top-1 z-10 rounded-full bg-amber-500/80 p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover/edit:opacity-100">
          <Pencil className="h-2.5 w-2.5" />
        </div>
      )}
      <div
        ref={ref}
        className={`${resolvedClassName} rounded-sm outline-none transition-all ${
          active
            ? 'max-h-[120px] overflow-y-auto whitespace-pre-wrap ring-1 ring-amber-400/60'
            : onFieldChange
              ? 'ring-1 ring-transparent group-hover/edit:ring-amber-400/40'
              : ''
        }`}
        contentEditable={active}
        suppressContentEditableWarning
        onClick={!active ? activate : undefined}
        onBlur={active ? commit : undefined}
        onKeyDown={active ? handleKeyDown : undefined}
      />
    </div>
  )
}
