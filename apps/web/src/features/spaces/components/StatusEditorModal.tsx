'use client'

import type { HTMLAttributes } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Palette, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { STATUS_CATEGORIES } from '../lib/status-categories'
import type { SelectOption, SpaceSchema, StatusCategory } from '../types/space-schema'
import { FieldSchemaColorPicker } from './field-schema-color-picker'
import { OptionDot } from './OptionBadge'

interface StatusEditorModalProps {
  open: boolean
  schema: SpaceSchema
  onClose: () => void
  onSchemaChange: (next: SpaceSchema) => Promise<void>
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const REQUIRED_GROUPS = new Set<StatusCategory>(['not_started', 'closed'])

function groupOf(o: SelectOption): StatusCategory {
  return (o.group ?? 'active') as StatusCategory
}

function StatusRow({
  option,
  onRename,
  onChangeColor,
  onDelete,
  deleteDisabled,
  dragHandleProps,
  isDragOverlay,
  tagCustomSwatches,
  onTagCustomSwatchesChange,
}: {
  option: SelectOption
  onRename: (label: string) => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  deleteDisabled?: boolean
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  isDragOverlay?: boolean
  tagCustomSwatches: string[]
  onTagCustomSwatchesChange: (swatches: string[]) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(option.label)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const colorAnchorRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  function commitRename() {
    const trimmed = renameDraft.trim()
    if (trimmed && trimmed !== option.label) onRename(trimmed)
    setRenaming(false)
  }

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-2 py-2',
        isDragOverlay && 'ring-primary/30 bg-card shadow-lg ring-1',
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 cursor-grab touch-none text-[var(--color-muted-foreground)] opacity-40 active:cursor-grabbing group-hover:opacity-70"
        {...dragHandleProps}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="relative shrink-0">
        <button
          ref={colorAnchorRef}
          type="button"
          onClick={() => {
            setColorPickerOpen((o) => !o)
            setMenuOpen(false)
          }}
          className="focus-visible:ring-ring flex items-center justify-center rounded p-0.5 focus-visible:outline-none focus-visible:ring-2"
          aria-label="Change color"
        >
          <OptionDot color={option.color} size="sm" />
        </button>
        {colorPickerOpen && (
          <FieldSchemaColorPicker
            anchorRef={colorAnchorRef}
            open={colorPickerOpen}
            value={option.color}
            onChange={onChangeColor}
            onClose={() => setColorPickerOpen(false)}
            customSwatches={tagCustomSwatches}
            onCustomSwatchesChange={onTagCustomSwatchesChange}
          />
        )}
      </div>

      {renaming ? (
        <input
          autoFocus
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setRenaming(false)
          }}
          onBlur={commitRename}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold uppercase tracking-wide text-[var(--foreground)] outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">
          {option.label}
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Status options"
          title="Status options"
          className="shrink-0 rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--foreground)] group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="dropdown-menu-solid absolute right-0 top-full z-10 mt-1 w-40 rounded-xl py-1"
          >
            <button
              type="button"
              onClick={() => {
                setRenameDraft(option.label)
                setRenaming(true)
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
            >
              <Pencil className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setColorPickerOpen(true)
                setMenuOpen(false)
              }}
              className="hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[var(--foreground)] transition-colors"
            >
              <Palette className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              Change Color
            </button>
            <button
              type="button"
              disabled={deleteDisabled}
              onClick={() => {
                if (deleteDisabled) return
                onDelete()
                setMenuOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                deleteDisabled
                  ? 'cursor-not-allowed text-[var(--color-muted-foreground)] opacity-40'
                  : 'text-destructive hover:bg-destructive/10'
              }`}
              title={deleteDisabled ? 'At least one status required in this category' : undefined}
            >
              <Trash2
                className={`h-3.5 w-3.5 ${deleteDisabled ? 'text-[var(--color-muted-foreground)]' : 'text-destructive'}`}
              />
              Delete Status
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function InsertionLine() {
  return (
    <div className="pointer-events-none relative z-10 -my-[3px] flex h-[6px] items-center px-2">
      <div
        className="h-[2px] flex-1"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgb(59 130 246) 10%, rgb(59 130 246) 90%, transparent 100%)',
        }}
      />
    </div>
  )
}

function SortableStatusRow({
  option,
  onRename,
  onChangeColor,
  onDelete,
  deleteDisabled,
  isOver,
  insertPosition,
  tagCustomSwatches,
  onTagCustomSwatchesChange,
}: {
  option: SelectOption
  onRename: (label: string) => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  deleteDisabled?: boolean
  isOver: boolean
  insertPosition: 'before' | 'after' | null
  tagCustomSwatches: string[]
  onTagCustomSwatchesChange: (swatches: string[]) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } =
    useSortable({ id: option.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? transition : undefined,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {isOver && insertPosition === 'before' && <InsertionLine />}
      <StatusRow
        option={option}
        onRename={onRename}
        onChangeColor={onChangeColor}
        onDelete={onDelete}
        deleteDisabled={deleteDisabled}
        dragHandleProps={{ ...attributes, ...listeners }}
        tagCustomSwatches={tagCustomSwatches}
        onTagCustomSwatchesChange={onTagCustomSwatchesChange}
      />
      {isOver && insertPosition === 'after' && <InsertionLine />}
    </div>
  )
}

function CategorySection({
  categoryId,
  label,
  options,
  onAdd,
  onRename,
  onChangeColor,
  onDelete,
  activeId,
  getInsertPosition,
  tagCustomSwatches,
  onTagCustomSwatchesChange,
}: {
  categoryId: StatusCategory
  label: string
  options: SelectOption[]
  onAdd: (opt: SelectOption) => void
  onRename: (optionId: string, label: string) => void
  onChangeColor: (optionId: string, color: string) => void
  onDelete: (optionId: string) => void
  activeId: string | null
  getInsertPosition: (itemId: string) => 'before' | 'after' | null
  tagCustomSwatches: string[]
  onTagCustomSwatchesChange: (swatches: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('slate')
  const [pickerOpen, setPickerOpen] = useState(false)
  const newColorAnchorRef = useRef<HTMLButtonElement>(null)
  const committingAddRef = useRef(false)
  const skipBlurCommitRef = useRef(false)

  const ids = useMemo(() => options.map((o) => o.id), [options])
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id: `cat:${categoryId}` })

  function commitAdd() {
    const trimmed = newName.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    committingAddRef.current = true
    onAdd({
      id: slugify(trimmed) || `status_${Date.now()}`,
      label: trimmed,
      color: newColor,
      group: categoryId,
    })
    setNewName('')
    setNewColor('slate')
    setAdding(false)
    window.setTimeout(() => {
      committingAddRef.current = false
    }, 0)
  }

  function commitAddFromBlurIfNeeded() {
    if (committingAddRef.current) return
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false
      return
    }
    const trimmed = newName.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    commitAdd()
  }

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">{label}</span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add status"
          title="Add status"
          className="rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {options.map((opt) => {
            const isLastInRequired = REQUIRED_GROUPS.has(categoryId) && options.length <= 1
            return (
              <SortableStatusRow
                key={opt.id}
                option={opt}
                deleteDisabled={isLastInRequired}
                onRename={(lbl) => onRename(opt.id, lbl)}
                onChangeColor={(clr) => onChangeColor(opt.id, clr)}
                onDelete={() => onDelete(opt.id)}
                isOver={getInsertPosition(opt.id) !== null}
                insertPosition={getInsertPosition(opt.id)}
                tagCustomSwatches={tagCustomSwatches}
                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
              />
            )
          })}

          {options.length === 0 && activeId && (
            <div
              ref={setDropRef}
              className={cn(
                'overflow-hidden rounded-lg transition-all duration-150',
                isDropOver
                  ? 'text-muted-foreground flex h-10 items-center justify-center border border-dashed border-blue-400 bg-blue-500/5 text-xs'
                  : 'h-1',
              )}
            >
              {isDropOver && 'Drop here'}
            </div>
          )}
        </div>
      </SortableContext>

      {adding && (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border-2 border-[rgb(var(--vibe-purple))] px-2 py-2">
          <div className="relative shrink-0">
            <button
              ref={newColorAnchorRef}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPickerOpen((o) => !o)}
              className="focus-visible:ring-ring flex items-center justify-center rounded p-0.5 focus-visible:outline-none focus-visible:ring-2"
              aria-label="Choose color for new status"
            >
              <OptionDot color={newColor} size="sm" />
            </button>
            {pickerOpen && (
              <FieldSchemaColorPicker
                anchorRef={newColorAnchorRef}
                open={pickerOpen}
                value={newColor}
                onChange={setNewColor}
                onClose={() => setPickerOpen(false)}
                customSwatches={tagCustomSwatches}
                onCustomSwatchesChange={onTagCustomSwatchesChange}
              />
            )}
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitAdd()
              }
              if (e.key === 'Escape') {
                skipBlurCommitRef.current = true
                setNewName('')
                setAdding(false)
              }
            }}
            onBlur={() => {
              queueMicrotask(() => commitAddFromBlurIfNeeded())
            }}
            placeholder="Add status"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
      )}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Plus className="h-3 w-3" />
          Add status
        </button>
      )}
    </div>
  )
}

export function StatusEditorModal({
  open,
  schema,
  onClose,
  onSchemaChange,
}: StatusEditorModalProps) {
  const [draft, setDraft] = useState<SpaceSchema>(schema)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overSide, setOverSide] = useState<'before' | 'after'>('after')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (open) setDraft(schema)
  }, [open, schema])

  const statusField = draft.fields.find((f) => f.id === 'status')
  const statusOptions = statusField?.options ?? []
  const allIds = useMemo(() => statusOptions.map((o) => o.id), [statusOptions])

  if (!open) return null
  if (!statusField) return null

  const tagCustomSwatches = statusField.tag_custom_swatches ?? []

  function updateTagCustomSwatches(next: string[]) {
    setDraft({
      ...draft,
      fields: draft.fields.map((f) =>
        f.id === 'status' ? { ...f, tag_custom_swatches: next } : f,
      ),
    })
  }

  function updateOptions(next: SelectOption[]) {
    setDraft({
      ...draft,
      fields: draft.fields.map((f) => (f.id === 'status' ? { ...f, options: next } : f)),
    })
  }

  function handleAdd(opt: SelectOption) {
    updateOptions([...statusOptions, opt])
  }

  function handleRename(optionId: string, label: string) {
    updateOptions(statusOptions.map((o) => (o.id === optionId ? { ...o, label } : o)))
  }

  function handleChangeColor(optionId: string, color: string) {
    updateOptions(statusOptions.map((o) => (o.id === optionId ? { ...o, color } : o)))
  }

  function handleDelete(optionId: string) {
    updateOptions(statusOptions.filter((o) => o.id !== optionId))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setOverId(null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { over, active } = event
    if (!over) {
      setOverId(null)
      return
    }
    setOverId(String(over.id))
    const overRect = over.rect
    const dragY = active.rect.current.translated?.top
    if (overRect && dragY != null) {
      const midY = overRect.top + overRect.height / 2
      setOverSide(dragY < midY ? 'before' : 'after')
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedId = String(active.id)
    const dropId = String(over.id)

    const dragged = statusOptions.find((o) => o.id === draggedId)
    if (!dragged) return

    const fromGroup = groupOf(dragged)

    if (dropId.startsWith('cat:')) {
      const targetCategory = dropId.slice('cat:'.length) as StatusCategory
      if (!STATUS_CATEGORIES.some((c) => c.id === targetCategory)) return
      if (fromGroup === targetCategory) return

      if (REQUIRED_GROUPS.has(fromGroup)) {
        const inFrom = statusOptions.filter((o) => groupOf(o) === fromGroup).length
        if (inFrom <= 1) {
          toast.error(
            fromGroup === 'not_started'
              ? 'At least one "Not started" status is required'
              : 'At least one "Closed" status is required',
          )
          return
        }
      }

      const without = statusOptions.filter((o) => o.id !== draggedId)
      const movedOption = { ...dragged, group: targetCategory }
      updateOptions([...without, movedOption])
      return
    }

    const target = statusOptions.find((o) => o.id === dropId)
    if (!target) return

    const toGroup = groupOf(target)

    if (fromGroup !== toGroup && REQUIRED_GROUPS.has(fromGroup)) {
      const inFrom = statusOptions.filter((o) => groupOf(o) === fromGroup).length
      if (inFrom <= 1) {
        toast.error(
          fromGroup === 'not_started'
            ? 'At least one "Not started" status is required'
            : 'At least one "Closed" status is required',
        )
        return
      }
    }

    const without = statusOptions.filter((o) => o.id !== draggedId)
    const movedOption = { ...dragged, group: toGroup }
    const targetIndex = without.findIndex((o) => o.id === dropId)
    const insertAt = overSide === 'after' ? targetIndex + 1 : targetIndex
    const next = [...without]
    next.splice(insertAt, 0, movedOption)

    updateOptions(next)
  }

  function handleDragCancel() {
    setActiveId(null)
    setOverId(null)
  }

  function getInsertPosition(itemId: string): 'before' | 'after' | null {
    if (!activeId || !overId || activeId === overId) return null
    if (itemId !== overId) return null
    return overSide
  }

  const activeOption = activeId ? statusOptions.find((o) => o.id === activeId) : null

  return createPortal(
    <div className="z-modal-backdrop flex items-center justify-center p-2">
      <div className="z-modal-content surface-card border-border relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl">
        {/* Header */}
        <div className="px-spacing-4 sm:px-spacing-6 flex items-center justify-between py-4">
          <h2 className="title-h6">Edit statuses</h2>
          <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-spacing-4 sm:px-spacing-6 max-h-[60vh] overflow-y-auto py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
              {STATUS_CATEGORIES.map((cat) => {
                const catOptions = statusOptions.filter((o) => (o.group ?? 'active') === cat.id)
                return (
                  <CategorySection
                    key={cat.id}
                    categoryId={cat.id}
                    label={cat.label}
                    options={catOptions}
                    onAdd={handleAdd}
                    onRename={handleRename}
                    onChangeColor={handleChangeColor}
                    onDelete={handleDelete}
                    activeId={activeId}
                    getInsertPosition={getInsertPosition}
                    tagCustomSwatches={tagCustomSwatches}
                    onTagCustomSwatchesChange={updateTagCustomSwatches}
                  />
                )
              })}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeOption ? (
                <StatusRow
                  option={activeOption}
                  onRename={() => {}}
                  onChangeColor={() => {}}
                  onDelete={() => {}}
                  isDragOverlay
                  tagCustomSwatches={tagCustomSwatches}
                  onTagCustomSwatchesChange={() => {}}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Footer — Layer 2: dialog actions (design-guidelines §16) */}
        <div className="px-spacing-4 py-spacing-4 sm:px-spacing-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const opts = draft.fields.find((f) => f.id === 'status')?.options ?? []
              const hasNotStarted = opts.some((o) => (o.group ?? 'active') === 'not_started')
              const hasClosed = opts.some((o) => (o.group ?? 'active') === 'closed')
              if (!hasNotStarted) {
                toast.error('At least one "Not started" status is required')
                return
              }
              if (!hasClosed) {
                toast.error('At least one "Closed" status is required')
                return
              }
              void onSchemaChange(draft)
              onClose()
            }}
            className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium"
          >
            <span className="relative z-10">Apply changes</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
