'use client'

import { useMemo } from 'react'
import { Flag } from 'lucide-react'
import {
  BUILTIN_PRIORITY_OPTIONS,
  findFieldDefForActivity,
  getFieldActivityVisualKind,
  inferFieldTypeForActivity,
  parseActivityCurrency,
  parseActivityRating,
  resolveMultiSelectOptions,
  resolveSelectOption,
  shouldShowFieldActivityVisual,
} from '../../lib/field-activity-value'
import type { FieldDef } from '../../types/space-schema'
import { RatingStarsReadonly } from '../cells/RatingCell'
import { OptionBadge } from '../OptionBadge'

const PRIORITY_FLAG_COLOR: Record<string, string> = {
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  blue: 'text-blue-600 dark:text-blue-400',
  slate: 'text-slate-600 dark:text-slate-400',
  amber: 'text-amber-600 dark:text-amber-400',
  violet: 'text-violet-600 dark:text-violet-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
}

export function shouldRenderFieldValuePreview(
  payload: Record<string, unknown>,
  allFields: FieldDef[],
): boolean {
  const fieldId = typeof payload.field === 'string' ? payload.field : ''
  if (!fieldId) return false
  return shouldShowFieldActivityVisual(fieldId, allFields, payload.to)
}

function PriorityValuePreview({ option }: { option: { label: string; color?: string } }) {
  return (
    <span className="gap-spacing-1 flex min-w-0 items-center">
      <Flag
        className={`h-3.5 w-3.5 shrink-0 ${PRIORITY_FLAG_COLOR[option.color ?? ''] ?? 'text-[var(--color-muted-foreground)]'}`}
        fill="currentColor"
        aria-hidden
      />
      <span className="body-3 min-w-0 truncate text-[var(--color-foreground)]">{option.label}</span>
    </span>
  )
}

function CurrencyValuePreview({
  formatted,
  currencyCode,
}: {
  formatted: string
  currencyCode: string
}) {
  return (
    <span className="gap-spacing-1 flex min-w-0 items-baseline">
      <span className="body-3 font-medium text-[var(--color-foreground)]">{formatted}</span>
      {currencyCode !== 'USD' && (
        <span className="body-3 text-[var(--color-muted-foreground)]">{currencyCode}</span>
      )}
    </span>
  )
}

function TagsValuePreview({
  options,
}: {
  options: { id: string; label: string; color?: string }[]
}) {
  return (
    <div className="gap-spacing-1 flex min-w-0 flex-wrap items-center">
      {options.map((opt) => (
        <OptionBadge key={opt.id} option={opt} />
      ))}
    </div>
  )
}

export function TaskActivityFieldValuePreview({
  to,
  fieldId,
  allFields,
}: {
  to?: unknown
  fieldId?: string
  allFields: FieldDef[]
}) {
  const content = useMemo(() => {
    if (!fieldId) return null
    const fieldDef = findFieldDefForActivity(allFields, fieldId)
    const fieldType = inferFieldTypeForActivity(fieldId, fieldDef, to)
    const kind = getFieldActivityVisualKind(fieldId, fieldDef, fieldType, to)

    if (kind === 'priority') {
      const option = resolveSelectOption(to, fieldDef?.options ?? BUILTIN_PRIORITY_OPTIONS)
      if (!option) return null
      return <PriorityValuePreview option={option} />
    }

    if (kind === 'multi_select') {
      const options = resolveMultiSelectOptions(to, fieldDef?.options)
      if (options.length === 0) return null
      return <TagsValuePreview options={options} />
    }

    if (kind === 'rating') {
      const rating = parseActivityRating(to)
      if (rating == null) return null
      return <RatingStarsReadonly value={rating} size={14} />
    }

    if (kind === 'currency') {
      const currency = parseActivityCurrency(to)
      if (!currency) return null
      return (
        <CurrencyValuePreview formatted={currency.formatted} currencyCode={currency.currencyCode} />
      )
    }

    return null
  }, [to, fieldId, allFields])

  if (!content) return null

  return <div className="mt-spacing-1 flex min-w-0">{content}</div>
}
