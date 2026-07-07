export type FieldOption = { id?: unknown; label?: unknown; color?: unknown; group?: unknown }
export type FieldDef = { id?: unknown; type?: unknown; options?: FieldOption[] }
export type SpaceView = Record<string, unknown>
export type SpaceSchema = { fields?: FieldDef[]; views?: unknown[] }
export type ValidationResult = { error?: string; warnings: string[] }
export type SchemaOptionSummary = { id: string; label: string; color?: string; group?: string }
export type TaskSchemaSummary = {
  statuses: SchemaOptionSummary[]
  priorities: SchemaOptionSummary[]
  categories: SchemaOptionSummary[]
}

const ASSIGNEE_TYPES = new Set(['human', 'agent', 'unassigned'])
export const TASK_VIEW_TYPES = new Set(['list', 'kanban', 'table', 'gallery', 'calendar'])

// Also appended to spaces that receive a task while having no task-style view,
// so the task is visible without manual view setup.
export const DEFAULT_TASK_LIST_VIEW = {
  id: 'list',
  type: 'list',
  name: 'List',
  visible_fields: ['status', 'title', 'priority', 'assignee', 'due_date', 'tags'],
} as const

export function schemaHasTaskView(schema: SpaceSchema): boolean {
  if (!Array.isArray(schema.views)) return false
  return schema.views.some((view) => {
    const type = (view as Record<string, unknown>)?.type
    return typeof type === 'string' && TASK_VIEW_TYPES.has(type)
  })
}

export class ArtifactTaskSchemaHelper {
  schemaFromSpace(space: Record<string, unknown> | null): SpaceSchema {
    const schema = space?.schema
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return {}
    return schema as SpaceSchema
  }

  fieldsById(schema: SpaceSchema): Map<string, FieldDef> {
    const fields = Array.isArray(schema.fields) ? schema.fields : []
    const out = new Map<string, FieldDef>()
    for (const field of fields) {
      if (typeof field?.id === 'string' && field.id.trim()) out.set(field.id, field)
    }
    return out
  }

  viewsFromSpace(space: Record<string, unknown> | null): SpaceView[] {
    const views = this.schemaFromSpace(space).views
    if (!Array.isArray(views)) return []
    return views.filter(
      (view): view is SpaceView => !!view && typeof view === 'object' && !Array.isArray(view),
    )
  }

  findSpaceView(space: Record<string, unknown> | null, viewId: string): SpaceView | null {
    return (
      this.viewsFromSpace(space).find((view) => String(view.id ?? '').trim() === viewId) ?? null
    )
  }

  recordFrom(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  stringFrom(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  taskSchemaSummary(schema: SpaceSchema): TaskSchemaSummary {
    const fields = this.fieldsById(schema)
    return {
      statuses: this.optionSummaries(fields.get('status')),
      priorities: this.optionSummaries(fields.get('priority')),
      categories: this.optionSummaries(fields.get('category')),
    }
  }

  normalizeListInputAgainstSchema(
    schema: SpaceSchema,
    input: Record<string, unknown>,
  ): { input?: Record<string, unknown>; error?: string } {
    if (input.filter !== undefined) {
      return {
        error:
          'Use filters, not filter. Valid top-level filters include status, category, priority, assignee_id, parent_item_id, source, search, and query.',
      }
    }
    const fields = this.fieldsById(schema)
    const normalized = { ...input }
    const filters = { ...this.recordFrom(input.filters) }
    let changedFilters = false
    for (const fieldId of ['status', 'priority', 'category'] as const) {
      if (normalized[fieldId] !== undefined) {
        const result = this.resolveSchemaOptionValue(
          fieldId,
          fields.get(fieldId),
          normalized[fieldId],
        )
        if (result.error) return { error: result.error }
        normalized[fieldId] = result.value
      }
      if (filters[fieldId] !== undefined) {
        const result = this.resolveSchemaOptionValue(fieldId, fields.get(fieldId), filters[fieldId])
        if (result.error) return { error: result.error }
        filters[fieldId] = result.value
        changedFilters = true
      }
    }
    if (changedFilters) normalized.filters = filters
    return { input: normalized }
  }

  normalizeTaskWriteInputAgainstSchema(
    schema: SpaceSchema,
    input: Record<string, unknown>,
  ): { input?: Record<string, unknown>; error?: string } {
    if (
      input.custom_data !== undefined &&
      input.custom_data !== null &&
      (typeof input.custom_data !== 'object' || Array.isArray(input.custom_data))
    ) {
      return { error: 'custom_data must be an object' }
    }
    const fields = this.fieldsById(schema)
    const normalized = { ...input }
    for (const fieldId of ['status', 'priority'] as const) {
      if (normalized[fieldId] === undefined) continue
      const result = this.resolveSchemaOptionValue(
        fieldId,
        fields.get(fieldId),
        normalized[fieldId],
      )
      if (result.error) return { error: result.error }
      normalized[fieldId] = result.value
    }

    const existingCustomData =
      input.custom_data &&
      typeof input.custom_data === 'object' &&
      !Array.isArray(input.custom_data)
        ? { ...(input.custom_data as Record<string, unknown>) }
        : undefined
    const categoryValues = [
      { source: 'category', value: normalized.category },
      { source: 'custom_data.category', value: existingCustomData?.category },
    ].filter((entry) => entry.value !== undefined)

    if (categoryValues.length > 0) {
      let resolvedCategory: unknown
      for (const entry of categoryValues) {
        const result = this.resolveSchemaOptionValue(
          'category',
          fields.get('category'),
          entry.value,
        )
        if (result.error) return { error: result.error }
        if (
          resolvedCategory !== undefined &&
          result.value !== undefined &&
          resolvedCategory !== result.value
        ) {
          return {
            error:
              'Conflicting category values. Use one category value, either top-level category or custom_data.category.',
          }
        }
        resolvedCategory = result.value
      }
      normalized.custom_data = {
        ...(existingCustomData ?? {}),
        category: resolvedCategory,
      }
    }

    return { input: normalized }
  }

  decorateSpaceItemForAgent(
    item: Record<string, unknown>,
    schema: SpaceSchema,
  ): Record<string, unknown> {
    const fields = this.fieldsById(schema)
    const customData = this.recordFrom(item.custom_data)
    const category = item.category ?? customData.category
    return {
      ...item,
      status_label: this.labelForOptionValue(fields.get('status'), item.status),
      priority_label: this.labelForOptionValue(fields.get('priority'), item.priority),
      category_label: this.labelForOptionValue(fields.get('category'), category),
    }
  }

  filterSpaceItemsForInput(
    items: Record<string, unknown>[],
    view: SpaceView,
    input: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const filters = this.recordFrom(input.filters)
    const explicitType =
      this.stringFrom(input.item_type) ??
      this.stringFrom(filters.item_type) ??
      this.stringFrom(filters._view_type) ??
      this.stringFrom(filters.view_type)
    const typeCandidates = explicitType
      ? this.viewTypeAliases(explicitType)
      : this.viewTypeCandidates(view)
    const search = (this.stringFrom(input.search) ?? '').toLowerCase()
    const scalarFilters = {
      ...filters,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.assignee_id !== undefined ? { assignee_id: input.assignee_id } : {}),
      ...(input.parent_item_id !== undefined ? { parent_item_id: input.parent_item_id } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.doc_source !== undefined ? { doc_source: input.doc_source } : {}),
    }

    return items.filter((item) => {
      if (typeCandidates.size > 0) {
        const itemType = this.itemViewType(item)
        if (!this.typeAliasesContain(typeCandidates, itemType)) return false
      }
      if (search) {
        const haystack = [
          item.title,
          item.description,
          item.notes,
          this.recordFrom(item.custom_data).title,
          this.recordFrom(item.custom_data).content,
        ]
          .map((value) => String(value ?? '').toLowerCase())
          .join('\n')
        if (!haystack.includes(search)) return false
      }
      return Object.entries(scalarFilters).every(([key, value]) =>
        this.itemMatchesSimpleFilter(item, key, value),
      )
    })
  }

  defaultNewTaskStatusId(field: FieldDef | undefined): string | null {
    const options = Array.isArray(field?.options) ? field.options : []
    const todo = options.find((option) => option.id === 'todo')
    if (typeof todo?.id === 'string') return todo.id
    const notStarted = options.find((option) => option.group === 'not_started')
    if (typeof notStarted?.id === 'string') return notStarted.id
    const first = options.find(
      (option) => typeof option.id === 'string' && !this.isClosedStatusOption(option),
    )
    return typeof first?.id === 'string' ? first.id : null
  }

  closedStatusIds(field: FieldDef | undefined): Set<string> {
    const options = Array.isArray(field?.options) ? field.options : []
    return new Set(
      options
        .filter((option) => this.isClosedStatusOption(option))
        .map((option) => (typeof option.id === 'string' ? option.id : null))
        .filter((id): id is string => Boolean(id)),
    )
  }

  validateAgainstSchema(schema: SpaceSchema, data: Record<string, unknown>): ValidationResult {
    const warnings: string[] = []
    const fields = this.fieldsById(schema)

    const statusError = this.validateOption('status', fields.get('status'), data.status)
    if (statusError) return { error: statusError, warnings }

    const priorityError = this.validateOption('priority', fields.get('priority'), data.priority)
    if (priorityError) return { error: priorityError, warnings }

    if (
      data.assignee_type !== undefined &&
      data.assignee_type !== null &&
      !ASSIGNEE_TYPES.has(String(data.assignee_type))
    ) {
      return { error: 'assignee_type must be human, agent, or unassigned', warnings }
    }

    for (const key of ['start_date', 'due_date'] as const) {
      const value = data[key]
      if (
        value !== undefined &&
        value !== null &&
        typeof value === 'string' &&
        value.trim() !== ''
      ) {
        if (!Number.isFinite(Date.parse(value))) {
          return { error: `${key} must be an ISO 8601 date string`, warnings }
        }
      }
    }

    const customData = data.custom_data
    if (customData === undefined) return { warnings }
    if (!customData || typeof customData !== 'object' || Array.isArray(customData)) {
      return { error: 'custom_data must be an object', warnings }
    }

    for (const [key, value] of Object.entries(customData as Record<string, unknown>)) {
      const field = fields.get(key)
      if (!field) {
        warnings.push(
          `custom_data.${key} is not defined in this space schema; saved as raw custom data`,
        )
        continue
      }
      const error = this.validateCustomField(key, field, value)
      if (error) return { error, warnings }
    }

    return { warnings }
  }

  viewTypeAliases(value: string): Set<string> {
    const normalized = value.trim().toLowerCase()
    const aliases = new Set<string>()
    if (!normalized) return aliases
    aliases.add(normalized)
    if (normalized.endsWith('s')) aliases.add(normalized.slice(0, -1))
    if (normalized === 'documents' || normalized === 'docs') aliases.add('doc')
    if (normalized === 'document') aliases.add('doc')
    if (normalized === 'tasks') aliases.add('task')
    return aliases
  }

  viewTypeCandidates(view: SpaceView): Set<string> {
    const candidates = new Set<string>()
    for (const key of ['type', 'view_type', 'item_type', 'source_type']) {
      const value = this.stringFrom(view[key])
      if (!value) continue
      const normalized = value.toLowerCase()
      if (TASK_VIEW_TYPES.has(normalized)) continue
      for (const alias of this.viewTypeAliases(normalized)) candidates.add(alias)
    }
    return candidates
  }

  private normalizedOptionKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  private normalizedOptionAliases(value: string): Set<string> {
    const normalized = this.normalizedOptionKey(value)
    const aliases = new Set<string>()
    if (!normalized) return aliases
    aliases.add(normalized)
    if (normalized.endsWith('s')) aliases.add(normalized.slice(0, -1))
    else aliases.add(`${normalized}s`)
    return aliases
  }

  private optionSummaries(field: FieldDef | undefined): SchemaOptionSummary[] {
    const options = Array.isArray(field?.options) ? field.options : []
    return options
      .map((option) => {
        if (typeof option.id !== 'string' || !option.id.trim()) return null
        const label =
          typeof option.label === 'string' && option.label.trim() ? option.label : option.id
        return {
          id: option.id,
          label,
          ...(typeof option.color === 'string' && option.color.trim()
            ? { color: option.color }
            : {}),
          ...(typeof option.group === 'string' && option.group.trim()
            ? { group: option.group }
            : {}),
        }
      })
      .filter((option): option is SchemaOptionSummary => Boolean(option))
  }

  private formatValidOptions(fieldId: string, options: SchemaOptionSummary[]): string {
    const valid = options.map((option) => `${option.label} (${option.id})`).join(', ')
    const label = fieldId === 'status' ? 'statuses' : `${fieldId}s`
    return `Valid ${label}: ${valid}.`
  }

  private resolveSchemaOptionValue(
    fieldId: string,
    field: FieldDef | undefined,
    value: unknown,
  ): { value?: unknown; error?: string } {
    if (value === undefined || value === null || value === '') return { value }
    const options = this.optionSummaries(field)
    if (options.length === 0) return { value }
    if (Array.isArray(value)) {
      const resolved: unknown[] = []
      for (const entry of value) {
        const result = this.resolveSchemaOptionValue(fieldId, field, entry)
        if (result.error) return result
        resolved.push(result.value)
      }
      return { value: resolved }
    }
    if (typeof value !== 'string') {
      return {
        error: `Invalid ${fieldId} "${String(value)}". ${this.formatValidOptions(fieldId, options)}`,
      }
    }
    const trimmed = value.trim()
    const normalized = this.normalizedOptionAliases(trimmed)
    const match = options.find((option) => {
      const labelAliases = this.normalizedOptionAliases(option.label)
      const idAliases = this.normalizedOptionAliases(option.id)
      return (
        option.id === trimmed ||
        option.id.toLowerCase() === trimmed.toLowerCase() ||
        option.label.toLowerCase() === trimmed.toLowerCase() ||
        [...normalized].some((alias) => labelAliases.has(alias) || idAliases.has(alias))
      )
    })
    if (match) return { value: match.id }
    return {
      error: `Invalid ${fieldId} "${value}". ${this.formatValidOptions(fieldId, options)}`,
    }
  }

  private labelForOptionValue(field: FieldDef | undefined, value: unknown): string | null {
    if (typeof value !== 'string') return null
    return this.optionSummaries(field).find((option) => option.id === value)?.label ?? null
  }

  private itemViewType(item: Record<string, unknown>): string | null {
    const customData = this.recordFrom(item.custom_data)
    return (
      (
        this.stringFrom(customData._view_type) ??
        this.stringFrom(customData.view_type) ??
        this.stringFrom(customData.item_type) ??
        this.stringFrom(item.source) ??
        this.stringFrom(item.type)
      )?.toLowerCase() ?? null
    )
  }

  private typeAliasesContain(candidates: Set<string>, itemType: string | null): boolean {
    if (!itemType) return false
    const itemAliases = this.viewTypeAliases(itemType)
    return [...candidates].some((candidate) => itemAliases.has(candidate))
  }

  private itemMatchesSimpleFilter(
    item: Record<string, unknown>,
    key: string,
    value: unknown,
  ): boolean {
    if (value === undefined) return true
    if (key === 'item_type' || key === '_view_type' || key === 'view_type') {
      return this.typeAliasesContain(this.viewTypeAliases(String(value)), this.itemViewType(item))
    }
    const customData = this.recordFrom(item.custom_data)
    const lookupKey = key === 'doc_source' ? '_doc_source' : key
    const actual = lookupKey.startsWith('custom_data.')
      ? customData[lookupKey.slice(12)]
      : (item[lookupKey] ?? customData[lookupKey])
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry)).includes(String(actual))
    }
    return String(actual ?? '') === String(value)
  }

  private optionIds(field: FieldDef | undefined): string[] {
    return Array.isArray(field?.options)
      ? field.options
          .map((option) => (typeof option.id === 'string' ? option.id : null))
          .filter((id): id is string => Boolean(id))
      : []
  }

  private isClosedStatusOption(option: FieldOption): boolean {
    const id = typeof option.id === 'string' ? option.id : ''
    const group = typeof option.group === 'string' ? option.group : ''
    return group === 'closed' || group === 'done' || id === 'done' || id === 'completed'
  }

  private validateOption(
    fieldId: string,
    field: FieldDef | undefined,
    value: unknown,
  ): string | null {
    if (value === undefined || value === null || value === '') return null
    const allowed = this.optionIds(field)
    if (allowed.length === 0) return null
    if (typeof value !== 'string' || !allowed.includes(value)) {
      return `${fieldId} "${String(value)}" is not valid for this space. Valid: ${allowed.join(', ')}. Run get_space to see the current schema.`
    }
    return null
  }

  private validateCustomField(
    fieldId: string,
    field: FieldDef | undefined,
    value: unknown,
  ): string | null {
    if (value === undefined || value === null) return null
    const type = typeof field?.type === 'string' ? field.type : 'unknown'
    if (type === 'select') return this.validateOption(fieldId, field, value)
    if (type === 'multi_select') {
      if (!Array.isArray(value)) return `${fieldId} must be an array`
      const allowed = this.optionIds(field)
      if (allowed.length === 0) return null
      const invalid = value.filter((entry) => typeof entry !== 'string' || !allowed.includes(entry))
      if (invalid.length > 0) {
        return `${fieldId} contains invalid option(s): ${invalid.map(String).join(', ')}. Valid: ${allowed.join(', ')}. Run get_space to see the current schema.`
      }
      return null
    }
    if (type === 'date') {
      if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
        return `${fieldId} must be an ISO 8601 date string`
      }
      return null
    }
    if (type === 'number' || type === 'currency' || type === 'rating' || type === 'progress') {
      if (typeof value === 'number' && Number.isFinite(value)) return null
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
        return null
      return `${fieldId} must be a finite number`
    }
    if (type === 'checkbox') {
      if (typeof value === 'boolean') return null
      return `${fieldId} must be a boolean`
    }
    if (type === 'url') {
      if (typeof value !== 'string' || value.trim() === '') return `${fieldId} must be a URL string`
      try {
        new URL(value)
        return null
      } catch {
        return `${fieldId} must be a valid URL`
      }
    }
    if (type === 'email') {
      if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
      return `${fieldId} must be a valid email`
    }
    if (type === 'phone' || type === 'text') {
      if (typeof value === 'string') return null
      return `${fieldId} must be a string`
    }
    return null
  }
}
