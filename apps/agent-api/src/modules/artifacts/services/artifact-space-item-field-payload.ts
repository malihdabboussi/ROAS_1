import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactTasksRepository } from '../repositories/artifact-tasks.repository'
import {
  DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS,
  DOCUMENT_SPACE_ITEM_RESERVED_FIELD_KEYS,
} from './artifact-space-item-field-contract'
import { ArtifactTaskSchemaHelper } from './artifact-task-schema-helper'

const tasksRepository = new ArtifactTasksRepository()
const taskSchema = new ArtifactTaskSchemaHelper()

export function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function hasDocumentSpaceItemFieldInput(input: Record<string, unknown>): boolean {
  return DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS.some((key) => input[key] !== undefined)
}

export async function buildDocumentSpaceItemFieldPayload(
  supabase: SupabaseClient,
  spaceId: string,
  input: Record<string, unknown>,
): Promise<{ payload: Record<string, unknown>; warnings: string[] }> {
  if (!hasDocumentSpaceItemFieldInput(input)) return { payload: {}, warnings: [] }

  const { data: space, error } = await tasksRepository.findSpace(supabase, spaceId)
  if (error) throw error
  if (!space) throw new Error('Space not found')

  const schema = taskSchema.schemaFromSpace(space)
  const normalizeResult = taskSchema.normalizeTaskWriteInputAgainstSchema(schema, input)
  if (normalizeResult.error) throw new Error(normalizeResult.error)
  const normalizedInput = normalizeResult.input ?? input

  const validation = taskSchema.validateAgainstSchema(schema, normalizedInput)
  if (validation.error) throw new Error(validation.error)

  const payload: Record<string, unknown> = {}
  for (const key of DOCUMENT_SPACE_ITEM_RESERVED_FIELD_KEYS) {
    if (normalizedInput[key] !== undefined) payload[key] = normalizedInput[key]
  }
  if (normalizedInput.custom_data !== undefined) {
    payload.custom_data = recordFrom(normalizedInput.custom_data)
  }
  return { payload, warnings: validation.warnings }
}
