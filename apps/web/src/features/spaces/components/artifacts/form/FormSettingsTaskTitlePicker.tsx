import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import type { FormQuestion } from '@/lib/forms'
import { cn } from '@/lib/utils/cn'
import {
  AUTO_TASK_TITLE_LABEL,
  AUTO_TASK_TITLE_PEEK_BODY,
  AUTO_TASK_TITLE_PEEK_STEPS,
  AUTO_TASK_TITLE_PEEK_TITLE,
  AUTO_TASK_TITLE_SOURCE,
  buildTaskTitlePickerItems,
  taskTitleSourceLabel,
} from './form-task-title-source'
import { FieldRow } from './FormSettingsPanelPrimitives'

function TaskTitleAutoPeekPortal({
  peek,
  onPeekEnter,
  onPeekLeave,
}: {
  peek: { top: number; left: number } | null
  onPeekEnter: () => void
  onPeekLeave: () => void
}) {
  if (typeof document === 'undefined' || !peek) return null

  return createPortal(
    <div
      className="z-dropdown surface-card border-border rounded-spacing-2 body-4 text-foreground p-spacing-3 pointer-events-auto max-h-[min(320px,70vh)] w-[min(280px,calc(100vw-48px))] overflow-y-auto border shadow-xl"
      style={{
        position: 'fixed',
        left: peek.left,
        top: peek.top,
        transform: 'translateY(-50%)',
        scrollbarWidth: 'none',
      }}
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
    >
      <p className="body-3 text-foreground font-semibold">{AUTO_TASK_TITLE_PEEK_TITLE}</p>
      <p className="body-4 text-muted-foreground mt-spacing-2">{AUTO_TASK_TITLE_PEEK_BODY}</p>
      <div className="mt-spacing-2 pt-spacing-2 flex flex-col gap-spacing-1 border-t border-border">
        {AUTO_TASK_TITLE_PEEK_STEPS.map((step, index) => (
          <span
            key={step}
            className="badge-glass badge-glass-sm body-4 text-muted-foreground inline-flex w-fit"
          >
            {index + 1}. {step}
          </span>
        ))}
      </div>
    </div>,
    document.body,
  )
}

const TASK_TITLE_PEEK_GAP = 8
const TASK_TITLE_PEEK_CARD_W = 280

function computeTaskTitlePeekLeft(anchor: DOMRect): number {
  if (typeof window === 'undefined') return anchor.left - TASK_TITLE_PEEK_CARD_W
  const margin = 16
  const preferLeft = anchor.left - TASK_TITLE_PEEK_CARD_W - TASK_TITLE_PEEK_GAP
  if (preferLeft >= margin) return preferLeft
  const alternateRight = anchor.right + TASK_TITLE_PEEK_GAP
  if (alternateRight + TASK_TITLE_PEEK_CARD_W <= window.innerWidth - margin) return alternateRight
  return margin
}

export function FormSettingsTaskTitlePicker({
  questions,
  value,
  onChange,
}: {
  questions: FormQuestion[]
  value: string
  onChange: (next: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const resolvedValue = value === AUTO_TASK_TITLE_SOURCE || !value ? AUTO_TASK_TITLE_SOURCE : value
  const items = useMemo(() => buildTaskTitlePickerItems(questions), [questions])
  const selectedLabel = taskTitleSourceLabel(items, resolvedValue)

  const [expandedContactIds, setExpandedContactIds] = useState<Set<string>>(() => new Set())
  const [autoPeek, setAutoPeek] = useState<{ top: number; left: number } | null>(null)
  const autoPeekHideTimerRef = useRef<number | null>(null)

  const cancelAutoPeekHide = () => {
    if (autoPeekHideTimerRef.current !== null) {
      window.clearTimeout(autoPeekHideTimerRef.current)
      autoPeekHideTimerRef.current = null
    }
  }

  const scheduleAutoPeekHide = () => {
    cancelAutoPeekHide()
    autoPeekHideTimerRef.current = window.setTimeout(() => {
      setAutoPeek(null)
      autoPeekHideTimerRef.current = null
    }, 280)
  }

  const showAutoPeek = (event: MouseEvent<HTMLElement>) => {
    cancelAutoPeekHide()
    const rect = event.currentTarget.getBoundingClientRect()
    setAutoPeek({
      top: rect.top + rect.height / 2,
      left: computeTaskTitlePeekLeft(rect),
    })
  }

  useEffect(() => {
    return () => cancelAutoPeekHide()
  }, [])

  useEffect(() => {
    if (!open) setAutoPeek(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const activeContactGroup = items.find(
      (item) =>
        item.kind === 'contact_group' &&
        item.subfields.some((subfield) => subfield.value === resolvedValue),
    )
    if (activeContactGroup?.kind === 'contact_group') {
      setExpandedContactIds((current) => {
        if (current.has(activeContactGroup.questionId)) return current
        const next = new Set(current)
        next.add(activeContactGroup.questionId)
        return next
      })
    }
  }, [open, items, resolvedValue])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const toggleContactGroup = (questionId: string) => {
    setExpandedContactIds((current) => {
      const next = new Set(current)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  const pickOption = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <FieldRow label="Task title">
      <TaskTitleAutoPeekPortal
        peek={autoPeek}
        onPeekEnter={cancelAutoPeekHide}
        onPeekLeave={scheduleAutoPeekHide}
      />
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((next) => !next)}
          className="border-border bg-background text-foreground h-spacing-9 rounded-spacing-2 px-spacing-3 body-3 hover:bg-hover-subtle flex w-full items-center justify-between border outline-none transition-colors"
        >
          <span
            className={cn('min-w-0 truncate text-left', !selectedLabel && 'text-muted-foreground')}
            onMouseEnter={resolvedValue === AUTO_TASK_TITLE_SOURCE ? showAutoPeek : undefined}
            onMouseLeave={
              resolvedValue === AUTO_TASK_TITLE_SOURCE ? scheduleAutoPeekHide : undefined
            }
          >
            {selectedLabel ?? 'Choose task title source'}
          </span>
          <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
        </button>

        {open ? (
          <div
            className="dropdown-menu-solid z-dropdown mt-spacing-1 rounded-spacing-3 border-border absolute left-0 top-full flex max-h-80 w-full min-w-64 flex-col overflow-hidden border shadow-lg"
            onScroll={() => setAutoPeek(null)}
          >
            <div className="p-spacing-1 min-h-0 flex-1 overflow-y-auto">
              {items.map((item) => {
                if (item.kind === 'auto') {
                  const active = item.value === resolvedValue
                  return (
                    <div
                      key={item.value}
                      className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => pickOption(item.value)}
                        onMouseEnter={showAutoPeek}
                        onMouseLeave={scheduleAutoPeekHide}
                        className="min-w-0 flex-1 truncate text-left"
                      >
                        {AUTO_TASK_TITLE_LABEL}
                      </button>
                      {active ? <Check className="icon-sm text-primary shrink-0" /> : null}
                    </div>
                  )
                }

                if (item.kind === 'field') {
                  const active = item.value === resolvedValue
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => pickOption(item.value)}
                      className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center transition-colors"
                    >
                      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                      {active ? <Check className="icon-sm text-primary shrink-0" /> : null}
                    </button>
                  )
                }

                const expanded = expandedContactIds.has(item.questionId)
                const hasSelectedSubfield = item.subfields.some(
                  (subfield) => subfield.value === resolvedValue,
                )

                return (
                  <div key={item.questionId} className="rounded-spacing-2 overflow-hidden">
                    <div className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-1 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleContactGroup(item.questionId)}
                        className="gap-spacing-2 flex min-w-0 flex-1 items-center text-left"
                        aria-expanded={expanded}
                      >
                        {expanded ? (
                          <ChevronDown className="icon-xs shrink-0" />
                        ) : (
                          <ChevronRight className="icon-xs shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </button>
                      {hasSelectedSubfield ? (
                        <Check className="icon-sm text-primary shrink-0" />
                      ) : null}
                    </div>
                    {expanded ? (
                      <div className="pb-spacing-1 pl-spacing-6 pr-spacing-1">
                        {item.subfields.map((subfield) => {
                          const active = subfield.value === resolvedValue
                          return (
                            <button
                              key={subfield.value}
                              type="button"
                              onClick={() => pickOption(subfield.value)}
                              className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center transition-colors"
                            >
                              <span className="min-w-0 flex-1 truncate text-left">
                                {subfield.label}
                              </span>
                              {active ? <Check className="icon-sm text-primary shrink-0" /> : null}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </FieldRow>
  )
}
