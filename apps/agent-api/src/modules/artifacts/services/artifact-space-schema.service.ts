import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactSpaceSchemaRepository } from '../repositories/artifact-space-schema.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

type SelectOption = { id: string; label: string; color?: string; group?: string }
type FieldDef = {
  id: string
  name: string
  type: string
  options?: SelectOption[]
  system?: boolean
  required?: boolean
}
type ViewDef = Record<string, unknown> & { id?: unknown; visible_fields?: unknown }
type SpaceSchema = Record<string, unknown> & { version?: number; fields: FieldDef[]; views: ViewDef[] }

const CREATABLE_FIELD_TYPES = new Set([
  'select',
  'multi_select',
  'text',
  'date',
  'number',
  'checkbox',
  'currency',
  'url',
  'email',
  'phone',
  'rating',
  'progress',
  'media',
  'contact',
])

const OPTION_FIELD_TYPES = new Set(['select', 'multi_select'])
const DEFAULT_OPTION_COLORS = ['purple', 'blue', 'green', 'orange', 'red', 'cyan', 'yellow']

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'field'
  )
}

function uniqueId(baseName: string, takenIds: Iterable<string>): string {
  const base = slugify(baseName)
  const taken = new Set([...takenIds])
  if (!taken.has(base)) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}_${i}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}_${Date.now().toString(36)}`
}

function schemaFromSpace(space: Record<string, unknown>): SpaceSchema {
  const raw = space.schema && typeof space.schema === 'object' ? space.schema : {}
  const schema = raw as Record<string, unknown>
  return {
    ...schema,
    version: typeof schema.version === 'number' ? schema.version : 1,
    fields: Array.isArray(schema.fields) ? (schema.fields as FieldDef[]) : [],
    views: Array.isArray(schema.views) ? (schema.views as ViewDef[]) : [],
  }
}

function withFieldVisibleInViews(
  schema: SpaceSchema,
  fieldId: string,
  visibleViewIds: string[] | null,
): { schema?: SpaceSchema; error?: string } {
  if (!visibleViewIds) return { schema }
  const ids = [...new Set(visibleViewIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) return { schema }

  const existing = new Set(schema.views.map((view) => stringValue(view.id)).filter(Boolean))
  const missing = ids.filter((id) => !existing.has(id))
  if (missing.length > 0) return { error: `Unknown view id(s): ${missing.join(', ')}` }

  return {
    schema: {
      ...schema,
      views: schema.views.map((view) => {
        const id = stringValue(view.id)
        if (!id || !ids.includes(id)) return view
        const current = Array.isArray(view.visible_fields)
          ? view.visible_fields.filter((value): value is string => typeof value === 'string')
          : []
        return current.includes(fieldId)
          ? view
          : { ...view, visible_fields: [...current, fieldId] }
      }),
    },
  }
}

@Injectable()
export class ArtifactSpaceSchemaService {
  constructor(
    private readonly repository: ArtifactSpaceSchemaRepository = new ArtifactSpaceSchemaRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      create_space_field: (data, sessionKey) => this.createSpaceField(target, data, sessionKey),
      update_space_field: (data, sessionKey) => this.updateSpaceField(target, data, sessionKey),
      append_space_field_option: (data, sessionKey) =>
        this.appendSpaceFieldOption(target, data, sessionKey),
      create_space_status: (data, sessionKey) =>
        this.appendSpaceFieldOption(target, { ...data, field_id: 'status' }, sessionKey),
      create_space_tag: (data, sessionKey) =>
        this.appendSpaceFieldOption(target, { ...data, field_id: 'tags' }, sessionKey),
      create_space_category: (data, sessionKey) =>
        this.createSpaceCategory(target, data, sessionKey),
      create_space_view: (data, sessionKey) => this.createSpaceView(target, data, sessionKey),
      update_space_view: (data, sessionKey) => this.updateSpaceView(target, data, sessionKey),
    }
  }

  private async createSpaceField(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const name = stringValue(input.name)
    const type = stringValue(input.type)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!name) return { success: false, error: 'name is required' }
    if (!type) return { success: false, error: 'type is required' }
    if (!CREATABLE_FIELD_TYPES.has(type)) {
      return { success: false, error: `Unsupported field type: ${type}` }
    }

    const loaded = await this.loadSpace(target, spaceId, sessionKey)
    if ('error' in loaded) return loaded
    const schema = schemaFromSpace(loaded.space)
    const fieldId = stringValue(input.field_id) ?? uniqueId(name, schema.fields.map((field) => field.id))
    if (schema.fields.some((field) => field.id === fieldId)) {
      return { success: false, error: `Field id "${fieldId}" already exists` }
    }

    const optionsResult = this.parseOptions(input.options, type)
    if ('error' in optionsResult) return optionsResult

    let nextSchema: SpaceSchema = {
      ...schema,
      fields: [
        ...schema.fields,
        {
          id: fieldId,
          name,
          type,
          ...(optionsResult.options.length > 0 ? { options: optionsResult.options } : {}),
        },
      ],
    }

    const visibility = withFieldVisibleInViews(
      nextSchema,
      fieldId,
      this.stringArray(input.visible_in_view_ids),
    )
    if (visibility.error) return { success: false, error: visibility.error }
    nextSchema = visibility.schema ?? nextSchema

    return this.persistSchema(loaded.supabase, spaceId, nextSchema, fieldId)
  }

  private async updateSpaceField(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const fieldId = stringValue(input.field_id)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!fieldId) return { success: false, error: 'field_id is required' }

    const loaded = await this.loadSpace(target, spaceId, sessionKey)
    if ('error' in loaded) return loaded
    const schema = schemaFromSpace(loaded.space)
    const targetField = schema.fields.find((field) => field.id === fieldId)
    if (!targetField) return { success: false, error: `Field "${fieldId}" was not found` }

    const nextName =
      input.name === undefined || input.name === null ? undefined : stringValue(input.name)
    if (input.name !== undefined && !nextName) {
      return { success: false, error: 'name must be a non-empty string' }
    }
    if (nextName && targetField.system === true) {
      return { success: false, error: 'System fields cannot be renamed' }
    }

    const hasOptions = input.options !== undefined
    const optionsResult = hasOptions ? this.parseOptions(input.options, targetField.type) : null
    if (optionsResult && 'error' in optionsResult) return optionsResult

    if (!nextName && !hasOptions && input.visible_in_view_ids === undefined) {
      return { success: false, error: 'No field updates provided' }
    }

    let updatedField: FieldDef = {
      ...targetField,
      ...(nextName ? { name: nextName } : {}),
      ...(optionsResult ? { options: optionsResult.options } : {}),
    }
    let nextSchema: SpaceSchema = {
      ...schema,
      fields: schema.fields.map((field) => (field.id === fieldId ? updatedField : field)),
    }

    const visibility = withFieldVisibleInViews(
      nextSchema,
      fieldId,
      this.stringArray(input.visible_in_view_ids),
    )
    if (visibility.error) return { success: false, error: visibility.error }
    nextSchema = visibility.schema ?? nextSchema
    updatedField = nextSchema.fields.find((field) => field.id === fieldId) ?? updatedField

    return this.persistSchema(loaded.supabase, spaceId, nextSchema, updatedField.id)
  }

  private async appendSpaceFieldOption(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    return this.appendOptionToField(target, input, sessionKey)
  }

  private async createSpaceCategory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const fieldId = stringValue(input.field_id) ?? 'category'
    return this.appendOptionToField(
      target,
      { ...input, field_id: fieldId },
      sessionKey,
      fieldId === 'category'
        ? { id: 'category', name: 'Category', type: 'select' }
        : undefined,
    )
  }

  private async appendOptionToField(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    createIfMissing?: Pick<FieldDef, 'id' | 'name' | 'type'>,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const fieldId = stringValue(input.field_id)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!fieldId) return { success: false, error: 'field_id is required' }

    const loaded = await this.loadSpace(target, spaceId, sessionKey)
    if ('error' in loaded) return loaded
    const schema = schemaFromSpace(loaded.space)
    const targetField =
      schema.fields.find((field) => field.id === fieldId) ??
      (createIfMissing
        ? {
            ...createIfMissing,
            options: [],
          }
        : null)
    if (!targetField) return { success: false, error: `Field "${fieldId}" was not found` }
    if (!OPTION_FIELD_TYPES.has(targetField.type)) {
      return { success: false, error: 'options are only valid for select and multi_select fields' }
    }

    const label = stringValue(input.label)
    if (!label) return { success: false, error: 'label is required' }
    const existingOptions = Array.isArray(targetField.options) ? targetField.options : []
    const requestedId = input.id === undefined || input.id === null ? null : stringValue(input.id)
    if (input.id !== undefined && !requestedId) {
      return { success: false, error: 'id must be a non-empty string' }
    }

    const existingOption =
      (requestedId ? existingOptions.find((option) => option.id === requestedId) : null) ??
      existingOptions.find((option) => option.label.toLowerCase() === label.toLowerCase())
    if (existingOption) {
      return { success: true, existing: true, space_id: spaceId, field: targetField, option: existingOption, schema }
    }

    const taken = new Set(existingOptions.map((option) => option.id))
    const parsed = this.parseOption(
      {
        id: requestedId ?? uniqueId(label, taken),
        label,
        color: input.color,
        group: input.group,
      },
      taken,
      existingOptions.length,
    )
    if ('error' in parsed) return parsed
    const updatedField: FieldDef = {
      ...targetField,
      options: [...existingOptions, parsed.option],
    }
    const fieldExists = schema.fields.some((field) => field.id === fieldId)
    const nextSchema: SpaceSchema = {
      ...schema,
      fields: fieldExists
        ? schema.fields.map((field) => (field.id === fieldId ? updatedField : field))
        : [...schema.fields, updatedField],
    }
    const persisted = (await this.persistSchema(
      loaded.supabase,
      spaceId,
      nextSchema,
      updatedField.id,
    )) as Record<string, unknown>
    return persisted.success === false ? persisted : { ...persisted, option: parsed.option }
  }

  private async createSpaceView(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const name = stringValue(input.name)
    const viewType = stringValue(input.view_type) ?? 'table'
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!name) return { success: false, error: 'name is required' }

    const loaded = await this.loadSpace(target, spaceId, sessionKey)
    if ('error' in loaded) return loaded
    const schema = schemaFromSpace(loaded.space)
    const viewId = stringValue(input.view_id) ?? uniqueId(name, schema.views.map((view) => String(view.id ?? '')))
    if (schema.views.some((view) => stringValue(view.id) === viewId)) {
      return { success: false, error: `View id "${viewId}" already exists` }
    }
    const visibleFields = this.stringArray(input.visible_field_ids)
    const fieldError = this.validateFieldIds(schema, visibleFields)
    if (fieldError) return { success: false, error: fieldError }

    const view: ViewDef = {
      id: viewId,
      type: viewType,
      name,
      ...(visibleFields ? { visible_fields: visibleFields } : {}),
      ...(input.filters && typeof input.filters === 'object' && !Array.isArray(input.filters)
        ? { filters: input.filters }
        : {}),
      ...(input.config && typeof input.config === 'object' && !Array.isArray(input.config)
        ? { config: input.config }
        : {}),
    }
    const nextSchema: SpaceSchema = { ...schema, views: [...schema.views, view] }
    return this.persistViewSchema(loaded.supabase, spaceId, nextSchema, viewId)
  }

  private async updateSpaceView(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const spaceId = stringValue(input.space_id)
    const viewId = stringValue(input.view_id)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!viewId) return { success: false, error: 'view_id is required' }

    const loaded = await this.loadSpace(target, spaceId, sessionKey)
    if ('error' in loaded) return loaded
    const schema = schemaFromSpace(loaded.space)
    const targetView = schema.views.find((view) => stringValue(view.id) === viewId)
    if (!targetView) return { success: false, error: `View "${viewId}" was not found` }

    const name = input.name === undefined || input.name === null ? undefined : stringValue(input.name)
    const viewType =
      input.view_type === undefined || input.view_type === null
        ? undefined
        : stringValue(input.view_type)
    if (input.name !== undefined && !name) {
      return { success: false, error: 'name must be a non-empty string' }
    }
    if (input.view_type !== undefined && !viewType) {
      return { success: false, error: 'view_type must be a non-empty string' }
    }
    const visibleFields = this.stringArray(input.visible_field_ids)
    const fieldError = this.validateFieldIds(schema, visibleFields)
    if (fieldError) return { success: false, error: fieldError }
    if (
      !name &&
      !viewType &&
      input.visible_field_ids === undefined &&
      input.filters === undefined &&
      input.config === undefined
    ) {
      return { success: false, error: 'No view updates provided' }
    }

    const updatedView: ViewDef = {
      ...targetView,
      ...(name ? { name } : {}),
      ...(viewType ? { type: viewType } : {}),
      ...(visibleFields ? { visible_fields: visibleFields } : {}),
      ...(input.filters && typeof input.filters === 'object' && !Array.isArray(input.filters)
        ? { filters: input.filters }
        : {}),
      ...(input.config && typeof input.config === 'object' && !Array.isArray(input.config)
        ? { config: input.config }
        : {}),
    }
    const nextSchema: SpaceSchema = {
      ...schema,
      views: schema.views.map((view) => (stringValue(view.id) === viewId ? updatedView : view)),
    }
    return this.persistViewSchema(loaded.supabase, spaceId, nextSchema, viewId)
  }

  private async loadSpace(target: Record<string, any>, spaceId: string, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
    const { data: space, error } = await this.repository.findSpace(supabase, spaceId)
    if (error) return { success: false as const, error: error.message ?? 'Failed to load Space' }
    if (!space) return { success: false as const, error: 'Space not found' }
    return { supabase, space: space as Record<string, unknown> }
  }

  private parseOptions(
    value: unknown,
    fieldType: string,
  ): { options: SelectOption[] } | { success: false; error: string } {
    if (value === undefined || value === null) return { options: [] }
    if (!OPTION_FIELD_TYPES.has(fieldType)) {
      return { success: false, error: 'options are only valid for select and multi_select fields' }
    }
    if (!Array.isArray(value)) return { success: false, error: 'options must be an array' }

    const taken = new Set<string>()
    const options: SelectOption[] = []
    for (const [index, raw] of value.entries()) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { success: false, error: 'options must be an array of objects' }
      }
      const record = raw as Record<string, unknown>
      const parsed = this.parseOption(record, taken, index)
      if ('error' in parsed) return parsed
      options.push(parsed.option)
    }
    return { options }
  }

  private parseOption(
    record: Record<string, unknown>,
    taken: Set<string>,
    index: number,
  ): { option: SelectOption } | { success: false; error: string } {
    const label = stringValue(record.label)
    if (!label) return { success: false, error: 'option label is required' }
    const rawId = record.id === undefined || record.id === null ? null : stringValue(record.id)
    if (record.id !== undefined && !rawId) {
      return { success: false, error: 'option id must be a non-empty string' }
    }
    const id = rawId ?? uniqueId(label, taken)
    if (taken.has(id)) return { success: false, error: `Duplicate option id "${id}"` }
    taken.add(id)
    const color =
      record.color === undefined || record.color === null
        ? DEFAULT_OPTION_COLORS[index % DEFAULT_OPTION_COLORS.length]
        : stringValue(record.color)
    const group =
      record.group === undefined || record.group === null ? null : stringValue(record.group)
    if (record.color !== undefined && !color) {
      return { success: false, error: 'option color must be a non-empty string' }
    }
    if (record.group !== undefined && !group) {
      return { success: false, error: 'option group must be a non-empty string' }
    }
    return { option: { id, label, ...(color ? { color } : {}), ...(group ? { group } : {}) } }
  }

  private stringArray(value: unknown): string[] | null {
    if (value === undefined || value === null) return null
    if (!Array.isArray(value)) return []
    return value.filter(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
    )
  }

  private validateFieldIds(schema: SpaceSchema, fieldIds: string[] | null): string | null {
    if (!fieldIds) return null
    const existing = new Set(schema.fields.map((field) => field.id))
    const missing = fieldIds.filter((id) => !existing.has(id))
    return missing.length > 0 ? `Unknown field id(s): ${missing.join(', ')}` : null
  }

  private async persistSchema(
    supabase: SupabaseClient,
    spaceId: string,
    schema: SpaceSchema,
    fieldId: string,
  ): Promise<unknown> {
    const { data, error } = await this.repository.updateSpaceSchema(supabase, {
      spaceId,
      schema,
    })
    if (error) return { success: false, error: error.message ?? 'Failed to update Space schema' }
    const savedSchema = schemaFromSpace((data as Record<string, unknown> | null) ?? { schema })
    const field = savedSchema.fields.find((candidate) => candidate.id === fieldId)
    return { success: true, space_id: spaceId, field, schema: savedSchema }
  }

  private async persistViewSchema(
    supabase: SupabaseClient,
    spaceId: string,
    schema: SpaceSchema,
    viewId: string,
  ): Promise<unknown> {
    const { data, error } = await this.repository.updateSpaceSchema(supabase, {
      spaceId,
      schema,
    })
    if (error) return { success: false, error: error.message ?? 'Failed to update Space schema' }
    const savedSchema = schemaFromSpace((data as Record<string, unknown> | null) ?? { schema })
    const view = savedSchema.views.find((candidate) => stringValue(candidate.id) === viewId)
    return { success: true, space_id: spaceId, view, schema: savedSchema }
  }
}
