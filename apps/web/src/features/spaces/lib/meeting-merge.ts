import type { SpaceItem } from '../types'
import { resolveSpaceEntryType } from './apply-space-toolbar-filters'

/** Recording evidence only — join links (video_url) don't count. */
export function meetingHasRecording(item: SpaceItem): boolean {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  return Boolean(
    cd.recording_url || cd.fathom_url || cd.fathom_meeting_id || cd.external_automation,
  )
}

/** Merge needs 2+ same-space items that all resolve to meeting calls. */
export function canMergeMeetingSelection(items: SpaceItem[]): boolean {
  if (items.length < 2) return false
  const spaceId = items[0]!.space_id
  return items.every((item) => item.space_id === spaceId && resolveSpaceEntryType(item) === 'call')
}

/** Default survivor: has a recording, then most-filled fields, then oldest. */
export function rankMergeSurvivorId(items: SpaceItem[]): string | null {
  if (items.length === 0) return null
  const ranked = [...items].sort((a, b) => {
    const recording = Number(meetingHasRecording(b)) - Number(meetingHasRecording(a))
    if (recording !== 0) return recording
    const filled = filledFieldCount(b) - filledFieldCount(a)
    if (filled !== 0) return filled
    return String(a.created_at).localeCompare(String(b.created_at))
  })
  return ranked[0]?.id ?? null
}

function filledFieldCount(item: SpaceItem): number {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  return Object.values(cd).filter(
    (value) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0),
  ).length
}
