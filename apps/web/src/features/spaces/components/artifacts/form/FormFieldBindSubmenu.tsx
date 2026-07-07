'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { fetchSpaceById, updateSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { FieldDef, FieldType, Space, SpaceSchema } from '@/features/spaces/types'
import type { FormQuestionType } from '@/lib/forms/forms-api'
import { cn } from '@/lib/utils/cn'
import { findCreatableType } from '../../customize/views/default/field-type-catalog'
import { fieldTypeForQuestion, fieldTypesForQuestion } from './form-field-binding'

function makeFieldId(name: string, existing: FieldDef[]): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'field'
  const taken = new Set(existing.map((f) => f.id))
  if (!taken.has(base)) return base
  for (let i = 2; i < 1000; i++) {
    const next = `${base}_${i}`
    if (!taken.has(next)) return next
  }
  return `${base}_${Date.now().toString(36)}`
}

function defaultOptions(type: FieldType) {
  if (type !== 'select' && type !== 'multi_select') return undefined
  return [
    { id: `opt_${Date.now().toString(36)}_1`, label: 'Option 1', color: 'purple' },
    { id: `opt_${Date.now().toString(36)}_2`, label: 'Option 2', color: 'blue' },
  ]
}

export function FormFieldBindSubmenu({
  questionType,
  targetSpaceId,
  onPickField,
  onOpenSettings,
  selectedFieldId,
  layout = 'popover',
}: {
  questionType: FormQuestionType
  targetSpaceId?: string | null
  onPickField: (field: FieldDef | null) => void
  onOpenSettings?: () => void
  selectedFieldId?: string | null
  /** `rail`: form builder side column — no floating card chrome. */
  layout?: 'popover' | 'rail'
}) {
  const isRail = layout === 'rail'
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const spaces = useSpacesStore((state) => state.spaces)
  const patchActiveSpaceSchema = useSpacesStore((state) => state.patchActiveSpaceSchema)
  const [space, setSpace] = useState<Space | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [draftName, setDraftName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fieldType = fieldTypeForQuestion(questionType)
  const acceptedFieldTypes = useMemo(() => fieldTypesForQuestion(questionType), [questionType])

  useEffect(() => {
    let cancelled = false
    if (!targetSpaceId) {
      setSpace(null)
      return
    }
    const local = spaces.find((candidate) => candidate.id === targetSpaceId)
    if (local) {
      setSpace(local)
      return
    }
    fetchSpaceById(targetSpaceId)
      .then((row) => {
        if (!cancelled) setSpace(row)
      })
      .catch(() => {
        if (!cancelled) setSpace(null)
      })
    return () => {
      cancelled = true
    }
  }, [targetSpaceId, spaces])

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 40)
  }, [creating])

  const fields = useMemo(() => {
    if (!space || acceptedFieldTypes.length === 0) return []
    const schema = space.schema as SpaceSchema
    const needle = query.trim().toLowerCase()
    return schema.fields
      .filter((field) => acceptedFieldTypes.includes(field.type))
      .filter((field) => !needle || field.name.toLowerCase().includes(needle))
  }, [space, acceptedFieldTypes, query])

  const creatable = fieldType ? findCreatableType(fieldType) : null

  const createAndPick = useCallback(async () => {
    if (!space || !fieldType) return
    const name = draftName.trim() || creatable?.label || 'Field'
    const schema = space.schema as SpaceSchema
    const field: FieldDef = {
      id: makeFieldId(name, schema.fields),
      name,
      type: fieldType,
      ...(defaultOptions(fieldType) ? { options: defaultOptions(fieldType) } : {}),
    }
    const nextSchema: SpaceSchema = { ...schema, fields: [...schema.fields, field] }
    await updateSpace(space.id, { schema: nextSchema })
    if (activeSpaceId === space.id) {
      patchActiveSpaceSchema(nextSchema as unknown as Record<string, unknown>)
    }
    setSpace({ ...space, schema: nextSchema })
    setCreating(false)
    setDraftName('')
    onPickField(field)
  }, [
    activeSpaceId,
    creatable?.label,
    draftName,
    fieldType,
    onPickField,
    patchActiveSpaceSchema,
    space,
  ])

  if (!fieldType || questionType === 'info_block') {
    return (
      <div
        className={cn(
          isRail
            ? 'w-full'
            : 'surface-card border-border z-dropdown rounded-spacing-3 p-spacing-2 w-72 border shadow-lg',
        )}
      >
        <button
          type="button"
          onClick={() => onPickField(null)}
          className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center"
        >
          Add unbound info block
        </button>
      </div>
    )
  }

  if (!targetSpaceId) {
    return (
      <div
        className={cn(
          isRail
            ? 'w-full'
            : 'surface-card border-border z-dropdown rounded-spacing-3 p-spacing-3 w-72 border shadow-lg',
        )}
      >
        <p className="body-3 text-muted-foreground">
          Pick a target space in form settings before binding fields.
        </p>
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="button-compact button-glass-primary mt-spacing-3"
          >
            Open settings
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex max-h-[min(420px,70vh)] flex-col overflow-hidden',
        isRail
          ? 'w-full'
          : 'surface-card border-border z-dropdown rounded-spacing-3 w-80 border shadow-lg',
      )}
    >
      <div
        className={cn(
          'border-border px-spacing-3 py-spacing-2 shrink-0 border-b',
          isRail && 'px-0',
        )}
      >
        <div className="input-glass h-spacing-8 gap-spacing-2 rounded-spacing-2 px-spacing-3 flex items-center">
          <Search className="icon-sm text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${creatable?.label ?? fieldType} fields...`}
            className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="icon-xs" />
            </button>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          'p-spacing-2 min-h-0 flex-1 overflow-y-auto',
          isRail && 'pt-spacing-2 px-0 pb-0',
        )}
      >
        {creating && !isRail ? (
          <div
            className={cn(
              'border-border mb-spacing-2 rounded-spacing-2 p-spacing-2 border',
              !isRail && 'surface-card',
            )}
          >
            <input
              ref={inputRef}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void createAndPick()
                if (event.key === 'Escape') setCreating(false)
              }}
              placeholder={`New ${creatable?.label ?? fieldType} field`}
              className="input-glass body-3 h-spacing-8 w-full"
            />
            <div className="mt-spacing-2 gap-spacing-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="button-compact button-glass-neutral"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createAndPick()}
                className="button-compact button-glass-primary"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isRail) {
                void createAndPick()
                return
              }
              setCreating(true)
            }}
            disabled={!creatable}
            className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground mb-spacing-2 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center transition-colors disabled:opacity-50"
          >
            <Plus className="icon-sm" />
            Create new {creatable?.label ?? fieldType} field
          </button>
        )}
        <div className="border-border mb-spacing-2 border-t" />
        <div className="gap-spacing-1 grid">
          {fields.map((field) => {
            const fieldMeta = findCreatableType(field.type)
            const Icon = fieldMeta?.icon
            const selected = field.id === selectedFieldId
            return (
              <button
                key={field.id}
                type="button"
                onClick={() => onPickField(field)}
                className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center transition-colors"
              >
                {Icon ? <Icon className="icon-sm shrink-0" /> : null}
                <span className="text-foreground min-w-0 flex-1 truncate text-left">
                  {field.name}
                </span>
                {selected ? <Check className="icon-sm text-success shrink-0" /> : null}
              </button>
            )
          })}
          {fields.length === 0 ? (
            <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
              No matching fields. Create one above.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
