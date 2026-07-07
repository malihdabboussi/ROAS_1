'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { updateSpace } from '../../../../services/spaces.service'
import { useSpacesStore } from '../../../../store/use-spaces-store'
import {
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  type FieldDef,
  type FieldType,
  type SelectOption,
  type SpaceSchema,
  type ViewDef,
} from '../../../../types/space-schema'

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'field'
  )
}

function uniqueFieldId(name: string, existing: ReadonlyArray<FieldDef>): string {
  const base = slugify(name)
  const taken = new Set(existing.map((f) => f.id))
  if (!taken.has(base)) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}_${i}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}_${Date.now().toString(36)}`
}

interface CreateFieldArgs {
  name: string
  type: FieldType
  options?: SelectOption[]
  /** When provided, also flips this field on in the active view's `visible_fields`. */
  activeView?: ViewDef
  onViewPatch?: (patch: Partial<ViewDef>) => void | Promise<void>
}

export interface FieldMutations {
  createField(args: CreateFieldArgs): Promise<FieldDef | null>
  renameField(fieldId: string, nextName: string): Promise<void>
  updateFieldOptions(fieldId: string, nextOptions: SelectOption[]): Promise<void>
  deleteField(fieldId: string): Promise<void>
}

export function useFieldMutations(): FieldMutations {
  const patchSchema = useSpacesStore((s) => s.patchActiveSpaceSchema)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const spaces = useSpacesStore((s) => s.spaces)

  const getSchema = useCallback((): SpaceSchema | null => {
    const space = spaces.find((sp) => sp.id === activeSpaceId)
    return (space?.schema as SpaceSchema | undefined) ?? null
  }, [activeSpaceId, spaces])

  const persist = useCallback(
    async (nextSchema: SpaceSchema) => {
      if (!activeSpaceId) return
      patchSchema(nextSchema as unknown as Record<string, unknown>)
      await updateSpace(activeSpaceId, { schema: nextSchema })
    },
    [activeSpaceId, patchSchema],
  )

  const createField = useCallback<FieldMutations['createField']>(
    async ({ name, type, options, activeView, onViewPatch }) => {
      const schema = getSchema()
      if (!schema || !activeSpaceId) return null
      const trimmed = name.trim()
      if (!trimmed) {
        toast.error('Field name is required')
        return null
      }
      const id = uniqueFieldId(trimmed, schema.fields)
      const next: FieldDef = {
        id,
        name: trimmed,
        type,
        ...(options && options.length > 0 ? { options } : {}),
      }
      const nextSchema: SpaceSchema = { ...schema, fields: [...schema.fields, next] }
      try {
        await persist(nextSchema)
        if (activeView && onViewPatch) {
          const visible = activeView.visible_fields ?? [...DEFAULT_TASK_VISIBLE_FIELD_IDS]
          if (!visible.includes(id)) {
            await onViewPatch({ visible_fields: [...visible, id] })
          }
        }
        toast.success(`Created "${trimmed}"`)
        return next
      } catch (err) {
        console.error('Create field failed:', err)
        toast.error('Failed to create field')
        return null
      }
    },
    [getSchema, persist, activeSpaceId],
  )

  const renameField = useCallback<FieldMutations['renameField']>(
    async (fieldId, nextName) => {
      const schema = getSchema()
      if (!schema) return
      const trimmed = nextName.trim()
      if (!trimmed) {
        toast.error('Field name is required')
        return
      }
      const target = schema.fields.find((f) => f.id === fieldId)
      if (!target || target.name === trimmed) return
      const nextSchema: SpaceSchema = {
        ...schema,
        fields: schema.fields.map((f) => (f.id === fieldId ? { ...f, name: trimmed } : f)),
      }
      try {
        await persist(nextSchema)
        toast.success('Field renamed')
      } catch (err) {
        console.error('Rename field failed:', err)
        toast.error('Failed to rename field')
      }
    },
    [getSchema, persist],
  )

  const updateFieldOptions = useCallback<FieldMutations['updateFieldOptions']>(
    async (fieldId, nextOptions) => {
      const schema = getSchema()
      if (!schema) return
      const target = schema.fields.find((f) => f.id === fieldId)
      if (!target) return
      const nextSchema: SpaceSchema = {
        ...schema,
        fields: schema.fields.map((f) => (f.id === fieldId ? { ...f, options: nextOptions } : f)),
      }
      try {
        await persist(nextSchema)
      } catch (err) {
        console.error('Update field options failed:', err)
        toast.error('Failed to update options')
      }
    },
    [getSchema, persist],
  )

  const deleteField = useCallback<FieldMutations['deleteField']>(
    async (fieldId) => {
      const schema = getSchema()
      if (!schema) return
      const target = schema.fields.find((f) => f.id === fieldId)
      if (!target) return
      if (target.system) {
        toast.error('System fields cannot be deleted')
        return
      }
      const nextSchema: SpaceSchema = {
        ...schema,
        fields: schema.fields.filter((f) => f.id !== fieldId),
        // Also strip the deleted field from every view's visible_fields/group_by/sort.
        views: schema.views.map((v) => {
          const visible = v.visible_fields?.filter((id) => id !== fieldId)
          const groupBy = v.group_by === fieldId ? undefined : v.group_by
          const sort = v.sort?.filter((s) => s.field !== fieldId)
          return { ...v, visible_fields: visible, group_by: groupBy, sort }
        }),
      }
      try {
        await persist(nextSchema)
        toast.success(`Deleted "${target.name}"`)
      } catch (err) {
        console.error('Delete field failed:', err)
        toast.error('Failed to delete field')
      }
    },
    [getSchema, persist],
  )

  return { createField, renameField, updateFieldOptions, deleteField }
}
