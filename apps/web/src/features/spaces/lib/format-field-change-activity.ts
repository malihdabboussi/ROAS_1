import { resolveStatusLabelFromId } from '../components/space-item-values'
import {
  formatFileFieldActivityLabel,
  formatUrlFieldActivityLabel,
  isPlainTextActivityFieldId,
} from '../components/task-detail/TaskActivityFilePreview'
import type { RecurrenceSpec } from '../types'
import type { FieldDef, FieldType } from '../types/space-schema'
import { describeRecurrence } from '../utils/recurrence'
import {
  BUILTIN_PRIORITY_OPTIONS,
  findFieldDefForActivity,
  getFieldActivityVisualKind,
  inferFieldTypeForActivity,
  parseActivityCurrency,
  parseActivityRating,
} from './field-activity-value'

const DATE_FIELD_IDS = new Set(['due_date', 'start_date'])

function resolveFieldLabel(fieldId: string, resolveFieldLabelFn: (id: string) => string): string {
  return resolveFieldLabelFn(fieldId)
}

function isCheckboxChecked(value: unknown): boolean {
  return value === true || value === 'true'
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function formatActivityDateValue(value: unknown): string | null {
  const date = parseDate(value)
  if (!date) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function formatRatingDisplay(value: unknown): string | null {
  const n = parseActivityRating(value)
  return n != null ? String(n) : null
}

function formatProgressDisplay(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return `${Math.round(Math.max(0, Math.min(100, value)))}%`
  }
  if (typeof value === 'object' && value !== null && 'pct' in value) {
    const pct = toNumber((value as { pct: unknown }).pct)
    if (pct == null) return null
    return `${Math.round(Math.max(0, Math.min(100, pct)))}%`
  }
  if (typeof value === 'string') {
    const pct = toNumber(value)
    if (pct != null) return `${Math.round(Math.max(0, Math.min(100, pct)))}%`
  }
  return null
}

function formatCurrencyDisplay(value: unknown): string | null {
  return parseActivityCurrency(value)?.formatted ?? null
}

function formatSelectDisplay(
  value: unknown,
  fieldId: string,
  fieldDef: FieldDef | undefined,
): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  const options = fieldId === 'priority' ? BUILTIN_PRIORITY_OPTIONS : fieldDef?.options
  const option = options?.find((o) => o.id === value)
  return option?.label ?? value
}

function formatMultiSelectDisplay(value: unknown, fieldDef: FieldDef | undefined): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const labels = value
    .map((entry) => {
      const id = String(entry)
      return fieldDef?.options?.find((o) => o.id === id)?.label ?? id
    })
    .filter((label) => label.length > 0)
  return labels.length > 0 ? labels.join(', ') : null
}

function formatRecurrenceDisplay(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'object') return null
  const label = describeRecurrence(value as RecurrenceSpec)
  return label.trim().length > 0 ? label : null
}

function formatValueForFieldType(
  value: unknown,
  fieldType: FieldType | null,
  fieldDef: FieldDef | undefined,
  fieldId: string,
): string | null {
  switch (fieldType) {
    case 'checkbox':
      return isCheckboxChecked(value) ? 'checked' : 'unchecked'
    case 'rating':
      return formatRatingDisplay(value)
    case 'progress':
      return formatProgressDisplay(value)
    case 'number':
      return toNumber(value) != null ? String(toNumber(value)) : null
    case 'currency':
      return formatCurrencyDisplay(value)
    case 'date':
      return formatActivityDateValue(value)
    case 'select':
      return formatSelectDisplay(value, fieldId, fieldDef)
    case 'multi_select':
      return formatMultiSelectDisplay(value, fieldDef)
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return typeof value === 'string' && value.trim() ? value.trim() : null
    default:
      if (DATE_FIELD_IDS.has(fieldId)) return formatActivityDateValue(value)
      if (fieldId === 'recurrence') return formatRecurrenceDisplay(value)
      if (fieldId === 'priority') return formatSelectDisplay(value, fieldId, undefined)
      if (fieldId === 'tags') return formatMultiSelectDisplay(value, fieldDef)
      return null
  }
}

function isEmptyFieldValue(value: unknown, fieldType: FieldType | null, fieldId: string): boolean {
  if (value == null || value === '') return true
  if (fieldType === 'checkbox') return !isCheckboxChecked(value)
  if (fieldType === 'multi_select' && Array.isArray(value) && value.length === 0) return true
  if (fieldType === 'progress' && formatProgressDisplay(value) == null) return true
  if (fieldType === 'rating' && formatRatingDisplay(value) == null) return true
  if (fieldType === 'currency' && formatCurrencyDisplay(value) == null) return true
  if (fieldType === 'number' && toNumber(value) == null) return true
  if (
    (fieldType === 'date' || DATE_FIELD_IDS.has(fieldId)) &&
    formatActivityDateValue(value) == null
  ) {
    return true
  }
  return false
}

/** Activity row label for `field_change` (after URL/file-specific handlers). */
export function formatFieldChangeActivityLabel(
  payload: Record<string, unknown>,
  allFields: FieldDef[],
  resolveFieldLabelFn: (fieldId: string) => string,
): string | null {
  const fieldId = typeof payload.field === 'string' ? payload.field : ''
  if (!fieldId) return null

  if (formatUrlFieldActivityLabel(payload, resolveFieldLabelFn)) return null
  if (formatFileFieldActivityLabel(payload, resolveFieldLabelFn)) return null
  if (isPlainTextActivityFieldId(fieldId)) return null

  const fieldDef = findFieldDefForActivity(allFields, fieldId)
  const fieldLabel = resolveFieldLabel(fieldId, resolveFieldLabelFn)
  const fieldType = inferFieldTypeForActivity(fieldId, fieldDef, payload.to)
  const to = payload.to

  if (fieldType === 'checkbox') {
    return isCheckboxChecked(to) ? 'checked the box' : 'unchecked the box'
  }

  const visualKind = getFieldActivityVisualKind(fieldId, fieldDef, fieldType, to)
  const display = formatValueForFieldType(to, fieldType, fieldDef, fieldId)
  if (display) {
    if (visualKind) return `updated ${fieldLabel}`
    return `updated ${fieldLabel} to ${display}`
  }

  if (isEmptyFieldValue(to, fieldType, fieldId)) {
    return `cleared ${fieldLabel}`
  }

  return null
}

/** `status_change` row label using schema status option labels when available. */
export function formatStatusChangeActivityLabel(
  payload: Record<string, unknown> | undefined,
  allFields: FieldDef[],
): string {
  const to = payload?.to
  if (!to) return 'changed status'
  const statusField = findFieldDefForActivity(allFields, 'status')
  const label = resolveStatusLabelFromId(String(to), statusField)
  return `changed status to ${label}`
}
