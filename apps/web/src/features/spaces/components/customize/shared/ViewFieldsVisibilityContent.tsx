'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Clock,
  Contact,
  DollarSign,
  Hash,
  Image,
  Link,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Rocket,
  Search,
  Star,
  Tags,
  Timer,
  Type,
  User,
  X,
} from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { cn } from '@/lib/utils/cn'
import {
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  isSpaceFieldVisibleInUi,
  type FieldDef,
  type FieldType,
  type SpaceSchema,
  type ViewDef,
} from '../../../types/space-schema'

const FIELD_TYPE_ICON: Record<FieldType, ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  select: CircleDot,
  multi_select: Tags,
  date: Calendar,
  url: Link,
  media: Image,
  assignee: User,
  contact: Contact,
  checkbox: CheckSquare,
  currency: DollarSign,
  email: Mail,
  phone: Phone,
  rating: Star,
  progress: BarChart3,
  duration: Timer,
  created_at: Clock,
  updated_at: RefreshCw,
  mission: Rocket,
}

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  multi_select: 'Multi-select',
  date: 'Date',
  url: 'URL',
  media: 'Media',
  assignee: 'People',
  contact: 'Contact',
  checkbox: 'Checkbox',
  currency: 'Currency',
  email: 'Email',
  phone: 'Phone',
  rating: 'Rating',
  progress: 'Progress',
  duration: 'Duration',
  created_at: 'Created',
  updated_at: 'Updated',
  mission: 'Mission',
}

function SectionHeader({
  label,
  collapsed,
  onToggleCollapsed,
  actionLabel,
  onAction,
  className,
}: {
  label: string
  collapsed: boolean
  onToggleCollapsed: () => void
  actionLabel: string
  onAction: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 -mx-2 flex items-center justify-between bg-[var(--background)] px-2 py-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        aria-expanded={!collapsed}
      >
        <span className="body-3 font-medium">{label}</span>
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform', collapsed && '-rotate-90')}
          aria-hidden
        />
      </button>
      <button
        type="button"
        onClick={onAction}
        className="body-3 rounded-md px-2 py-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
      >
        {actionLabel}
      </button>
    </div>
  )
}

function FieldRow({
  field,
  on,
  locked,
  onToggle,
  onEdit,
}: {
  field: FieldDef
  on: boolean
  locked?: boolean
  onToggle: () => void
  onEdit?: (field: FieldDef) => void
}) {
  const Icon = FIELD_TYPE_ICON[field.type] ?? Type
  const canEdit = Boolean(onEdit) && !field.system
  return (
    <div className="group/field-row flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="body-3 truncate text-[var(--foreground)]">{field.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(field)
            }}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] group-hover/field-row:opacity-100"
            aria-label={`Edit ${field.name}`}
          >
            <Pencil className="h-3 w-3" />
          </button>
        ) : null}
        <Switch checked={on} onCheckedChange={onToggle} disabled={locked} />
      </div>
    </div>
  )
}

/** Shared with task modal: same field visibility UI as the customize panel Fields sub-view. */
export function ViewFieldsVisibilityContent({
  schema,
  activeView,
  onViewPatch,
  className,
  autoFocusSearch = true,
  searchQuery: controlledSearch,
  onSearchChange,
  hideSearchInput = false,
  onEditField,
}: {
  schema: SpaceSchema
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>
  className?: string
  autoFocusSearch?: boolean
  /** Optional controlled search; when provided, internal search is replaced. */
  searchQuery?: string
  onSearchChange?: (next: string) => void
  /** When true, the internal search bar is hidden (caller renders one above). */
  hideSearchInput?: boolean
  /** When provided, hovering a non-system field row reveals a pencil edit button. */
  onEditField?: (field: FieldDef) => void
}) {
  const [internalSearch, setInternalSearch] = useState('')
  const search = controlledSearch ?? internalSearch
  const [shownCollapsed, setShownCollapsed] = useState(false)
  const [hiddenCollapsed, setHiddenCollapsed] = useState(false)
  const setSearch = useCallback(
    (next: string) => {
      if (onSearchChange) onSearchChange(next)
      else setInternalSearch(next)
    },
    [onSearchChange],
  )
  const searchRef = useRef<HTMLInputElement>(null)

  const uiFields = useMemo(() => schema.fields.filter(isSpaceFieldVisibleInUi), [schema.fields])
  const fallbackVisibleIds = useMemo(
    () =>
      DEFAULT_TASK_VISIBLE_FIELD_IDS.filter((fieldId) =>
        uiFields.some((field) => field.id === fieldId),
      ),
    [uiFields],
  )
  const [localVisibleIds, setLocalVisibleIds] = useState<string[]>(
    () => activeView.visible_fields ?? fallbackVisibleIds,
  )
  useEffect(() => {
    setLocalVisibleIds(activeView.visible_fields ?? fallbackVisibleIds)
  }, [activeView.id, activeView.visible_fields, fallbackVisibleIds])
  const visibleSet = useMemo(() => new Set(localVisibleIds), [localVisibleIds])
  const shownFields = useMemo(
    () => uiFields.filter((f) => visibleSet.has(f.id)),
    [uiFields, visibleSet],
  )
  const hiddenFields = useMemo(
    () => uiFields.filter((f) => !visibleSet.has(f.id)),
    [uiFields, visibleSet],
  )

  const fieldMatchesQuery = useCallback((f: FieldDef, q: string) => {
    if (!q) return true
    const n = f.name.toLowerCase()
    const typeLabel = FIELD_TYPE_LABEL[f.type].toLowerCase()
    return n.includes(q) || typeLabel.includes(q)
  }, [])

  const filteredShown = useMemo(() => {
    if (!search) return shownFields
    const q = search.toLowerCase()
    return shownFields.filter((f) => fieldMatchesQuery(f, q))
  }, [shownFields, search, fieldMatchesQuery])

  const filteredHidden = useMemo(() => {
    if (!search) return hiddenFields
    const q = search.toLowerCase()
    return hiddenFields.filter((f) => fieldMatchesQuery(f, q))
  }, [hiddenFields, search, fieldMatchesQuery])

  const sortedFilteredShown = useMemo(
    () => [...filteredShown].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredShown],
  )
  const sortedFilteredHidden = useMemo(
    () => [...filteredHidden].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredHidden],
  )

  useEffect(() => {
    if (!autoFocusSearch || hideSearchInput) return
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [autoFocusSearch, hideSearchInput])

  function toggleField(fieldId: string) {
    const current = localVisibleIds
    const isVisible = current.includes(fieldId)
    const next = isVisible ? current.filter((id) => id !== fieldId) : [...current, fieldId]
    setLocalVisibleIds(next)
    void onViewPatch({ visible_fields: next })
  }

  function showAllFields() {
    const next = uiFields.map((f) => f.id)
    setLocalVisibleIds(next)
    void onViewPatch({ visible_fields: next })
  }

  function hideAllFields() {
    const next = uiFields.filter((f) => f.id === 'title' || f.id === 'status').map((f) => f.id)
    setLocalVisibleIds(next)
    void onViewPatch({ visible_fields: next })
  }

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden', className)}>
      {hideSearchInput ? null : (
        <div className="shrink-0 border-b border-[var(--border)] px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <SectionHeader
          label="Shown"
          collapsed={shownCollapsed}
          onToggleCollapsed={() => setShownCollapsed((c) => !c)}
          actionLabel="Hide all"
          onAction={hideAllFields}
        />
        {!shownCollapsed && (
          <div className="space-y-0.5">
            {sortedFilteredShown.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                on
                locked={field.id === 'title'}
                onToggle={() => toggleField(field.id)}
                onEdit={onEditField}
              />
            ))}
            {filteredShown.length === 0 && (
              <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching fields</p>
            )}
          </div>
        )}

        <SectionHeader
          label="Hidden"
          collapsed={hiddenCollapsed}
          onToggleCollapsed={() => setHiddenCollapsed((c) => !c)}
          actionLabel="Show all"
          onAction={showAllFields}
          className="mt-2"
        />
        {!hiddenCollapsed && (
          <div className="space-y-0.5">
            {sortedFilteredHidden.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                on={false}
                onToggle={() => toggleField(field.id)}
                onEdit={onEditField}
              />
            ))}
            {filteredHidden.length === 0 && !search && (
              <p className="body-3 py-2 text-[var(--color-muted-foreground)]">
                All fields are shown
              </p>
            )}
            {filteredHidden.length === 0 && search && (
              <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching fields</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
