/**
 * Persist Speaker N → person bindings on a Fathom meeting space item and refresh Attendees.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applySpeakerRemapsToLabels,
  isJunkSpeakerLabel,
  upsertAttendeeTagOptions,
  type SpeakerRemapBinding,
  type SpeakerRemapMap,
} from './fathom-meeting-item-enrichment'

export async function applySpeakerRemapToMeetingItem(input: {
  supabase: SupabaseClient
  repo: {
    findSpaceById: (
      supabase: SupabaseClient,
      userId: string,
      spaceId: string,
      orgId: string | null,
    ) => Promise<unknown>
    updateSpace: (
      supabase: SupabaseClient,
      userId: string,
      spaceId: string,
      patch: { schema: never },
      orgId: string | null,
    ) => Promise<unknown>
    updateItem: (
      supabase: SupabaseClient,
      userId: string,
      spaceId: string,
      itemId: string,
      patch: Record<string, unknown>,
      orgId: string | null,
    ) => Promise<unknown>
    getItem?: (
      supabase: SupabaseClient,
      userId: string,
      spaceId: string,
      itemId: string,
      orgId: string | null,
    ) => Promise<unknown>
  }
  userId: string
  orgId: string | null
  spaceId: string
  itemId: string
  item: Record<string, unknown>
  speakerKey: string
  binding: SpeakerRemapBinding
}): Promise<Record<string, unknown>> {
  const speakerKey = input.speakerKey.trim()
  if (!speakerKey || !isJunkSpeakerLabel(speakerKey)) {
    throw new Error('speakerKey must be a junk speaker label like "Speaker 1"')
  }
  const label = String(input.binding.label ?? '').trim()
  if (!label || isJunkSpeakerLabel(label)) {
    throw new Error('binding.label must be a real person name')
  }

  const custom =
    input.item.custom_data && typeof input.item.custom_data === 'object'
      ? ({ ...(input.item.custom_data as Record<string, unknown>) } as Record<string, unknown>)
      : {}

  const existingRemaps =
    custom.speaker_remaps && typeof custom.speaker_remaps === 'object'
      ? ({ ...(custom.speaker_remaps as SpeakerRemapMap) } as SpeakerRemapMap)
      : {}
  existingRemaps[speakerKey] = {
    label,
    email: input.binding.email ?? null,
    contact_id: input.binding.contact_id ?? null,
  }

  const unresolvedRaw = Array.isArray(custom.unresolved_speakers)
    ? (custom.unresolved_speakers as unknown[]).map((v) => String(v))
    : []
  const unresolved = unresolvedRaw.filter((s) => s !== speakerKey)

  const space = (await input.repo.findSpaceById(
    input.supabase,
    input.userId,
    input.spaceId,
    input.orgId,
  )) as Record<string, unknown> | null
  const schema = (
    space?.schema && typeof space.schema === 'object'
      ? (space.schema as Record<string, unknown>)
      : null
  ) as Record<string, unknown> | null

  const attendeesField = Array.isArray(schema?.fields)
    ? ((schema!.fields as unknown[]).find(
        (f) =>
          f && typeof f === 'object' && String((f as { id?: unknown }).id ?? '') === 'attendees',
      ) as { options?: Array<{ id: string; label: string }> } | undefined)
    : undefined
  const currentOptionIds = Array.isArray(custom.attendees)
    ? (custom.attendees as unknown[]).map((id) => String(id))
    : []
  const currentLabels = currentOptionIds
    .map((id) => attendeesField?.options?.find((opt) => opt.id === id)?.label)
    .filter((v): v is string => !!v)
  const withoutJunk = currentLabels.filter((l) => !isJunkSpeakerLabel(l) && l !== speakerKey)
  const nextLabels = applySpeakerRemapsToLabels([...withoutJunk, label], existingRemaps)

  const upserted = upsertAttendeeTagOptions(schema, nextLabels)
  if (upserted.optionsChanged && upserted.nextSchema) {
    await input.repo.updateSpace(
      input.supabase,
      input.userId,
      input.spaceId,
      { schema: upserted.nextSchema as never },
      input.orgId,
    )
  }

  const nextCustom = {
    ...custom,
    speaker_remaps: existingRemaps,
    unresolved_speakers: unresolved,
    ...(upserted.optionIds.length > 0 ? { attendees: upserted.optionIds } : {}),
  }

  return (await input.repo.updateItem(
    input.supabase,
    input.userId,
    input.spaceId,
    input.itemId,
    { custom_data: nextCustom },
    input.orgId,
  )) as Record<string, unknown>
}
