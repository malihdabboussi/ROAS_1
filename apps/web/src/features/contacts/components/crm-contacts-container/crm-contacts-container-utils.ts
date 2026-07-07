import type {
  CrmContactRow,
  CrmSort,
  FilterState,
} from '../../services/crm-contacts-api'

export type ColumnId =
  | 'name'
  | 'email'
  | 'phone'
  | 'created_at'
  | 'tags'
  | 'funnel'
  | 'source_domain'
  | 'contact_source'
  | 'contact_type'

export type ColumnVisibility = Record<ColumnId, boolean>

export const DEFAULT_COLUMNS: ColumnVisibility = {
  name: true,
  email: true,
  phone: true,
  created_at: true,
  tags: true,
  funnel: true,
  source_domain: false,
  contact_source: false,
  contact_type: false,
}

export const SORT_OPTIONS: Array<{ id: CrmSort; label: string }> = [
  { id: 'created_at.desc', label: 'Newest first' },
  { id: 'created_at.asc', label: 'Oldest first' },
  { id: 'email.asc', label: 'Email A -> Z' },
  { id: 'email.desc', label: 'Email Z -> A' },
  { id: 'name.asc', label: 'Name A -> Z' },
  { id: 'name.desc', label: 'Name Z -> A' },
]

export const COLUMN_OPTIONS: Array<{ id: ColumnId; label: string }> = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'created_at', label: 'Created' },
  { id: 'tags', label: 'Tags' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'source_domain', label: 'Source Domain' },
  { id: 'contact_source', label: 'Contact Source' },
  { id: 'contact_type', label: 'Contact Type' },
]

export interface CrmListSnapshot {
  rows: CrmContactRow[]
  total: number
  offset: number
}

export const crmListCache = new Map<string, CrmListSnapshot>()

export function safeLoadJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function safeSaveJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function countActiveFilters(filters: FilterState): number {
  return Object.values(filters).filter((filter) => {
    if (!filter) return false
    if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') return true
    if (Array.isArray(filter.value)) return filter.value.length > 0
    return typeof filter.value === 'string' ? filter.value.trim().length > 0 : false
  }).length
}
