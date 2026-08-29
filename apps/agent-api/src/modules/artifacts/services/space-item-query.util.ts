type QueryBuilderLike = {
  eq: (key: string, value: unknown) => QueryBuilderLike
  is: (key: string, value: unknown) => QueryBuilderLike
  in?: (key: string, values: unknown[]) => QueryBuilderLike
  ilike?: (key: string, value: string) => QueryBuilderLike
  contains?: (key: string, value: unknown) => QueryBuilderLike
  order: (key: string, options?: { ascending?: boolean }) => QueryBuilderLike
  limit: (limit: number) => QueryBuilderLike
}

export const SPACE_ITEM_SUMMARY_SELECT =
  'id, space_id, title, status, priority, assignee_type, assignee_id, parent_item_id, sort_order, start_date, due_date, source, custom_data, created_at, updated_at'

const SPACE_ITEM_FULL_SELECT = '*'

const TOP_LEVEL_SPACE_ITEM_FILTERS = new Set([
  'id',
  'space_id',
  'title',
  'status',
  'priority',
  'assignee_type',
  'assignee_id',
  'parent_item_id',
  'source',
  'start_date',
  'due_date',
  'sort_order',
  'created_at',
  'updated_at',
])

const SORTABLE_SPACE_ITEM_COLUMNS = new Set([
  'title',
  'status',
  'priority',
  'assignee_id',
  'parent_item_id',
  'sort_order',
  'start_date',
  'due_date',
  'created_at',
  'updated_at',
])

const RESERVED_QUERY_KEYS = new Set([
  'space_id',
  'view_id',
  'filters',
  'search',
  'query',
  'limit',
  'include_count',
  'fields',
  'sort_by',
  'sort_order',
  'sort_direction',
  'include_closed',
  'assigned_to_me',
  'scope_override',
])

function isSafeFieldKey(key: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(key)
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringFrom(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function parseSpaceItemLimit(value: unknown, fallback = 50, max = 250): number {
  const parsed = Number(value ?? fallback)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), 1), max)
}

export function shouldIncludeSpaceItemCount(input: Record<string, unknown>): boolean {
  return input.include_count === true || input.include_count === 'true'
}

export function getSpaceItemSelect(input: Record<string, unknown>): string {
  const fields = stringFrom(input.fields)?.toLowerCase()
  return fields === 'summary' ? SPACE_ITEM_SUMMARY_SELECT : SPACE_ITEM_FULL_SELECT
}

export function collectSpaceItemFilters(
  input: Record<string, unknown>,
  additionalFilters: Record<string, unknown> = {},
): Record<string, unknown> {
  const filters = { ...recordFrom(input.filters), ...additionalFilters }
  for (const key of [
    'status',
    'assignee_id',
    'parent_item_id',
    'source',
    'doc_source',
    'category',
    'item_type',
    '_view_type',
    'view_type',
    'priority',
    'assignee_type',
  ]) {
    if (input[key] !== undefined) filters[key] = input[key]
  }
  return filters
}

function normalizeFilterColumn(key: string): string | null {
  const customPrefix = 'custom_data.'
  if (key === 'doc_source') return 'custom_data->>_doc_source'
  if (key === 'item_type' || key === 'view_type') return 'custom_data->>_view_type'
  if (key.startsWith(customPrefix)) {
    const customKey = key.slice(customPrefix.length)
    return isSafeFieldKey(customKey) ? `custom_data->>${customKey}` : null
  }
  if (TOP_LEVEL_SPACE_ITEM_FILTERS.has(key)) return key
  return isSafeFieldKey(key) ? `custom_data->>${key}` : null
}

function applyFilterValue<T extends QueryBuilderLike>(query: T, column: string, value: unknown): T {
  if (value === undefined) return query
  if (value === null || value === 'null') return query.is(column, null) as T
  if (Array.isArray(value)) {
    const values = value.filter((entry) => entry !== undefined && entry !== null)
    if (values.length === 0) return query
    if (typeof query.in === 'function') return query.in(column, values) as T
    return values.length === 1 ? (query.eq(column, values[0]) as T) : query
  }
  return query.eq(column, value) as T
}

export function applySpaceItemFilters<T extends QueryBuilderLike>(
  query: T,
  input: Record<string, unknown>,
  additionalFilters: Record<string, unknown> = {},
): T {
  let next = query
  const filters = collectSpaceItemFilters(input, additionalFilters)
  for (const [key, value] of Object.entries(filters)) {
    if (RESERVED_QUERY_KEYS.has(key) || value === undefined) continue
    const column = normalizeFilterColumn(key)
    if (!column) continue
    next = applyFilterValue(next, column, value)
  }
  return next
}

function isAssignedToMe(input: Record<string, unknown>): boolean {
  return input.assigned_to_me === true || input.assigned_to_me === 'true'
}

export function applySpaceItemAssignedToMeFilter<T extends QueryBuilderLike>(
  query: T,
  input: Record<string, unknown>,
  userId: string,
): T {
  if (!isAssignedToMe(input)) return query
  if (typeof query.contains === 'function') {
    const assigneesMatch = JSON.stringify([{ type: 'human', id: userId }])
    return query.contains('assignees', assigneesMatch) as T
  }
  return query.eq('assignee_type', 'human').eq('assignee_id', userId) as T
}

export function applySpaceItemSearch<T extends QueryBuilderLike>(
  query: T,
  input: Record<string, unknown>,
): T {
  const search = stringFrom(input.search) ?? stringFrom(input.query)
  if (!search || typeof query.ilike !== 'function') return query
  return query.ilike('title', `%${search}%`) as T
}

export function applySpaceItemOrder<T extends QueryBuilderLike>(
  query: T,
  input: Record<string, unknown>,
  fallbackColumn = 'sort_order',
): T {
  const requested = stringFrom(input.sort_by) ?? fallbackColumn
  const column = SORTABLE_SPACE_ITEM_COLUMNS.has(requested) ? requested : fallbackColumn
  const rawDirection = stringFrom(input.sort_direction) ?? stringFrom(input.sort_order) ?? 'asc'
  const ascending = rawDirection.toLowerCase() !== 'desc'
  return query.order(column, { ascending }) as T
}
