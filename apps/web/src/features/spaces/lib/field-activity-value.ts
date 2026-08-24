import type { FieldDef, FieldType, SelectOption } from '../types/space-schema'

export const BUILTIN_PRIORITY_OPTIONS: SelectOption[] = [
  { id: 'low', label: 'Low', color: 'slate' },
  { id: 'medium', label: 'Medium', color: 'blue' },
  { id: 'high', label: 'High', color: 'orange' },
  { id: 'urgent', label: 'Urgent', color: 'red' },
]

const SYSTEM_FIELD_DEFS: Record<string, FieldDef> = {
  priority: {
    id: 'priority',
    name: 'Priority',
    type: 'select',
    options: BUILTIN_PRIORITY_OPTIONS,
  },
}

const DATE_FIELD_IDS = new Set(['due_date', 'start_date'])

export type FieldActivityVisualKind = 'priority' | 'multi_select' | 'rating' | 'currency' | null

export type ActivityCurrencyDisplay = {
  amount: number
  currencyCode: string
  formatted: string
}

export function findFieldDefForActivity(
  allFields: FieldDef[],
  fieldId: string,
): FieldDef | undefined {
  return allFields.find((f) => f.id === fieldId) ?? SYSTEM_FIELD_DEFS[fieldId]
}

export function inferFieldTypeForActivity(
  fieldId: string,
  fieldDef: FieldDef | undefined,
  value: unknown,
): FieldType | null {
  if (fieldDef?.type) return fieldDef.type
  if (DATE_FIELD_IDS.has(fieldId)) return 'date'
  if (fieldId === 'priority') return 'select'
  if (fieldId === 'tags') return 'multi_select'
  if (typeof value === 'boolean' || value === 'true' || value === 'false') return 'checkbox'
  if (Array.isArray(value)) return 'multi_select'
  return null
}

function fallbackIdLabel(id: string): string {
  return id
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function resolveSelectOption(value: unknown, options?: SelectOption[]): SelectOption | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (!id) return null
  const fromOptions = options?.find((o) => o.id === id)
  if (fromOptions) return fromOptions
  return { id, label: fallbackIdLabel(id) }
}

export function resolveMultiSelectOptions(
  value: unknown,
  options?: SelectOption[],
): SelectOption[] {
  if (!Array.isArray(value) || value.length === 0) return []
  return value
    .map((entry) => {
      if (typeof entry !== 'string' && typeof entry !== 'number') return null
      const id = String(entry).trim()
      if (!id) return null
      return options?.find((o) => o.id === id) ?? { id, label: fallbackIdLabel(id) }
    })
    .filter((o): o is SelectOption => o != null)
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function readCurrencyCode(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'currency' in value) {
    return String((value as { currency: string }).currency) || 'USD'
  }
  return 'USD'
}

function readCurrencyAmount(value: unknown): number | null {
  if (typeof value === 'object' && value !== null && 'amount' in value) {
    return toNumber((value as { amount: unknown }).amount)
  }
  return toNumber(value)
}

export function parseActivityCurrency(value: unknown): ActivityCurrencyDisplay | null {
  const amount = readCurrencyAmount(value)
  if (amount == null) return null
  const currencyCode = readCurrencyCode(value)
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount)
    return { amount, currencyCode, formatted }
  } catch {
    return { amount, currencyCode, formatted: String(amount) }
  }
}

export function parseActivityRating(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
  if (Number.isNaN(n)) return null
  const rounded = Math.round(n * 2) / 2
  if (rounded < 0.5 || rounded > 5) return null
  return rounded
}

export function getFieldActivityVisualKind(
  fieldId: string,
  fieldDef: FieldDef | undefined,
  fieldType: FieldType | null,
  to: unknown,
): FieldActivityVisualKind {
  if (fieldId === 'priority') {
    return resolveSelectOption(to, fieldDef?.options ?? BUILTIN_PRIORITY_OPTIONS)
      ? 'priority'
      : null
  }
  if (fieldType === 'rating' && parseActivityRating(to) != null) return 'rating'
  if (fieldType === 'currency' && parseActivityCurrency(to) != null) return 'currency'
  if (fieldType === 'multi_select' && resolveMultiSelectOptions(to, fieldDef?.options).length > 0) {
    return 'multi_select'
  }
  return null
}

export function shouldShowFieldActivityVisual(
  fieldId: string,
  allFields: FieldDef[],
  to: unknown,
): boolean {
  const fieldDef = findFieldDefForActivity(allFields, fieldId)
  const fieldType = inferFieldTypeForActivity(fieldId, fieldDef, to)
  return getFieldActivityVisualKind(fieldId, fieldDef, fieldType, to) != null
}
