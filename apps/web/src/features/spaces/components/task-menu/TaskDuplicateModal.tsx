'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { DuplicateSpaceItemInclude } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import type { FieldDef, SpaceSchema } from '../../types/space-schema'

type BoolKey = Exclude<keyof DuplicateSpaceItemInclude, 'custom_field_ids'>

interface BoolRow {
  key: BoolKey
  label: string
  description?: string
}

interface CustomFieldRow {
  id: string
  label: string
}

function defaultDuplicateTitle(source: string | null | undefined): string {
  const base = typeof source === 'string' && source.trim().length > 0 ? source.trim() : 'Untitled'
  return `${base} (copy)`
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function customDataValueIsPresent(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

function fieldsRows(task: SpaceItem): BoolRow[] {
  const rows: BoolRow[] = [{ key: 'status', label: 'Status' }]
  if (task.priority) rows.push({ key: 'priority', label: 'Priority' })
  if (task.assignees?.length || task.assignee_id)
    rows.push({ key: 'assignees', label: 'Assignees' })
  if (task.start_date) rows.push({ key: 'start_date', label: 'Start date' })
  if (task.due_date) rows.push({ key: 'due_date', label: 'Due date' })
  if (hasText(task.description)) rows.push({ key: 'description', label: 'Description' })
  if (hasText(task.notes)) rows.push({ key: 'notes', label: 'Notes' })
  return rows
}

function customFieldRows(task: SpaceItem, schema: SpaceSchema | null): CustomFieldRow[] {
  const customData = (task.custom_data ?? {}) as Record<string, unknown>
  const fieldsById = new Map<string, FieldDef>(
    (schema?.fields ?? []).map((field) => [field.id, field]),
  )
  const rows: CustomFieldRow[] = []
  for (const [id, value] of Object.entries(customData)) {
    if (!customDataValueIsPresent(value)) continue
    const def = fieldsById.get(id)
    const label = def?.name ?? prettifyKey(id)
    rows.push({ id, label })
  }
  rows.sort((a, b) => a.label.localeCompare(b.label))
  return rows
}

function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function activityRows(task: SpaceItem, subtaskCount: number): BoolRow[] {
  const rows: BoolRow[] = []
  if (subtaskCount > 0) rows.push({ key: 'subtasks', label: `Subtasks (${subtaskCount})` })
  if (task.recurrence) {
    rows.push({
      key: 'recurrence',
      label: 'Recurrence',
      description: 'Due date is included automatically when recurrence is selected.',
    })
  }
  if (task.linked_mission_id) {
    rows.push({
      key: 'mission',
      label: 'Linked mission',
      description: 'Points the copy at the same mission, not a new mission.',
    })
  }
  rows.push(
    {
      key: 'comments',
      label: 'Comments',
      description: 'Comment text, mentions, and link previews.',
    },
    {
      key: 'documents',
      label: 'Documents',
      description: 'File attachments uploaded inside comments.',
    },
    { key: 'deliverables', label: 'Agent outputs / deliverables' },
  )
  return rows
}

function buildInitialInclude(
  fields: BoolRow[],
  custom: CustomFieldRow[],
  activity: BoolRow[],
): DuplicateSpaceItemInclude {
  const include: DuplicateSpaceItemInclude = {}
  for (const row of fields) include[row.key] = true
  for (const row of activity) include[row.key] = true
  if (custom.length > 0) include.custom_field_ids = custom.map((c) => c.id)
  return include
}

export function TaskDuplicateModal({
  open,
  task,
  subtaskCount,
  onClose,
  onSubmit,
}: {
  open: boolean
  task: SpaceItem
  subtaskCount?: number
  onClose: () => void
  onSubmit: (payload: { include: DuplicateSpaceItemInclude; title: string }) => Promise<void>
}) {
  const schema = useSpacesStore(
    (s) => s.spaces.find((sp) => sp.id === task.space_id)?.schema ?? null,
  )

  const fields = useMemo(() => fieldsRows(task), [task])
  const custom = useMemo(() => customFieldRows(task, schema), [task, schema])
  const activity = useMemo(() => activityRows(task, subtaskCount ?? 0), [task, subtaskCount])

  const [include, setInclude] = useState<DuplicateSpaceItemInclude>(() =>
    buildInitialInclude(fields, custom, activity),
  )
  const [draftTitle, setDraftTitle] = useState(() => defaultDuplicateTitle(task.title))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setInclude(buildInitialInclude(fields, custom, activity))
    setDraftTitle(defaultDuplicateTitle(task.title))
    setSubmitting(false)
  }, [open, task.title, fields, custom, activity])

  const setBool = (key: BoolKey, checked: boolean) => {
    setInclude((current) => ({ ...current, [key]: checked }))
  }

  const setCustomField = (fieldId: string, checked: boolean) => {
    setInclude((current) => {
      const list = new Set(current.custom_field_ids ?? [])
      if (checked) list.add(fieldId)
      else list.delete(fieldId)
      return { ...current, custom_field_ids: [...list] }
    })
  }

  const titleTrimmed = draftTitle.trim()
  const canSubmit = titleTrimmed.length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onSubmit({ include, title: titleTrimmed })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const customSelected = new Set(include.custom_field_ids ?? [])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && !submitting && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0 bg-modal-overlay" />
        <DialogPrimitive.Content
          data-task-menu
          className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center"
        >
          <div className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden border bg-[var(--color-card)] shadow-2xl">
            <div className="px-spacing-5 pt-spacing-5 pb-spacing-4 border-border shrink-0 border-b">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    Duplicate task
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                    Choose what to include on the copy.
                  </DialogPrimitive.Description>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="body-3 text-foreground mt-spacing-3 placeholder:text-muted-foreground hover:bg-hover-subtle focus-visible:bg-hover-subtle w-full cursor-text rounded-md border-0 border-transparent bg-transparent px-2 py-1 text-left outline-none ring-0 transition-colors focus:ring-0"
                    placeholder="Untitled task"
                    spellCheck
                    aria-label="Title for the duplicate task"
                  />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="btn-icon-bare shrink-0 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-5 py-spacing-4 min-h-0 flex-1 overflow-y-auto">
              <Section title="Fields">
                {fields.map((row) => (
                  <CheckboxRow
                    key={row.key}
                    label={row.label}
                    description={row.description}
                    checked={include[row.key] === true}
                    onChange={(checked) => setBool(row.key, checked)}
                  />
                ))}
              </Section>

              {custom.length > 0 ? (
                <Section title="Custom fields">
                  {custom.map((row) => (
                    <CheckboxRow
                      key={row.id}
                      label={row.label}
                      checked={customSelected.has(row.id)}
                      onChange={(checked) => setCustomField(row.id, checked)}
                    />
                  ))}
                </Section>
              ) : null}

              <Section title="Activity & relations">
                {activity.map((row) => (
                  <CheckboxRow
                    key={row.key}
                    label={row.label}
                    description={row.description}
                    checked={include[row.key] === true}
                    onChange={(checked) => setBool(row.key, checked)}
                  />
                ))}
              </Section>
            </div>

            <div className="border-border px-spacing-5 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-end border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit}
                className="button-glass-accent px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {submitting ? 'Duplicating…' : 'Duplicate'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-spacing-4 last:mb-0">
      <p className="body-4 text-muted-foreground mb-spacing-2 font-medium uppercase tracking-wide">
        {title}
      </p>
      <div className="space-y-spacing-2">{children}</div>
    </div>
  )
}

function CheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="border-border rounded-spacing-2 hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-3 flex cursor-pointer items-start border transition-colors">
      <input
        type="checkbox"
        className="checkbox-glass-green mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="body-3 text-foreground block font-medium">{label}</span>
        {description ? (
          <span className="body-4 text-muted-foreground block">{description}</span>
        ) : null}
      </span>
    </label>
  )
}
