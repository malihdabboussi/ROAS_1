import type { FieldDef, FieldType } from '@/features/spaces/types/space-schema'
import type { FormQuestion, FormQuestionOption, FormQuestionType } from '@/lib/forms/forms-api'
import { DEFAULT_CONTACT_SUBFIELDS } from './contact-subfields'

/** Field types each question type can bind to. First entry is the "Create new" default. */
export const QUESTION_FIELD_TYPES_MAP: Partial<Record<FormQuestionType, FieldType[]>> = {
  short_text: ['text'],
  long_text: ['text'],
  number: ['number'],
  dates: ['date'],
  single_select: ['select', 'checkbox'],
  multi_select: ['multi_select'],
  checkbox: ['checkbox'],
  contact: ['contact'],
  people: ['assignee'],
  uploads: ['media'],
  signature: ['media'],
}

/** Reverse: given a bound field type, what FormQuestionType should we use to render it. */
const FIELD_TO_QUESTION_TYPE: Partial<Record<FieldType, FormQuestionType>> = {
  text: 'short_text',
  number: 'number',
  date: 'dates',
  select: 'single_select',
  multi_select: 'multi_select',
  checkbox: 'checkbox',
  contact: 'contact',
  assignee: 'people',
  media: 'uploads',
}

export function fieldTypesForQuestion(type: FormQuestionType): FieldType[] {
  return QUESTION_FIELD_TYPES_MAP[type] ?? []
}

export function fieldTypeForQuestion(type: FormQuestionType): FieldType | null {
  return QUESTION_FIELD_TYPES_MAP[type]?.[0] ?? null
}

export function defaultFormSelectOptions(): FormQuestionOption[] {
  return [
    { id: 'opt_1', label: 'Option 1', color: 'purple' },
    { id: 'opt_2', label: 'Option 2', color: 'blue' },
  ]
}

/**
 * Maps space field options onto form question options. Treats null, undefined, and [] as missing
 * so we fall back to previous question options or defaults (empty array is not valid with `??`).
 * Preserves `color` and `group` like tags, status, and category fields in spaces.
 */
export function resolveFormSelectOptions(
  field: FieldDef | null | undefined,
  previous?: FormQuestionOption[] | undefined,
): FormQuestionOption[] {
  const raw = field?.options
  if (raw && raw.length > 0) {
    return raw.map((o) => ({
      id: o.id,
      label: o.label,
      ...(o.color != null ? { color: o.color } : {}),
      ...(o.group != null ? { group: o.group } : {}),
    }))
  }
  if (previous && previous.length > 0) return previous
  return defaultFormSelectOptions()
}

export function buildBoundQuestion(type: FormQuestionType, field?: FieldDef | null): FormQuestion {
  const effectiveType: FormQuestionType = field
    ? (FIELD_TO_QUESTION_TYPE[field.type] ?? type)
    : type
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: effectiveType,
    label:
      field?.name ?? (effectiveType === 'info_block' ? 'Information Block' : 'Untitled question'),
    required: false,
    property_field_id: field?.id,
    options:
      effectiveType === 'single_select' || effectiveType === 'multi_select'
        ? resolveFormSelectOptions(field ?? null, undefined)
        : undefined,
    contact_subfields: effectiveType === 'contact' ? [...DEFAULT_CONTACT_SUBFIELDS] : undefined,
  }
}

/**
 * Re-bind an existing question to a new space field (or clear binding when `field` is null).
 * Preserves id, required, hidden, description; replaces type, label, options, contact subfields.
 */
export function applyFieldBindingToQuestion(
  question: FormQuestion,
  field: FieldDef | null,
): FormQuestion {
  if (!field) {
    return { ...question, property_field_id: undefined }
  }
  const effectiveType: FormQuestionType = FIELD_TO_QUESTION_TYPE[field.type] ?? question.type
  const isSelect = effectiveType === 'single_select' || effectiveType === 'multi_select'
  return {
    ...question,
    type: effectiveType,
    label: field.name,
    property_field_id: field.id,
    options: isSelect ? resolveFormSelectOptions(field, undefined) : undefined,
    contact_subfields:
      effectiveType === 'contact'
        ? (question.contact_subfields ?? [...DEFAULT_CONTACT_SUBFIELDS])
        : undefined,
  }
}
