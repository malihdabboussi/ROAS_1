'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, FileText, Flag, Globe2, MapPin, MapPinned, Send } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import {
  buildContactVisibleFieldDefs,
  CONTACT_SOURCE_OPTIONS,
  normalizeContactVisibleFieldOrderIds,
} from '../../lib/contact-view-field-meta'
import { displayColumnsForList } from '../../lib/display-columns-list'
import type { CrmContactRow } from '../../services/contacts-view.service'
import { addContactNote } from '../../services/contacts-view.service'
import type { FieldDef, SelectOption, ViewDef } from '../../types/space-schema'
import { SpaceCell } from '../cells/SpaceCell'
import {
  DraggableColumnHeaders,
  getDefaultWidth,
  SpaceListHeaderCheckbox,
} from '../DraggableColumnHeaders'
import { GroupedRowGripColumn, SPACE_LIST_ROW_SELECTED_TINT } from '../space-list-group-chrome'
import type { NoteCardTintId } from './contact-note-card-tint'
import { NoteColorPicker } from './note-color-picker'

const NAME_COL_RIGHT_MASK = {
  base: 'linear-gradient(to right, var(--background) 0, var(--background) max(0px, calc(100% - 4rem)), transparent 100%)',
  hover:
    'linear-gradient(to right, var(--color-hover-subtle) 0, var(--color-hover-subtle) max(0px, calc(100% - 4rem)), transparent 100%)',
  selected:
    'linear-gradient(to right, rgba(16, 185, 129, 0.18) 0, rgba(16, 185, 129, 0.18) max(0px, calc(100% - 4rem)), transparent 100%)',
} as const

/** Fields allowed by PATCH /api/leads/contacts/:id — use SpaceCell editors for these only. */
const CONTACT_LIST_EDITABLE_FIELD_IDS = new Set([
  'email',
  'phone',
  'first_name',
  'last_name',
  'tags',
  'business_name',
  'website',
  'address',
  'city',
  'state',
  'country',
  'contact_type',
  'contact_source',
])

/** Inline text fields that save on blur instead of every keystroke. */
const INLINE_TEXT_FIELD_IDS = new Set([
  'first_name',
  'last_name',
  'business_name',
  'address',
  'city',
  'state',
  'country',
])

function readContactFieldValue(row: CrmContactRow, field: FieldDef): unknown {
  if (field.id === 'title') {
    const full = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(' ')
    return full || row.email
  }
  if (field.id === 'tags') return row.tags ?? []
  if (field.id === 'contact_type') {
    const v = row.contact_type
    return v ? [v] : []
  }
  if (field.id === 'contact_source') {
    const v = row.contact_source
    return v ? [v] : []
  }
  const key = field.id as keyof CrmContactRow
  if (key in row) return row[key]
  return null
}

function isContactListEditableField(fieldId: string): boolean {
  return CONTACT_LIST_EDITABLE_FIELD_IDS.has(fieldId)
}

interface ContactsSpaceListProps {
  rows: CrmContactRow[]
  view: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onOpenAddColumn: (e: React.MouseEvent<HTMLButtonElement>) => void
  onRowOpen: (id: string) => void
  onContactFieldSave: (contactId: string, fieldId: string, value: unknown) => Promise<void>
  onCreateTagOption: (option: SelectOption) => void
  onUpdateTagOption: (optionId: string, updates: Partial<SelectOption>) => void
  onDeleteTagOption: (optionId: string) => void
  onCreateContactTypeOption: (option: SelectOption) => void
  onUpdateContactTypeOption: (optionId: string, updates: Partial<SelectOption>) => void
  onDeleteContactTypeOption: (optionId: string) => void
}

export function ContactsSpaceList({
  rows,
  view,
  onViewPatch,
  onOpenAddColumn,
  onRowOpen,
  onContactFieldSave,
  onCreateTagOption,
  onUpdateTagOption,
  onDeleteTagOption,
  onCreateContactTypeOption,
  onUpdateContactTypeOption,
  onDeleteContactTypeOption,
}: ContactsSpaceListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const visibleFieldDefs = useMemo(
    () => buildContactVisibleFieldDefs(view.visible_fields),
    [view.visible_fields],
  )

  const displayCols = useMemo(() => displayColumnsForList(visibleFieldDefs), [visibleFieldDefs])

  const [localWidths, setLocalWidths] = useState<Record<string, number>>(
    () => view.column_widths ?? {},
  )

  const columnWidths = useMemo(() => {
    const merged: Record<string, number> = {}
    for (const f of displayCols) {
      merged[f.id] = localWidths[f.id] ?? (f.id === 'title' ? 220 : getDefaultWidth(f.id))
    }
    return merged
  }, [displayCols, localWidths])

  const gridTemplateColumns = useMemo(
    () => displayCols.map((f) => `${columnWidths[f.id]}px`).join(' ') + ' minmax(2rem, 1fr)',
    [displayCols, columnWidths],
  )

  const handleColumnResize = useCallback((fieldId: string, width: number) => {
    setLocalWidths((prev) => ({ ...prev, [fieldId]: width }))
  }, [])

  const persistWidths = useCallback(() => {
    void onViewPatch({ column_widths: { ...localWidths } })
  }, [localWidths, onViewPatch])

  const itemIds = useMemo(() => rows.map((r) => r.id), [rows])

  const selectAllInTitleColumn = useMemo(() => {
    if (itemIds.length === 0) return null
    const n = itemIds.filter((id) => selectedIds.has(id)).length
    const all = n === itemIds.length
    const some = n > 0 && !all
    return {
      checked: all,
      indeterminate: some,
      onToggle: () => {
        if (all) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            itemIds.forEach((id) => next.delete(id))
            return next
          })
        } else {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            itemIds.forEach((id) => next.add(id))
            return next
          })
        }
      },
    }
  }, [itemIds, selectedIds])

  const selectAllHeaderOn =
    selectAllInTitleColumn != null &&
    (selectAllInTitleColumn.checked || selectAllInTitleColumn.indeterminate)

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const cc = view.contacts_config ?? {}

  const tagOptions: SelectOption[] = useMemo(() => {
    const schema = cc.tag_options ?? []
    const schemaIds = new Set(schema.map((o) => o.id))
    const extras: SelectOption[] = []
    for (const r of rows) {
      for (const t of r.tags ?? []) {
        if (!schemaIds.has(t)) {
          schemaIds.add(t)
          extras.push({ id: t, label: t, color: 'blue' })
        }
      }
    }
    return [...schema, ...extras]
  }, [cc.tag_options, rows])

  const contactTypeOptions: SelectOption[] = useMemo(() => {
    const schema = cc.contact_type_options ?? []
    const schemaIds = new Set(schema.map((o) => o.id))
    const extras: SelectOption[] = []
    for (const r of rows) {
      const ct = r.contact_type
      if (ct && !schemaIds.has(ct)) {
        schemaIds.add(ct)
        extras.push({
          id: ct,
          label: ct,
          color: ct === 'lead' ? 'yellow' : ct === 'customer' ? 'green' : 'gray',
        })
      }
    }
    if (!schemaIds.has('lead')) extras.push({ id: 'lead', label: 'lead', color: 'yellow' })
    if (!schemaIds.has('customer'))
      extras.push({ id: 'customer', label: 'customer', color: 'green' })
    return [...schema, ...extras]
  }, [cc.contact_type_options, rows])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" onMouseUp={persistWidths}>
      <div className="flex min-w-max flex-1 flex-col">
        <div className="sticky top-0 z-20 flex shrink-0 flex-col bg-[var(--background)]">
          <div className="group/spacehead sticky left-0 z-30 flex w-full min-w-0 flex-col bg-[var(--background)]">
            <div className="flex w-full min-w-0 items-stretch">
              <div
                className={cn(
                  'relative sticky left-0 z-30 flex w-10 shrink-0 items-center',
                  'pb-1.5 pl-[21px] pt-1',
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 z-0 bg-[var(--background)]"
                  aria-hidden
                />
                {selectAllInTitleColumn && rows.length > 0 && (
                  <div
                    className={cn(
                      'relative z-[1] shrink-0 transition-opacity duration-0',
                      selectAllHeaderOn
                        ? 'opacity-100'
                        : 'opacity-0 group-hover/spacehead:opacity-100',
                    )}
                  >
                    <SpaceListHeaderCheckbox
                      checked={selectAllInTitleColumn.checked}
                      indeterminate={selectAllInTitleColumn.indeterminate}
                      onToggle={selectAllInTitleColumn.onToggle}
                    />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center pr-4">
                <DraggableColumnHeaders
                  visibleFields={displayCols}
                  listLayout="grouped"
                  compact
                  indented
                  selectAllInTitleColumn={null}
                  columnWidths={columnWidths}
                  onColumnResize={handleColumnResize}
                  onReorder={async (newIds: string[]) => {
                    await onViewPatch({
                      visible_fields: normalizeContactVisibleFieldOrderIds(newIds),
                    })
                    toast.success('View saved')
                  }}
                  onAddField={onOpenAddColumn}
                  surface="list"
                />
              </div>
            </div>
            <div className="flex w-full min-w-0" aria-hidden>
              <div className="sticky left-0 z-[35] h-[0.5px] w-10 shrink-0 bg-[var(--background)]" />
              <div className="mr-4 h-[0.5px] min-h-[0.5px] min-w-0 flex-1 bg-[var(--border)]" />
            </div>
          </div>
        </div>

        <div className={cn('flex-1', 'divide-y divide-[var(--border)]')}>
          {rows.map((row) => (
            <ContactSpaceListRow
              key={row.id}
              row={row}
              displayCols={displayCols}
              gridTemplateColumns={gridTemplateColumns}
              selected={selectedIds.has(row.id)}
              onToggleSelect={toggleSelect}
              onOpen={() => onRowOpen(row.id)}
              onContactFieldSave={onContactFieldSave}
              tagOptions={tagOptions}
              contactTypeOptions={contactTypeOptions}
              onCreateTagOption={onCreateTagOption}
              onUpdateTagOption={onUpdateTagOption}
              onDeleteTagOption={onDeleteTagOption}
              onCreateContactTypeOption={onCreateContactTypeOption}
              onUpdateContactTypeOption={onUpdateContactTypeOption}
              onDeleteContactTypeOption={onDeleteContactTypeOption}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ContactSpaceListRow({
  row,
  displayCols,
  gridTemplateColumns,
  selected,
  onToggleSelect,
  onOpen,
  onContactFieldSave,
  tagOptions,
  contactTypeOptions,
  onCreateTagOption,
  onUpdateTagOption,
  onDeleteTagOption,
  onCreateContactTypeOption,
  onUpdateContactTypeOption,
  onDeleteContactTypeOption,
}: {
  row: CrmContactRow
  displayCols: FieldDef[]
  gridTemplateColumns: string
  selected: boolean
  onToggleSelect: (id: string) => void
  onOpen: () => void
  onContactFieldSave: (contactId: string, fieldId: string, value: unknown) => Promise<void>
  tagOptions: SelectOption[]
  contactTypeOptions: SelectOption[]
  onCreateTagOption: (option: SelectOption) => void
  onUpdateTagOption: (optionId: string, updates: Partial<SelectOption>) => void
  onDeleteTagOption: (optionId: string) => void
  onCreateContactTypeOption: (option: SelectOption) => void
  onUpdateContactTypeOption: (optionId: string, updates: Partial<SelectOption>) => void
  onDeleteContactTypeOption: (optionId: string) => void
}) {
  const isSelected = selected

  const saveField = useCallback(
    (fieldId: string, value: unknown) => onContactFieldSave(row.id, fieldId, value),
    [onContactFieldSave, row.id],
  )

  const handleCreateTag = useCallback(
    (_fieldId: string, option: SelectOption) => {
      onCreateTagOption(option)
      const currentTags = row.tags ?? []
      void onContactFieldSave(row.id, 'tags', [...currentTags, option.label])
    },
    [onContactFieldSave, onCreateTagOption, row.id, row.tags],
  )

  const handleUpdateTag = useCallback(
    (_fieldId: string, optionId: string, updates: Partial<SelectOption>) => {
      onUpdateTagOption(optionId, updates)
    },
    [onUpdateTagOption],
  )

  const handleDeleteTag = useCallback(
    (_fieldId: string, optionId: string) => {
      onDeleteTagOption(optionId)
    },
    [onDeleteTagOption],
  )

  const handleCreateContactType = useCallback(
    (_fieldId: string, option: SelectOption) => {
      onCreateContactTypeOption(option)
      void onContactFieldSave(row.id, 'contact_type', option.label)
    },
    [onContactFieldSave, onCreateContactTypeOption, row.id],
  )

  const handleUpdateContactType = useCallback(
    (_fieldId: string, optionId: string, updates: Partial<SelectOption>) => {
      onUpdateContactTypeOption(optionId, updates)
    },
    [onUpdateContactTypeOption],
  )

  const handleDeleteContactType = useCallback(
    (_fieldId: string, optionId: string) => {
      onDeleteContactTypeOption(optionId)
    },
    [onDeleteContactTypeOption],
  )

  return (
    <div className="group/row relative">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-none',
          isSelected
            ? SPACE_LIST_ROW_SELECTED_TINT
            : 'group-hover/row:bg-[var(--color-hover-subtle)]',
        )}
        aria-hidden
      />
      <div className="relative flex items-stretch">
        <GroupedRowGripColumn
          itemId={row.id}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          surface="list"
        />
        <div className="flex-1 pr-4">
          <div
            tabIndex={0}
            className="group grid cursor-pointer items-stretch gap-0"
            style={{ gridTemplateColumns }}
            onClick={(e) => {
              const target = e.target as HTMLElement
              if (
                target.closest('button, a, input, select, textarea, [data-dropdown], [data-cell]')
              ) {
                return
              }
              onOpen()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                const t = e.target as HTMLElement
                if (t.closest('input, select, textarea, button, [data-cell], [data-dropdown]'))
                  return
                e.preventDefault()
                onOpen()
              }
            }}
          >
            {displayCols.map((field) => {
              if (field.id === 'title') {
                return (
                  <div
                    key={`${row.id}:title`}
                    className="sticky left-10 z-30 flex min-w-0 items-stretch py-0.5"
                  >
                    {isSelected ? (
                      <div
                        className="pointer-events-none absolute inset-0 z-[1] transition-none"
                        style={{ background: NAME_COL_RIGHT_MASK.selected }}
                        aria-hidden
                      />
                    ) : (
                      <>
                        <div
                          className="pointer-events-none absolute inset-0 z-0 transition-none"
                          style={{ background: NAME_COL_RIGHT_MASK.base }}
                          aria-hidden
                        />
                        <div
                          className={cn(
                            'pointer-events-none absolute inset-0 z-[1] opacity-0 transition-none',
                            'group-hover/row:opacity-100',
                          )}
                          style={{ background: NAME_COL_RIGHT_MASK.hover }}
                          aria-hidden
                        />
                      </>
                    )}
                    <div className="relative z-[2] flex min-w-0 flex-1 items-center">
                      <div className="flex min-w-0 flex-1 items-center self-stretch pl-1.5">
                        <SpaceCell
                          field={field}
                          value={readContactFieldValue(row, field)}
                          readonly
                          nameAsListOpenTarget
                          nameListHoverGroup="row"
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                )
              }

              const editable = isContactListEditableField(field.id)
              const cellValue = readContactFieldValue(row, field)

              if (field.id === 'notes') {
                return (
                  <div
                    key={`${row.id}:notes`}
                    className="space-cell-hover min-w-0 cursor-pointer overflow-hidden"
                    data-cell
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ContactNoteCell
                      contactId={row.id}
                      latestNotePreview={row.latest_note_preview ?? null}
                    />
                  </div>
                )
              }

              if (editable && INLINE_TEXT_FIELD_IDS.has(field.id)) {
                return (
                  <div
                    key={`${row.id}:${field.id}`}
                    className="space-cell-hover min-w-0 cursor-pointer overflow-hidden"
                    data-cell
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ContactInlineTextCell
                      value={typeof cellValue === 'string' ? cellValue : ''}
                      fieldId={field.id}
                      onSave={(next) => void saveField(field.id, next)}
                    />
                  </div>
                )
              }

              if (editable) {
                const isMultiSelectField =
                  field.id === 'tags' ||
                  field.id === 'contact_type' ||
                  field.id === 'contact_source'
                const enrichedField = isMultiSelectField
                  ? {
                      ...field,
                      options:
                        field.id === 'tags'
                          ? tagOptions
                          : field.id === 'contact_type'
                            ? contactTypeOptions
                            : CONTACT_SOURCE_OPTIONS,
                    }
                  : field
                const multiValue = isMultiSelectField ? cellValue : cellValue

                return (
                  <div
                    key={`${row.id}:${field.id}`}
                    className="space-cell-hover min-w-0 cursor-pointer overflow-hidden"
                    data-cell
                    onPointerDown={(e) => {
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const btn = (e.currentTarget as HTMLElement).querySelector('button')
                      if (btn && e.target === e.currentTarget) btn.click()
                    }}
                  >
                    <SpaceCell
                      field={enrichedField}
                      value={multiValue}
                      roster={[]}
                      currentUserId={null}
                      onCreateOption={
                        field.id === 'tags'
                          ? handleCreateTag
                          : field.id === 'contact_type'
                            ? handleCreateContactType
                            : undefined
                      }
                      onUpdateOption={
                        field.id === 'tags'
                          ? handleUpdateTag
                          : field.id === 'contact_type'
                            ? handleUpdateContactType
                            : undefined
                      }
                      onDeleteOption={
                        field.id === 'tags'
                          ? handleDeleteTag
                          : field.id === 'contact_type'
                            ? handleDeleteContactType
                            : undefined
                      }
                      onChange={(next) => {
                        if (field.id === 'tags' && Array.isArray(next)) {
                          const labels = (next as string[]).map(
                            (id) => tagOptions.find((o) => o.id === id)?.label ?? id,
                          )
                          void saveField('tags', labels)
                          return
                        }
                        if (field.id === 'contact_type' && Array.isArray(next)) {
                          const selected = next as string[]
                          const label =
                            contactTypeOptions.find((o) => o.id === selected[selected.length - 1])
                              ?.label ??
                            selected[selected.length - 1] ??
                            ''
                          void saveField('contact_type', label)
                          return
                        }
                        if (field.id === 'contact_source' && Array.isArray(next)) {
                          const selected = next as string[]
                          void saveField('contact_source', selected[selected.length - 1] ?? null)
                          return
                        }
                        void saveField(field.id, next)
                      }}
                    />
                  </div>
                )
              }

              return (
                <div
                  key={`${row.id}:${field.id}`}
                  className="space-cell-hover min-w-0 cursor-pointer overflow-hidden"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const t = e.target as HTMLElement
                    if (t.closest('a, button, input, select, textarea')) return
                    onOpen()
                  }}
                >
                  <SpaceCell
                    field={field}
                    value={cellValue}
                    roster={[]}
                    currentUserId={null}
                    readonly
                    onChange={() => {}}
                  />
                </div>
              )
            })}
            <div className="min-w-0" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  )
}

const INLINE_FIELD_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  business_name: Building2,
  address: MapPinned,
  city: MapPin,
  state: Flag,
  country: Globe2,
}

function ContactInlineTextCell({
  value,
  fieldId,
  onSave,
}: {
  value: string
  fieldId: string
  onSave: (next: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const savedRef = useRef(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const Icon = INLINE_FIELD_ICON[fieldId] ?? null
  const empty = !draft.trim()

  useEffect(() => {
    if (value !== savedRef.current) {
      savedRef.current = value
      setDraft(value)
    }
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== savedRef.current) {
      savedRef.current = trimmed
      onSave(trimmed)
    }
  }, [draft, onSave])

  if (empty && !editing) {
    return (
      <button
        type="button"
        className="flex h-7 w-full min-w-0 cursor-text items-center text-left"
        onPointerDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setEditing(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      autoFocus={editing}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          inputRef.current?.blur()
        }
      }}
      className="h-7 w-full min-w-0 bg-transparent text-sm text-[var(--foreground)] outline-none"
    />
  )
}

function noteListPreview(content: string): string {
  return content.replace(/\s+/g, ' ').trim()
}

function ContactNoteCell({
  contactId,
  latestNotePreview,
}: {
  contactId: string
  latestNotePreview: string | null
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [listNoteCardTint, setListNoteCardTint] = useState<NoteCardTintId | null>(null)
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState<string | null>(latestNotePreview)
  const wrapRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('[data-note-color-menu]')) return
      if (wrapRef.current && !wrapRef.current.contains(el)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    setPreview(latestNotePreview)
  }, [latestNotePreview])

  const previewText = preview ? noteListPreview(preview) : ''

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await addContactNote(contactId, text, listNoteCardTint)
      setPreview(text)
      setDraft('')
      setListNoteCardTint(null)
      setOpen(false)
      toast.success('Note added')
    } finally {
      setSending(false)
    }
  }, [contactId, draft, listNoteCardTint, sending])

  return (
    <div ref={wrapRef} className="relative flex h-7 items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-7 w-full min-w-0 max-w-full items-center gap-1.5 text-left text-xs transition-colors',
          open
            ? 'text-[var(--foreground)]'
            : previewText
              ? 'text-[var(--foreground)]'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
        )}
        title={previewText || 'Add note'}
      >
        <FileText
          className={`h-3.5 w-3.5 shrink-0 ${previewText ? 'text-[var(--foreground)]' : ''}`}
        />
        {previewText ? (
          <span
            className="min-w-0 flex-1 truncate text-xs text-[var(--foreground)]"
            title={previewText}
          >
            {previewText}
          </span>
        ) : (
          <span className="truncate">Add note</span>
        )}
      </button>
      {open && (
        <div className="dropdown-menu-solid absolute left-0 top-full z-[100001] mt-1 w-72 rounded-xl p-2 shadow-lg">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Write a note…"
            rows={3}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">Color</span>
            <NoteColorPicker
              value={listNoteCardTint}
              onChange={setListNoteCardTint}
              variant="square"
              placement="up"
              disabled={sending}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              Enter to send · Shift+Enter for newline
            </span>
            <button
              type="button"
              disabled={!draft.trim() || sending}
              onClick={() => void handleSend()}
              className="inline-flex h-6 items-center gap-1 rounded-md bg-[var(--color-primary)] px-2 text-[10px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
