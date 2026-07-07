'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import type { FieldDef } from '@/features/spaces/types'
import type { FormQuestion, FormQuestionType } from '@/lib/forms/forms-api'
import { cn } from '@/lib/utils/cn'
import { buildBoundQuestion, fieldTypeForQuestion } from './form-field-binding'
import { FormFieldBindSubmenu } from './FormFieldBindSubmenu'
import { FORM_QUESTION_TYPES } from './FormQuestionTypePicker'

const SLASH_MENU_WIDTH_PX = 288
const FIELD_SUBMENU_WIDTH_PX = 320
const MENU_VIEWPORT_PADDING_PX = 12

const TYPE_KEYWORDS: Partial<Record<FormQuestionType, string[]>> = {
  short_text: ['text', 'short', 'input', 'string'],
  long_text: ['text', 'long', 'paragraph', 'textarea', 'note'],
  number: ['number', 'numeric', 'integer', 'amount'],
  dates: ['date', 'calendar', 'time', 'when'],
  single_select: [
    'select',
    'radio',
    'choice',
    'pick',
    'checkbox',
    'toggle',
    'boolean',
    'yes',
    'no',
  ],
  multi_select: ['select', 'multi', 'tags'],
  contact: ['contact', 'name', 'email', 'phone'],
  people: ['people', 'user', 'assignee', 'teammate'],
  uploads: ['upload', 'file', 'attachment', 'image'],
  info_block: ['info', 'block', 'note', 'header', 'static'],
}

interface FormSlashAddBlockProps {
  targetSpaceId?: string | null
  onPickQuestion: (question: FormQuestion) => void
  onOpenSettings?: () => void
  placeholder?: string
}

export function FormSlashAddBlock({
  targetSpaceId,
  onPickQuestion,
  onOpenSettings,
  placeholder = 'Type / to add a block',
}: FormSlashAddBlockProps) {
  const [value, setValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(null)
  const [submenuAnchorRect, setSubmenuAnchorRect] = useState<{
    top: number
    left: number
    right: number
    bottom: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selectedBtnRef = useRef<HTMLButtonElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  const isSlashing = value.startsWith('/')
  const query = isSlashing ? value.slice(1).toLowerCase().trim() : ''

  const flatItems = useMemo(() => {
    if (!isSlashing) return []
    const visibleItems = FORM_QUESTION_TYPES.filter((item) => item.type !== 'task_property')
    if (!query) return visibleItems
    return visibleItems.filter((item) => {
      if (item.label.toLowerCase().includes(query)) return true
      const keywords = TYPE_KEYWORDS[item.type] ?? []
      return keywords.some((k) => k.includes(query))
    })
  }, [isSlashing, query])
  const submenuBindingItem = flatItems[selectedIndex]

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, isSlashing])

  useEffect(() => {
    if (!isSlashing) setMenuOpen(false)
    else setMenuOpen(true)
  }, [isSlashing])

  useEffect(() => {
    selectedBtnRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const reset = useCallback(() => {
    setValue('')
    setMenuOpen(false)
    setSubmenuPos(null)
    setSubmenuAnchorRect(null)
    setSelectedIndex(0)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (inputRef.current?.contains(target)) return
      if (target.closest('[data-form-slash-popover]')) return
      reset()
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true)
  }, [menuOpen, reset])

  useLayoutEffect(() => {
    if (!menuOpen) {
      setPos(null)
      return
    }
    const place = () => {
      const el = inputRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const menuEl = menuRef.current
      const menuH = menuEl?.offsetHeight ?? 320
      const menuW = menuEl?.offsetWidth ?? SLASH_MENU_WIDTH_PX
      const viewH = window.innerHeight
      const viewW = window.innerWidth
      let top = rect.bottom + 4
      let left = rect.left
      if (top + menuH > viewH - MENU_VIEWPORT_PADDING_PX) top = rect.top - menuH - 4
      if (left + menuW > viewW - MENU_VIEWPORT_PADDING_PX) {
        left = viewW - menuW - MENU_VIEWPORT_PADDING_PX
      }
      if (left < MENU_VIEWPORT_PADDING_PX) left = MENU_VIEWPORT_PADDING_PX
      setPos({ top, left })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [menuOpen, flatItems])

  const pickItem = useCallback(
    (type: FormQuestionType, field: FieldDef | null) => {
      onPickQuestion(buildBoundQuestion(type, field))
      reset()
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [onPickQuestion, reset],
  )

  const captureSubmenuAnchor = useCallback((rect: DOMRect) => {
    setSubmenuAnchorRect({
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    })
  }, [])

  useLayoutEffect(() => {
    if (!submenuAnchorRect) {
      setSubmenuPos(null)
      return
    }
    const place = () => {
      const popover = submenuRef.current
      const popW = popover?.offsetWidth ?? FIELD_SUBMENU_WIDTH_PX
      const popH = popover?.offsetHeight ?? 0
      const viewH = window.innerHeight
      const viewW = window.innerWidth

      let left = submenuAnchorRect.right + 4
      if (left + popW > viewW - MENU_VIEWPORT_PADDING_PX) {
        left = submenuAnchorRect.left - popW - 4
      }
      if (left < MENU_VIEWPORT_PADDING_PX) left = MENU_VIEWPORT_PADDING_PX

      let top = submenuAnchorRect.top
      if (popH > 0 && top + popH > viewH - MENU_VIEWPORT_PADDING_PX) {
        top = Math.max(MENU_VIEWPORT_PADDING_PX, viewH - popH - MENU_VIEWPORT_PADDING_PX)
      }
      setSubmenuPos({ top, left })
    }
    place()
    const handle = () => place()
    window.addEventListener('resize', handle)
    window.addEventListener('scroll', handle, true)
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('scroll', handle, true)
    }
  }, [submenuAnchorRect, selectedIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!menuOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        reset()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (flatItems.length === 0 ? 0 : (i + 1) % flatItems.length))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) =>
          flatItems.length === 0 ? 0 : (i - 1 + flatItems.length) % flatItems.length,
        )
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[selectedIndex]
        if (item?.type === 'info_block') pickItem(item.type, null)
      }
    },
    [menuOpen, flatItems, pickItem, selectedIndex, reset],
  )

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="body-3 text-foreground placeholder:text-muted-foreground/70 w-full bg-transparent outline-none"
      />

      {menuOpen && pos
        ? createPortal(
            <div
              ref={menuRef}
              data-form-slash-popover
              className="border-border bg-card fixed z-[100] max-h-[min(420px,60vh)] w-72 overflow-y-auto rounded-xl border shadow-xl"
              style={{ top: pos.top, left: pos.left }}
            >
              {flatItems.length === 0 ? (
                <div className="p-3">
                  <p className="text-muted-foreground text-xs">No matching block</p>
                </div>
              ) : (
                <>
                  <div className="space-y-0.5 p-2">
                    {flatItems.map((item, idx) => {
                      const isSelected = idx === selectedIndex
                      const Icon = item.icon
                      const bindsField = Boolean(fieldTypeForQuestion(item.type))
                      return (
                        <button
                          key={item.type}
                          ref={isSelected ? selectedBtnRef : undefined}
                          type="button"
                          onClick={(event) => {
                            if (item.type === 'info_block') {
                              pickItem(item.type, null)
                              return
                            }
                            const rect = event.currentTarget.getBoundingClientRect()
                            setSelectedIndex(idx)
                            captureSubmenuAnchor(rect)
                          }}
                          onMouseEnter={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect()
                            setSelectedIndex(idx)
                            captureSubmenuAnchor(rect)
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors',
                            isSelected
                              ? 'bg-[var(--color-hover-subtle)]'
                              : 'hover:bg-[var(--color-hover-subtle)]',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                          <span className="body-3 min-w-0 flex-1 truncate text-[var(--foreground)]">
                            {item.label}
                          </span>
                          {bindsField ? (
                            <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                  {query ? (
                    <div className="border-border border-t px-3 py-1.5">
                      <span className="text-muted-foreground text-[11px]">/{query}</span>
                    </div>
                  ) : null}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
      {menuOpen &&
      submenuAnchorRect &&
      submenuBindingItem &&
      submenuBindingItem.type !== 'info_block'
        ? createPortal(
            <div
              ref={submenuRef}
              data-form-slash-popover
              className="fixed z-[101]"
              style={{
                top: submenuPos?.top ?? 0,
                left: submenuPos?.left ?? 0,
                visibility: submenuPos ? 'visible' : 'hidden',
              }}
            >
              <FormFieldBindSubmenu
                questionType={submenuBindingItem.type}
                targetSpaceId={targetSpaceId}
                onPickField={(field) => pickItem(submenuBindingItem.type, field)}
                onOpenSettings={onOpenSettings}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
