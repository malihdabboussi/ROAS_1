'use client'

import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, memo, useImperativeHandle } from 'react'
import { Calendar, CornerDownLeft, Flag, Plus, Tags, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import { useSpacesStore } from '../store/use-spaces-store'
import { defaultNewTaskStatusId, type FieldDef, type SelectOption } from '../types/space-schema'
import { AssigneeCell } from './cells/AssigneeCell'
import { DueDateCell } from './cells/DueDateCell'
import { MultiSelectCell } from './cells/MultiSelectCell'
import { SelectCell } from './cells/SelectCell'
import { OptionDot } from './OptionBadge'

const PRIORITY_OPTIONS: SelectOption[] = [
  { id: 'low', label: 'Low', color: 'slate' },
  { id: 'medium', label: 'Medium', color: 'blue' },
  { id: 'high', label: 'High', color: 'orange' },
  { id: 'urgent', label: 'Urgent', color: 'red' },
]

const PRIORITY_FIELD: FieldDef = {
  id: 'priority',
  name: 'Priority',
  type: 'select',
  options: PRIORITY_OPTIONS,
}

/** Bare 24px icon button trigger used inside dropdown cells. Active when a value is set. */
const QUICK_ICON_BTN =
  'inline-flex h-6 w-6 items-center justify-center rounded p-0 transition-colors hover:bg-[var(--color-hover-subtle)]'

export type SpaceQuickAddTitleInputHandle = {
  getValue: () => string
  clear: () => void
  focus: () => void
}

const SpaceQuickAddTitleInput = memo(
  forwardRef<
    SpaceQuickAddTitleInputHandle,
    {
      placeholder: string
      inputLocked: boolean
      onEnterSave: () => void
      onEscapeReset: () => void
    }
  >(function SpaceQuickAddTitleInput(
    { placeholder, inputLocked, onEnterSave, onEscapeReset },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [value, setValue] = useState('')

    useImperativeHandle(ref, () => ({
      getValue: () => value,
      clear: () => setValue(''),
      focus: () => inputRef.current?.focus(),
    }))

    const activeInputWidthCh = Math.min(36, Math.max(12, value.length + 1, placeholder.length))

    return (
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnterSave()
          if (e.key === 'Escape') onEscapeReset()
        }}
        placeholder={placeholder}
        className="min-w-0 max-w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
        style={{ width: `${activeInputWidthCh}ch` }}
        disabled={inputLocked}
      />
    )
  }),
)

export interface SpaceQuickAddProps {
  roster?: TeamRosterEntry[]
  currentUserId?: string | null
  allFields?: FieldDef[]
  displayCols: FieldDef[]
  gridTemplateColumns: string
  onEditStatuses?: () => void
  /** List view uses a 40px DnD gutter; task modal subtask panel has none. */
  showLeadingDndGutter?: boolean
  addTaskLabel?: string
  inputPlaceholder?: string
  addRowAriaLabel?: string
  /** When set, clicking the inactive row delegates to an external menu/action instead of opening the inline composer. */
  onInactiveActivate?: (trigger: HTMLElement) => void
  /** When set, Save calls this with the same field extras as list `createItem` (e.g. subtasks with `parent_item_id` added by the caller). */
  onSubmitItem?: (title: string, extra: Record<string, unknown>) => Promise<void>
  surface?: 'list' | 'table' | 'subtaskPanel'
  /** When true, respond to `requestInlineTaskComposerFocus()` (space + Task). Only one instance in the tree should be true. */
  acceptToolbarFocus?: boolean
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function resolveAssignees(
  val: Array<{ type: 'human' | 'agent'; id: string }>,
  roster: TeamRosterEntry[],
): TeamRosterEntry[] {
  return val
    .map((assignee) =>
      assignee.type === 'agent'
        ? roster.find((e) => e.kind === 'agent' && e.agent_key === assignee.id)
        : roster.find((e) => e.kind === 'human' && e.user_id === assignee.id),
    )
    .filter((entry): entry is TeamRosterEntry => entry != null)
}

export function SpaceQuickAdd({
  roster = [],
  currentUserId,
  allFields = [],
  displayCols,
  gridTemplateColumns,
  onEditStatuses,
  showLeadingDndGutter = true,
  addTaskLabel,
  inputPlaceholder,
  addRowAriaLabel,
  onInactiveActivate,
  onSubmitItem,
  surface = 'list',
  acceptToolbarFocus = false,
}: SpaceQuickAddProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inlineTaskComposerFocusNonce = useSpacesStore((s) => s.inlineTaskComposerFocusNonce)
  const prevToolbarNonce = useRef<number | null>(null)

  const addLabel = addTaskLabel ?? (surface === 'table' ? 'Add row' : 'Add task')
  const placeholder = inputPlaceholder ?? (surface === 'table' ? 'Row name' : 'Task name')
  const [active, setActive] = useState(false)
  const titleInputRef = useRef<SpaceQuickAddTitleInputHandle>(null)
  const [status, setStatus] = useState<string>('')
  const [assignee, setAssignee] = useState<Array<{ type: 'human' | 'agent'; id: string }>>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const createItem = useSpacesStore((s) => s.createItem)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)

  const statusField = useMemo(() => allFields.find((f) => f.id === 'status') ?? null, [allFields])
  const defaultStatusId = useMemo(() => defaultNewTaskStatusId(statusField), [statusField])
  const statusOption = useMemo(
    () => statusField?.options?.find((o) => o.id === (status || defaultStatusId)) ?? null,
    [statusField, status, defaultStatusId],
  )
  const tagsField = allFields.find((f) => f.id === 'tags') ?? null
  const assigneeEntries = useMemo(() => resolveAssignees(assignee, roster), [assignee, roster])
  const selectedTagCount = tags.length
  const priorityOption = useMemo(
    () => PRIORITY_OPTIONS.find((o) => o.id === priority) ?? null,
    [priority],
  )

  const displayFields = useMemo(() => displayCols.filter((f) => f.id !== 'status'), [displayCols])

  const statusForDisplay = status || defaultStatusId

  const reset = useCallback(() => {
    titleInputRef.current?.clear()
    setStatus('')
    setAssignee([])
    setDueDate(null)
    setTags([])
    setPriority(null)
    setActive(false)
  }, [])

  /** Table: after save, clear fields but stay in composer for the next row. */
  const clearComposerForNextRow = useCallback(() => {
    titleInputRef.current?.clear()
    setStatus('')
    setAssignee([])
    setDueDate(null)
    setTags([])
    setPriority(null)
  }, [])

  const buildCreateExtra = useCallback((): Record<string, unknown> => {
    const statusToSend = status || defaultStatusId
    return {
      ...(statusToSend ? { status: statusToSend } : {}),
      ...(assignee.length > 0
        ? {
            assignees: assignee,
            assignee_type: assignee[0]!.type,
            assignee_id: assignee[0]!.id,
          }
        : {}),
      ...(dueDate ? { due_date: dueDate } : {}),
      ...(priority ? { priority } : {}),
      ...(tags.length > 0 ? { custom_data: { tags } } : {}),
    }
  }, [status, defaultStatusId, assignee, dueDate, priority, tags])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, reset])

  async function handleSave() {
    if (submittingRef.current) return
    const trimmed = titleInputRef.current?.getValue().trim() ?? ''
    if (!trimmed) return
    submittingRef.current = true
    const extra = buildCreateExtra()
    // Reset the composer synchronously so a repeated Enter/Save during the
    // network round-trip has no value to submit. Combined with the optimistic
    // insert in `createItem`, the new row appears instantly.
    if (surface === 'table') {
      clearComposerForNextRow()
      setTimeout(() => titleInputRef.current?.focus(), 0)
    } else {
      reset()
    }
    try {
      if (onSubmitItem) {
        await onSubmitItem(trimmed, extra)
      } else if (activeSpaceId) {
        await createItem(trimmed, extra)
      }
    } catch {
      toast.error('Failed to add item')
    } finally {
      submittingRef.current = false
    }
  }

  const inputLocked = !onSubmitItem && !activeSpaceId
  const saveDisabled = inputLocked

  const startComposing = useCallback(() => {
    setActive(true)
    if (!status && statusField?.options?.length) {
      setStatus(defaultNewTaskStatusId(statusField))
    }
    setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [status, statusField, defaultStatusId])

  const handleInactiveActivate = useCallback((trigger: HTMLElement) => {
    if (onInactiveActivate) {
      onInactiveActivate(trigger)
      return
    }
    startComposing()
  }, [onInactiveActivate, startComposing])

  useEffect(() => {
    if (!acceptToolbarFocus) return
    if (prevToolbarNonce.current === null) {
      prevToolbarNonce.current = inlineTaskComposerFocusNonce
      return
    }
    if (inlineTaskComposerFocusNonce === prevToolbarNonce.current) return
    prevToolbarNonce.current = inlineTaskComposerFocusNonce
    startComposing()
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [acceptToolbarFocus, inlineTaskComposerFocusNonce, startComposing])

  const nameColBaseMask =
    'linear-gradient(to right, var(--background) 0, var(--background) max(0px, calc(100% - 4rem)), transparent 100%)'
  const nameColHoverMask =
    'linear-gradient(to right, var(--color-hover-subtle) 0, var(--color-hover-subtle) max(0px, calc(100% - 4rem)), transparent 100%)'

  const titleColShift =
    (showLeadingDndGutter || surface === 'subtaskPanel') && surface !== 'table'
      ? 'left-10'
      : 'left-0'

  const composerPriority = useMemo(
    () => (
    <div className="shrink-0" data-cell onPointerDown={(e) => e.stopPropagation()}>
      <SelectCell
        field={PRIORITY_FIELD}
        value={priority ?? ''}
        onChange={(next) => setPriority(next ? String(next) : null)}
        triggerInline
        customTrigger={
          <span
            className={cn(
              QUICK_ICON_BTN,
              priority
                ? 'text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
            )}
            title={priorityOption ? `Priority: ${priorityOption.label}` : 'Priority'}
          >
            {priorityOption ? (
              <OptionDot color={priorityOption.color} size="sm" />
            ) : (
              <Flag className="h-3 w-3" />
            )}
          </span>
        }
      />
    </div>
  ),
    [priority, priorityOption],
  )

  const composerAssignee = useMemo(
    () => (
    <div className="shrink-0" data-cell onPointerDown={(e) => e.stopPropagation()}>
      <AssigneeCell
        value={assignee}
        roster={roster}
        currentUserId={currentUserId ?? null}
        onChange={setAssignee}
        customTrigger={
          <span
            className={cn(
              QUICK_ICON_BTN,
              assigneeEntries.length > 0
                ? 'text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
            )}
            title={
              assigneeEntries.length > 0
                ? `Assignees: ${assigneeEntries.map((entry) => entry.display_name).join(', ')}`
                : 'Assignee'
            }
          >
            {assigneeEntries[0]?.avatar_url ? (
              <img
                src={assigneeEntries[0].avatar_url}
                alt=""
                className="h-3.5 w-3.5 rounded-full object-cover"
              />
            ) : assigneeEntries[0] ? (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-muted)] text-[7px] font-semibold text-[var(--foreground)]">
                {assigneeEntries.length > 1
                  ? assigneeEntries.length
                  : assigneeEntries[0].display_name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Users className="h-3 w-3" />
            )}
          </span>
        }
      />
    </div>
  ),
    [assignee, assigneeEntries, currentUserId, roster],
  )

  const composerTags = useMemo(
    () =>
      tagsField ? (
    <div className="shrink-0" data-cell onPointerDown={(e) => e.stopPropagation()}>
      <MultiSelectCell
        field={tagsField}
        value={tags}
        onChange={(v) => setTags(Array.isArray(v) ? (v as string[]) : [])}
        customTrigger={
          <span
            className={cn(
              QUICK_ICON_BTN,
              selectedTagCount > 0
                ? 'text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
            )}
            title={selectedTagCount > 0 ? `${selectedTagCount} tag(s)` : 'Tags'}
          >
            <Tags className="h-3 w-3" />
          </span>
        }
      />
    </div>
  ) : null,
    [tags, tagsField, selectedTagCount],
  )

  const composerDueDate = useMemo(
    () => (
    <div className="shrink-0" data-cell onPointerDown={(e) => e.stopPropagation()}>
      <DueDateCell
        value={{ start_date: null, due_date: dueDate, recurrence: null }}
        onChange={(patch) => {
          if ('due_date' in patch) setDueDate(patch.due_date ?? null)
        }}
        customTrigger={
          <span
            className={cn(
              QUICK_ICON_BTN,
              dueDate
                ? 'text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
            )}
            title={dueDate ? `Due ${formatShortDate(dueDate)}` : 'Due date'}
          >
            <Calendar className="h-3 w-3" />
          </span>
        }
      />
    </div>
  ),
    [dueDate],
  )

  const composerFieldActions = useMemo(
    () => (
      <>
        {composerPriority}
        {composerAssignee}
        {composerTags}
        {composerDueDate}
        <div className="mx-0.5 h-3.5 w-px shrink-0 bg-[var(--color-border)]" aria-hidden />
      </>
    ),
    [composerPriority, composerAssignee, composerTags, composerDueDate],
  )

  const composerSaveButtons = (
    <>
      <button
        type="button"
        onClick={reset}
        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saveDisabled}
        className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-40"
      >
        Save
        <CornerDownLeft className="h-3 w-3" />
      </button>
    </>
  )

  const composerActions = (
    <>
      {composerFieldActions}
      {composerSaveButtons}
    </>
  )

  const activeComposerRow = (
    <div className="flex min-w-0 w-full items-center overflow-hidden">
      <div className="flex shrink-0 items-center gap-2.5 pl-1.5">
        <span className="inline-block w-4 shrink-0" aria-hidden />
      </div>
      <div className="ml-2.5 flex min-w-0 items-center gap-1.5 self-stretch">
        {statusField ? (
          <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <SelectCell
              field={statusField}
              value={statusForDisplay}
              onChange={(next) => setStatus((next as string) || '')}
              onEditStatuses={onEditStatuses}
              triggerInline
              customTrigger={<OptionDot color={statusOption?.color} size="sm" />}
            />
          </div>
        ) : null}
        <div className="shrink-0 self-center">
          <SpaceQuickAddTitleInput
            ref={titleInputRef}
            placeholder={placeholder}
            inputLocked={inputLocked}
            onEnterSave={() => void handleSave()}
            onEscapeReset={reset}
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">{composerActions}</div>
      </div>
    </div>
  )

  if (surface === 'subtaskPanel') {
    const subtaskTitleCellClass =
      'sticky relative left-10 z-30 flex min-w-0 w-full items-stretch py-0.5'
    const subtaskPanelLeadingSpacer = (
      <div className="sticky left-0 z-30 w-10 shrink-0 self-stretch" aria-hidden />
    )

    const renderSubtaskTitleCell = (isActive: boolean) => (
      <div
        key="qa:title"
        className={cn(subtaskTitleCellClass, isActive && 'bg-[var(--background)]')}
        style={isActive ? { gridColumn: '1 / -1' } : undefined}
      >
        {isActive ? (
          activeComposerRow
        ) : (
          <div className="relative flex min-w-0 flex-1 items-center">
            <div className="flex shrink-0 items-center gap-2.5 pl-1.5">
              <span className="inline-block w-4 shrink-0" aria-hidden />
            </div>
            <div className="ml-2.5 flex min-w-0 flex-1 items-center gap-2.5 self-stretch">
              <div className="inline-flex h-[10px] w-[10px] shrink-0 items-center justify-center">
                <Plus
                  className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]"
                  strokeWidth={2.5}
                />
              </div>
              <span
                className="min-w-0 flex-1 self-center py-0.5 text-left text-sm leading-none text-[var(--color-muted-foreground)]"
                data-space-quick-add-label
              >
                {addLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    )

    const renderSubtaskFieldCell = (field: FieldDef) => {
      if (field.id === 'title') return renderSubtaskTitleCell(false)
      return <div key={field.id} className="min-w-0" aria-hidden />
    }

    const subtaskGrid = (isActive: boolean) => (
      <div className="grid min-w-0 flex-1 items-stretch gap-0" style={{ gridTemplateColumns }}>
        {isActive ? (
          renderSubtaskTitleCell(true)
        ) : (
          <>
            {displayFields.map((field) => renderSubtaskFieldCell(field))}
            <div className="min-w-0" aria-hidden />
          </>
        )}
      </div>
    )

    if (!active) {
      return (
        <div ref={rootRef} className="group/row relative min-w-0">
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-none group-hover/row:bg-[var(--color-hover-subtle)]"
            aria-hidden
          />
          <div
            role="button"
            tabIndex={0}
            aria-label={addRowAriaLabel ?? addLabel}
            className="focus-visible:ring-ring focus-visible:ring-offset-background relative flex min-w-0 cursor-pointer items-stretch py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            onClick={(e) => handleInactiveActivate(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleInactiveActivate(e.currentTarget)
              }
            }}
          >
            {subtaskPanelLeadingSpacer}
            <div className="min-w-0 flex-1 pr-4">{subtaskGrid(false)}</div>
          </div>
        </div>
      )
    }

    return (
      <div ref={rootRef} className="group/row relative min-w-0 bg-[var(--background)]">
        <div className="relative flex min-w-0 items-stretch py-1.5">
          {subtaskPanelLeadingSpacer}
          <div className="min-w-0 flex-1 pr-4">{subtaskGrid(true)}</div>
        </div>
      </div>
    )
  }

  const titleStickyCellClass = cn(
    'sticky flex min-w-0 items-stretch py-0.5',
    surface === 'table'
      ? 'relative left-0 z-30 box-border min-h-[2.25rem] w-full min-w-0 px-2 py-1'
      : cn('relative z-30 w-full min-w-0', titleColShift),
  )

  const titleInner = () => (
    <div className={cn('flex min-w-0 items-stretch', 'w-full')}>
      {surface !== 'table' && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-none"
            style={{ background: nameColBaseMask }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-none group-hover/row:opacity-100"
            style={{ background: nameColHoverMask }}
            aria-hidden
          />
        </>
      )}
      <div className="relative z-[2] flex min-w-0 flex-1 items-center">
        <div className="flex shrink-0 items-center gap-2.5 pl-1.5">
          <span className="inline-block w-4 shrink-0" aria-hidden />
        </div>
        <div className="ml-2.5 flex w-full min-w-0 flex-1 items-center gap-2.5 self-stretch">
          <div
            className="inline-flex h-[10px] w-[10px] shrink-0 items-center justify-center"
            aria-hidden
          >
            <Plus
              className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]"
              strokeWidth={2.5}
            />
          </div>
          <span
            className="min-w-0 flex-1 self-center py-0.5 text-left text-sm leading-none text-[var(--color-muted-foreground)]"
            data-space-quick-add-label
          >
            {addLabel}
          </span>
        </div>
      </div>
    </div>
  )

  if (!active) {
    return (
      <div
        ref={rootRef}
        className={cn('group/row relative min-w-0', surface === 'table' && 'rounded-b-xl')}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-0 transition-none group-hover/row:bg-[var(--color-hover-subtle)]',
            surface === 'table' && 'rounded-b-xl',
          )}
          aria-hidden
        />
        <div
          role="button"
          tabIndex={0}
          aria-label={addRowAriaLabel ?? addLabel}
          className={cn(
            'focus-visible:ring-ring focus-visible:ring-offset-background relative flex min-w-0 cursor-pointer items-stretch rounded-sm py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            surface === 'table' && 'rounded-none py-0 focus-visible:ring-offset-0',
          )}
          onClick={(e) => handleInactiveActivate(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleInactiveActivate(e.currentTarget)
            }
          }}
        >
          {showLeadingDndGutter ? (
            <div
              className={cn(
                'relative sticky left-0 z-30 flex w-10 shrink-0 self-stretch',
                surface === 'table' && 'min-h-[2.25rem] rounded-bl-xl',
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 z-0 bg-[var(--background)] transition-none group-hover/row:bg-[var(--color-hover-subtle)]',
                  surface === 'table' && 'rounded-bl-xl',
                )}
                aria-hidden
              />
            </div>
          ) : null}
          <div
            className={cn(
              'min-w-0 flex-1',
              surface !== 'table' && 'pr-4',
              surface === 'table' && 'rounded-br-xl',
            )}
          >
            <div
              className="group grid min-w-0 flex-1 items-stretch gap-0"
              style={{ gridTemplateColumns }}
            >
              {displayFields.map((field) => {
                if (field.id === 'title') {
                  return (
                    <div key="qa:title" className={titleStickyCellClass}>
                      {titleInner()}
                    </div>
                  )
                }
                return <div key={field.id} className="min-w-0" aria-hidden />
              })}
              <div className="min-w-0" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'group/row relative min-w-0 bg-[var(--background)]',
        surface === 'table' && 'rounded-b-xl',
      )}
    >
      <div
        className={cn('relative flex min-w-0 items-stretch py-1.5', surface === 'table' && 'py-0')}
      >
        {showLeadingDndGutter ? (
          <div
            className={cn(
              'relative sticky left-0 z-30 flex w-10 shrink-0 self-stretch',
              surface === 'table' && 'min-h-[2.25rem] rounded-bl-xl',
            )}
          >
            <div
              className={cn(
                'pointer-events-none absolute inset-0 z-0 bg-[var(--background)]',
                surface === 'table' && 'rounded-bl-xl',
              )}
              aria-hidden
            />
          </div>
        ) : null}
        <div
          className={cn(
            'min-w-0 flex-1',
            surface !== 'table' && 'pr-4',
            surface === 'table' && 'rounded-br-xl',
          )}
        >
          <div
            className="group grid min-w-0 flex-1 items-stretch gap-0"
            style={{ gridTemplateColumns }}
          >
            {displayFields.map((field) => {
              if (field.id === 'title') {
                return (
                  <div
                    key="qa:title"
                    className={cn(titleStickyCellClass, 'bg-[var(--background)]')}
                  >
                    {activeComposerRow}
                  </div>
                )
              }
              return <div key={field.id} className="min-w-0" aria-hidden />
            })}
            <div className="min-w-0" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  )
}
