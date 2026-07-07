'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { RecurrenceSpec } from '../../../types'
import type { FieldDef } from '../../../types/space-schema'
import {
  DEFAULT_CLONE_INCLUDE,
  forSave,
  isCreateNewTask,
  isUpdateSameItem,
  normalizeRecurrenceForEditor,
} from '../../../utils/recurrence-flags'
import { OptionDot } from '../../OptionBadge'
import { SelectCell } from '../SelectCell'
import { RecurrenceCloneOptionsModal } from './RecurrenceCloneOptionsModal'

function defaultResetStatusId(statusField: FieldDef | undefined): string {
  const opts = statusField?.options ?? []
  if (opts.length === 0) return 'todo'
  const fromNs = opts.find((o) => (o.group ?? 'active') === 'not_started')
  return (fromNs ?? opts[0])!.id
}

interface SelectOption {
  value: string
  label: string
}

interface RecurrenceSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
}

const VIEWPORT_PAD = 8

function RecurrenceSelect({ value, options, onChange, className }: RecurrenceSelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  const reposition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const inner = menuRef.current?.querySelector<HTMLElement>('[data-recurrence-select-inner]')
    const measured =
      inner && inner.scrollHeight > 0 ? inner.scrollHeight : options.length * 44 + VIEWPORT_PAD * 2
    const vh = window.innerHeight
    const maxNatural = Math.min(measured, vh - VIEWPORT_PAD * 2)
    const spaceBelow = vh - rect.bottom - VIEWPORT_PAD
    const spaceAbove = rect.top - VIEWPORT_PAD

    let placeAbove: boolean
    if (maxNatural <= spaceBelow) placeAbove = false
    else if (maxNatural <= spaceAbove) placeAbove = true
    else placeAbove = spaceAbove >= spaceBelow

    const slot = placeAbove ? spaceAbove : spaceBelow
    const maxHeight = Math.max(80, Math.min(maxNatural, slot - 4))
    const blockH = Math.min(maxNatural, maxHeight)
    let top = placeAbove ? rect.top - blockH - 2 : rect.bottom + 2
    top = Math.max(VIEWPORT_PAD, Math.min(top, vh - VIEWPORT_PAD - blockH))

    setPos({
      top,
      left: rect.left,
      width: Math.max(rect.width, 140),
      maxHeight,
    })
  }, [options.length])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    reposition()
    const id = requestAnimationFrame(() => reposition())
    return () => cancelAnimationFrame(id)
  }, [open, reposition, options.length])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'surface-bg border-border text-foreground rounded-spacing-2 px-spacing-2 flex w-full items-center justify-between border text-left transition-colors',
          className,
        )}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100001] flex flex-col overflow-hidden"
            data-recurrence-select
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? 0,
              width: pos?.width ?? 160,
              maxHeight: pos?.maxHeight ?? 400,
              visibility: pos ? 'visible' : 'hidden',
              pointerEvents: pos ? 'auto' : 'none',
            }}
          >
            <div
              data-recurrence-select-inner
              className="dropdown-menu-solid p-spacing-1 min-h-0 flex-1 overflow-y-auto"
            >
              {options.map((opt) => {
                const selected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'body-3 gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 flex w-full items-center text-left transition-colors',
                      selected
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                    )}
                  >
                    {selected ? (
                      <Check className="icon-sm text-primary shrink-0" />
                    ) : (
                      <div className="icon-sm shrink-0" />
                    )}
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

interface Props {
  initialValue: RecurrenceSpec
  onCancel: () => void
  onSave: (value: RecurrenceSpec) => void
  /** Narrow left column in date dropdown: scrolls with Save/Cancel inside. */
  variant?: 'default' | 'embedded'
  /** When set, "Update status" uses the same grouped status dropdown as the list (colors, categories). */
  statusField?: FieldDef
  onEditStatuses?: () => void
  onDraftChange?: (draft: RecurrenceSpec) => void
}

export function RecurrencePanel({
  initialValue,
  onCancel,
  onSave,
  variant = 'default',
  statusField,
  onEditStatuses,
  onDraftChange,
}: Props) {
  const defStatus = defaultResetStatusId(statusField)
  const optionsAnchorRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<RecurrenceSpec>(() =>
    normalizeRecurrenceForEditor(initialValue, defStatus),
  )
  const [cloneOptionsOpen, setCloneOptionsOpen] = useState(false)
  const embedded = variant === 'embedded'

  useEffect(() => {
    onDraftChange?.(draft)
  }, [draft, onDraftChange])

  const canSave = useMemo(() => {
    if (draft.trigger === 'status_change' && !draft.trigger_status) return false
    if (!isCreateNewTask(draft) && !isUpdateSameItem(draft)) return false
    if (isUpdateSameItem(draft) && !draft.reset_status) return false
    if (draft.end.type === 'count' && draft.end.count < 1) return false
    if (draft.frequency === 'days_after' && (!draft.days_after_count || draft.days_after_count < 1))
      return false
    if (draft.frequency === 'custom' && !draft.custom_unit) return false
    return true
  }, [draft])

  const fieldH = embedded ? 'h-spacing-8' : 'h-spacing-10'
  const fieldText = embedded ? 'body-3' : 'body-2'
  const tx = embedded ? 'body-3' : 'body-2'
  const titleCls = embedded ? 'body-3 text-foreground font-semibold' : 'title-h6 text-foreground'
  const gap = embedded ? 'space-y-spacing-1-5' : 'space-y-spacing-2'
  const mt = embedded ? 'mt-spacing-2' : 'mt-spacing-3'
  const fieldStackGap = embedded ? 'gap-spacing-1-5' : 'gap-spacing-2'
  const labelCls = cn(
    'text-foreground gap-spacing-1-5 flex items-center',
    embedded ? 'body-3' : 'body-2',
  )
  const inputSpinners =
    '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
  const numInputCls = cn(
    'input-glass border-border surface-bg text-foreground rounded-spacing-2 border px-spacing-1-5',
    fieldH,
    tx,
    inputSpinners,
  )

  const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const triggerOptions = useMemo(() => {
    const opts: SelectOption[] = [
      { value: 'status_change:done', label: 'On status change: Complete' },
      { value: 'status_change:in_review', label: 'On status change: Done' },
    ]
    if (draft.frequency !== 'days_after') {
      opts.push({ value: 'due_date:', label: 'On a schedule' })
    }
    return opts
  }, [draft.frequency])

  const triggerComboValue =
    draft.trigger === 'status_change'
      ? `status_change:${draft.trigger_status ?? 'done'}`
      : 'due_date:'

  function handleTriggerComboChange(v: string) {
    const [trigger, status] = v.split(':') as [string, string]
    if (trigger === 'status_change') {
      setDraft((prev) => ({
        ...prev,
        trigger: 'status_change' as const,
        trigger_status: (status || 'done') as RecurrenceSpec['trigger_status'],
      }))
    } else {
      setDraft((prev) => ({
        ...prev,
        trigger: 'due_date' as const,
        trigger_status: undefined,
      }))
    }
  }

  function handleFrequencyChange(v: string) {
    const freq = v as RecurrenceSpec['frequency']
    setDraft((prev) => {
      const next = { ...prev, frequency: freq }
      if (freq === 'days_after') {
        next.days_after_count = prev.days_after_count ?? 1
        if (next.trigger === 'due_date') {
          next.trigger = 'status_change'
          next.trigger_status = 'done'
        }
      }
      if (freq === 'custom') {
        next.custom_unit = prev.custom_unit ?? 'week'
      }
      if (freq === 'monthly') {
        next.monthly_anchor = prev.monthly_anchor ?? 'same_day'
      }
      return next
    })
  }

  const showWeekdayPicker = draft.frequency === 'custom' && draft.custom_unit === 'week'

  const form = (
    <>
      <div className={titleCls}>Recurring</div>

      <div className={cn(gap, mt)}>
        {/* 1. Frequency */}
        <RecurrenceSelect
          value={draft.frequency}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
            { value: 'days_after', label: 'Days after...' },
            { value: 'custom', label: 'Custom...' },
          ]}
          onChange={handleFrequencyChange}
          className={cn(fieldText, fieldH)}
        />

        {/* 2. Days after: N day after completion */}
        {draft.frequency === 'days_after' && (
          <div className="gap-spacing-1-5 flex items-center">
            <input
              type="number"
              min={1}
              value={draft.days_after_count ?? 1}
              onChange={(e) => {
                const value = Number(e.target.value)
                setDraft((prev) => ({
                  ...prev,
                  days_after_count: Number.isFinite(value) && value > 0 ? Math.floor(value) : 1,
                }))
              }}
              className={cn(numInputCls, 'w-14')}
            />
            <span className={cn('text-muted-foreground', tx)}>day after completion</span>
          </div>
        )}

        {/* 3. Custom: Every N unit + weekday picker */}
        {draft.frequency === 'custom' && (
          <>
            <div className="gap-spacing-1-5 flex items-center">
              <span className={cn('text-muted-foreground shrink-0', tx)}>Every</span>
              <input
                type="number"
                min={1}
                value={draft.interval}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setDraft((prev) => ({
                    ...prev,
                    interval: Number.isFinite(value) && value > 0 ? Math.floor(value) : 1,
                  }))
                }}
                className={cn(numInputCls, 'w-14')}
              />
              <RecurrenceSelect
                value={draft.custom_unit ?? 'week'}
                options={[
                  { value: 'day', label: 'day' },
                  { value: 'week', label: 'week' },
                  { value: 'month', label: 'month' },
                  { value: 'year', label: 'year' },
                ]}
                onChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    custom_unit: v as RecurrenceSpec['custom_unit'],
                  }))
                }
                className={cn(fieldText, fieldH, 'min-w-0 flex-1')}
              />
            </div>

            {showWeekdayPicker && (
              <div className="flex gap-0.5">
                {WEEKDAY_LABELS.map((label, idx) => {
                  const selected = draft.weekdays?.includes(idx) ?? false
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDraft((prev) => {
                          const current = prev.weekdays ?? []
                          const next = selected
                            ? current.filter((d) => d !== idx)
                            : [...current, idx]
                          return { ...prev, weekdays: next.length > 0 ? next : undefined }
                        })
                      }}
                      className={cn(
                        'rounded-spacing-1 border px-1.5 py-1 text-center transition-colors',
                        embedded ? 'body-4 flex-1' : 'body-3 min-w-[30px]',
                        selected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* 4. Monthly anchor */}
        {draft.frequency === 'monthly' && (
          <RecurrenceSelect
            value={draft.monthly_anchor ?? 'same_day'}
            options={[
              { value: 'same_day', label: 'Same day each month' },
              { value: 'nth_weekday', label: 'Same weekday position' },
              { value: 'first_day', label: 'First day of the month' },
              { value: 'last_day', label: 'Last day of the month' },
            ]}
            onChange={(v) =>
              setDraft((prev) => ({
                ...prev,
                monthly_anchor: v as RecurrenceSpec['monthly_anchor'],
              }))
            }
            className={cn(fieldText, fieldH)}
          />
        )}

        {/* 5. Combined trigger dropdown */}
        <RecurrenceSelect
          value={triggerComboValue}
          options={triggerOptions}
          onChange={handleTriggerComboChange}
          className={cn(fieldText, fieldH)}
        />
      </div>

      <div className={cn('flex flex-col', fieldStackGap, mt)}>
        {/* 6. Skip weekends (daily only) */}
        {draft.frequency === 'daily' && (
          <label className={labelCls}>
            <input
              type="checkbox"
              className="checkbox-glass-green"
              checked={draft.skip_weekends ?? false}
              onChange={(e) => setDraft((prev) => ({ ...prev, skip_weekends: e.target.checked }))}
            />
            Skip weekends
          </label>
        )}

        {/* 7. Create new task + Options */}
        <div className="gap-spacing-2 flex w-full min-w-0 items-center justify-between">
          <label className={labelCls}>
            <input
              type="checkbox"
              className="checkbox-glass-green"
              checked={isCreateNewTask(draft)}
              onChange={(e) => {
                setDraft((prev) => {
                  const on = e.target.checked
                  const next: RecurrenceSpec = {
                    ...prev,
                    create_new_task: on,
                  }
                  if (on && !next.clone_include) {
                    next.clone_include = { ...DEFAULT_CLONE_INCLUDE }
                  }
                  return next
                })
              }}
            />
            Create new task
          </label>
          {isCreateNewTask(draft) && (
            <button
              ref={optionsAnchorRef}
              type="button"
              onClick={() => setCloneOptionsOpen(true)}
              className={cn(
                'text-muted-foreground hover:text-foreground shrink-0 underline-offset-2 hover:underline',
                embedded ? 'body-4' : 'body-3',
              )}
            >
              Options
            </button>
          )}
        </div>

        {/* 8. Recur forever */}
        <label className={labelCls}>
          <input
            type="checkbox"
            className="checkbox-glass-green"
            checked={draft.end.type === 'forever'}
            onChange={(e) => {
              if (e.target.checked) {
                setDraft((prev) => ({ ...prev, end: { type: 'forever' } }))
              } else {
                setDraft((prev) => ({ ...prev, end: { type: 'count', count: 1 } }))
              }
            }}
          />
          Recur forever
        </label>

        {/* 9. Update this task (same row) */}
        <div className="gap-spacing-1-5 flex flex-col">
          <label className={labelCls}>
            <input
              type="checkbox"
              className="checkbox-glass-green"
              checked={isUpdateSameItem(draft)}
              onChange={(e) => {
                setDraft((prev) => {
                  const on = e.target.checked
                  const next: RecurrenceSpec = { ...prev, update_same_item: on }
                  if (on && !next.reset_status) {
                    next.reset_status = defaultResetStatusId(statusField)
                  }
                  return next
                })
              }}
            />
            Update this task to:
          </label>

          {isUpdateSameItem(draft) &&
            (statusField && (statusField.options?.length ?? 0) > 0 ? (
              <SelectCell
                field={statusField}
                value={draft.reset_status ?? defaultResetStatusId(statusField)}
                onChange={(v) => {
                  const id =
                    typeof v === 'string' && v.length > 0 ? v : defaultResetStatusId(statusField)
                  setDraft((prev) => ({ ...prev, reset_status: id }))
                }}
                onEditStatuses={onEditStatuses}
                customTrigger={(() => {
                  const id = draft.reset_status ?? defaultResetStatusId(statusField)
                  const opt = statusField.options?.find((o) => o.id === id)
                  return (
                    <span
                      className={cn(
                        'surface-bg border-border text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 flex w-full min-w-0 items-center justify-between border transition-colors',
                        fieldH,
                      )}
                    >
                      <span className={cn('flex min-w-0 flex-1 items-center gap-2', fieldText)}>
                        {opt ? <OptionDot color={opt.color} size="sm" /> : <OptionDot size="sm" />}
                        <span className="min-w-0 flex-1 truncate text-left">
                          {opt?.label ?? 'Status'}
                        </span>
                      </span>
                      <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
                    </span>
                  )
                })()}
              />
            ) : (
              <RecurrenceSelect
                value={draft.reset_status ?? 'todo'}
                options={[
                  { value: 'todo', label: 'Open' },
                  { value: 'in_progress', label: 'In progress' },
                ]}
                onChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    reset_status: v as RecurrenceSpec['reset_status'],
                  }))
                }
                className={cn(fieldText, fieldH)}
              />
            ))}
        </div>

        {/* 10. Sync recurrence to due date */}
        <label className={labelCls}>
          <input
            type="checkbox"
            className="checkbox-glass-green"
            checked={draft.sync_to_due_date}
            onChange={(e) => setDraft((prev) => ({ ...prev, sync_to_due_date: e.target.checked }))}
          />
          Sync recurrence to due date
        </label>

        {/* 11. End condition (when not "recur forever") */}
        {draft.end.type !== 'forever' && (
          <div className="gap-spacing-1-5 flex items-center">
            <RecurrenceSelect
              value={draft.end.type === 'count' ? 'repeat' : 'until'}
              options={[
                { value: 'repeat', label: 'Repeat' },
                { value: 'until', label: 'Until' },
              ]}
              onChange={(v) => {
                if (v === 'repeat') {
                  setDraft((prev) => ({ ...prev, end: { type: 'count', count: 1 } }))
                } else {
                  setDraft((prev) => ({
                    ...prev,
                    end: { type: 'until', until: new Date().toISOString() },
                  }))
                }
              }}
              className={cn(fieldText, fieldH, 'w-auto min-w-[80px]')}
            />
            {draft.end.type === 'count' && (
              <>
                <input
                  type="number"
                  min={1}
                  value={draft.end.count}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    setDraft((prev) => ({
                      ...prev,
                      end: {
                        type: 'count',
                        count: Number.isFinite(value) && value > 0 ? value : 1,
                      },
                    }))
                  }}
                  className={cn(numInputCls, 'w-14')}
                />
                <span className={cn('text-muted-foreground', tx)}>times</span>
              </>
            )}
            {draft.end.type === 'until' && (
              <input
                type="date"
                value={draft.end.until.slice(0, 10)}
                onChange={(e) => {
                  const next = new Date(e.target.value)
                  next.setHours(23, 59, 59, 999)
                  setDraft((prev) => ({
                    ...prev,
                    end: { type: 'until', until: next.toISOString() },
                  }))
                }}
                className={cn(
                  'input-glass border-border text-foreground rounded-spacing-2 px-spacing-2 min-w-0 flex-1 border',
                  fieldText,
                  fieldH,
                )}
              />
            )}
          </div>
        )}
      </div>

      <RecurrenceCloneOptionsModal
        open={cloneOptionsOpen}
        anchorRef={optionsAnchorRef}
        onClose={() => setCloneOptionsOpen(false)}
        value={draft.clone_include ?? DEFAULT_CLONE_INCLUDE}
        onChange={(clone_include) => setDraft((prev) => ({ ...prev, clone_include }))}
        embedded={embedded}
      />

      {!embedded && (
        <div className="gap-spacing-2 pt-spacing-3 mt-auto flex items-center justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(forSave(draft))}
            disabled={!canSave}
            className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10">Save</span>
          </button>
        </div>
      )}
    </>
  )

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <div className="px-spacing-3 py-spacing-1 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {form}
        </div>
        <div className="gap-spacing-1-5 px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground px-spacing-2 rounded-lg py-1 text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(forSave(draft))}
            disabled={!canSave}
            className="button-glass-accent px-spacing-2-5 rounded-lg py-1 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10">Save</span>
          </button>
        </div>
      </div>
    )
  }

  return <div className="p-spacing-3 flex h-full flex-col">{form}</div>
}
