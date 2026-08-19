'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, GripVertical, Plus, Trash2, X } from 'lucide-react'
import type { FieldDef, FieldType, SelectOption, ViewDef } from '../../../../types/space-schema'
import { findCreatableType } from './field-type-catalog'
import { useFieldMutations } from './use-field-mutations'

type Mode = { kind: 'create'; type: FieldType } | { kind: 'edit'; field: FieldDef }

interface FieldEditorProps {
  mode: Mode
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>
  onBack: () => void
  onClose: () => void
  /** After create/save returns to. If 'existing', also flips field on in `visible_fields`. */
  onAfterCreate: () => void
  /** Called when the user deletes the field. */
  onAfterDelete: () => void
}

function makeOptionId(): string {
  return `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

const DEFAULT_OPTION_COLORS = ['purple', 'blue', 'green', 'orange', 'red', 'cyan', 'yellow']

export function FieldEditor({
  mode,
  activeView,
  onViewPatch,
  onBack,
  onClose,
  onAfterCreate,
  onAfterDelete,
}: FieldEditorProps) {
  const mutations = useFieldMutations()

  const initialName = mode.kind === 'edit' ? mode.field.name : ''
  const initialType = mode.kind === 'edit' ? mode.field.type : mode.type
  const meta = findCreatableType(initialType)

  const initialOptions: SelectOption[] = useMemo(() => {
    if (mode.kind === 'edit') return mode.field.options ?? []
    return [
      { id: makeOptionId(), label: 'Option 1', color: DEFAULT_OPTION_COLORS[0] },
      { id: makeOptionId(), label: 'Option 2', color: DEFAULT_OPTION_COLORS[1] },
    ]
  }, [mode])

  const [name, setName] = useState(initialName)
  const [options, setOptions] = useState<SelectOption[]>(initialOptions)
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 60)
  }, [])

  const TypeIcon = meta?.icon
  const typeLabel = meta?.label ?? initialType
  const showOptions = meta?.hasOptions ?? false

  const isEditingSystem = mode.kind === 'edit' && mode.field.system === true
  const canDelete = mode.kind === 'edit' && !isEditingSystem

  async function handleSubmit() {
    if (busy) return
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      if (mode.kind === 'create') {
        const created = await mutations.createField({
          name: trimmed,
          type: mode.type,
          options: showOptions ? options.filter((o) => o.label.trim()) : undefined,
          activeView,
          onViewPatch,
        })
        if (created) onAfterCreate()
      } else {
        await mutations.renameField(mode.field.id, trimmed)
        if (showOptions) {
          await mutations.updateFieldOptions(
            mode.field.id,
            options.filter((o) => o.label.trim()),
          )
        }
        onAfterCreate()
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (mode.kind !== 'edit' || isEditingSystem) return
    setBusy(true)
    try {
      await mutations.deleteField(mode.field.id)
      onAfterDelete()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {TypeIcon ? (
            <TypeIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          ) : null}
          <span className="body-3 font-semibold text-[var(--foreground)]">{typeLabel}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <label className="block space-y-1.5">
          <span className="body-4 font-medium text-[var(--color-muted-foreground)]">
            Field name <span className="text-destructive">*</span>
          </span>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit()
            }}
            placeholder="Enter name..."
            disabled={isEditingSystem}
            className="body-3 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] px-3 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {showOptions ? (
          <div className="space-y-1.5">
            <span className="body-4 block font-medium text-[var(--color-muted-foreground)]">
              {meta?.label ?? 'Dropdown'} options <span className="text-destructive">*</span>
            </span>
            <div className="space-y-1.5">
              {options.map((opt, idx) => (
                <div
                  key={opt.id}
                  className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1"
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--color-muted-foreground)]" />
                  <input
                    value={opt.label}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((o, i) => (i === idx ? { ...o, label: e.target.value } : o)),
                      )
                    }
                    placeholder={`Option ${idx + 1}`}
                    className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                  />
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                    className="hover:text-destructive shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    aria-label={`Remove option ${idx + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setOptions((prev) => [
                    ...prev,
                    {
                      id: makeOptionId(),
                      label: '',
                      color: DEFAULT_OPTION_COLORS[prev.length % DEFAULT_OPTION_COLORS.length],
                    },
                  ])
                }
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-1.5 text-left text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
              >
                <Plus className="h-3 w-3" />
                <span className="body-3">Add option</span>
              </button>
            </div>
          </div>
        ) : null}

        {canDelete ? (
          <div className="border-t border-[var(--border)] pt-4">
            {confirmingDelete ? (
              <div className="space-y-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                <p className="body-3 text-[var(--foreground)]">
                  Delete{' '}
                  <span className="font-semibold">
                    &ldquo;{mode.kind === 'edit' ? mode.field.name : ''}&rdquo;
                  </span>
                  ?
                </p>
                <p className="body-4 text-[var(--color-muted-foreground)]">
                  The field will be removed from every view in this space. Existing data on tasks is
                  preserved but no longer rendered.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="body-3 flex-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={busy}
                    className="body-3 flex-1 rounded-md bg-red-500 px-3 py-1.5 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    Delete field
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-destructive flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="body-3">Delete field</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="body-3 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy || !name.trim() || isEditingSystem}
          className="body-3 rounded-md bg-[var(--color-primary)] px-3 py-1.5 font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {mode.kind === 'edit' ? 'Save' : 'Create'}
        </button>
      </div>
    </div>
  )
}
