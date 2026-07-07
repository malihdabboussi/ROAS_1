import type { ActionParamType } from './artifact-action-schemas'

export const DOCUMENT_SPACE_ITEM_RESERVED_FIELD_KEYS = [
  'status',
  'priority',
  'assignee_type',
  'assignee_id',
  'start_date',
  'due_date',
  'description',
  'notes',
  'parent_item_id',
  'sort_order',
  'recurrence',
] as const

export const DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS = [
  ...DOCUMENT_SPACE_ITEM_RESERVED_FIELD_KEYS,
  'category',
  'custom_data',
] as const

export type DocumentSpaceItemInputFieldKey = (typeof DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS)[number]

export const DOCUMENT_SPACE_ITEM_FIELD_TYPES = {
  status: 'string',
  priority: 'string',
  category: 'string',
  assignee_type: 'string',
  assignee_id: 'string',
  start_date: 'iso_date',
  due_date: 'iso_date',
  description: 'string',
  notes: 'string',
  parent_item_id: 'string',
  sort_order: 'number',
  recurrence: 'object',
  custom_data: 'object',
} satisfies Partial<Record<DocumentSpaceItemInputFieldKey, ActionParamType>>
