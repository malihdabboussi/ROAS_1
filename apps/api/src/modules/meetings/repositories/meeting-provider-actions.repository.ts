import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  findMatchingMeetingAction,
  normalizeMeetingActionText,
} from '../domain/meeting-action-dedupe'
import type { CanonicalMeetingAssignee } from '../domain/meeting-assignee-identity'
import type { FathomSourceAction } from '../providers/fathom-meeting-source'

type MeetingScope = {
  meetingItemId: string
  spaceId: string
  userId: string
  orgId: string | null
}

@Injectable()
export class MeetingProviderActionsRepository {
  async upsertProviderActions(
    supabase: SupabaseClient,
    input: MeetingScope & {
      recordingId: string
      actions: FathomSourceAction[]
      assignees: Map<string, CanonicalMeetingAssignee>
    },
  ): Promise<string[]> {
    if (input.actions.length === 0) return []

    const { data: existingRows, error: existingError } = await supabase
      .from('meeting_actions')
      .select('*')
      .eq('meeting_item_id', input.meetingItemId)
      .neq('status', 'dismissed')
    if (existingError) throw new BadRequestException(existingError.message)
    const existing = (existingRows as Record<string, unknown>[]) ?? []

    const matchedIds: string[] = []
    const payload: Record<string, unknown>[] = []
    const claimedTexts = new Set(
      existing
        .map((row) =>
          normalizeMeetingActionText(
            typeof row.title === 'string'
              ? row.title
              : typeof row.source_text === 'string'
                ? row.source_text
                : '',
          ),
        )
        .filter(Boolean),
    )
    for (const action of input.actions) {
      const normalized = normalizeMeetingActionText(action.sourceText)
      const match = findMatchingMeetingAction(existing, action.sourceText)
      if (match || (normalized && claimedTexts.has(normalized))) {
        if (!match) continue
        const matchId = String(match.id)
        matchedIds.push(matchId)
        const evidence =
          match.evidence && typeof match.evidence === 'object' && !Array.isArray(match.evidence)
            ? (match.evidence as Record<string, unknown>)
            : {}
        const assignee = input.assignees.get(action.sourceKey) ?? null
        const { error: mergeError } = await supabase
          .from('meeting_actions')
          .update({
            source_recording_id: match.source_recording_id ?? input.recordingId,
            canonical_assignee_type: match.canonical_assignee_type ?? assignee?.type ?? null,
            canonical_assignee_id: match.canonical_assignee_id ?? assignee?.id ?? null,
            canonical_assignee_name:
              match.canonical_assignee_name ?? assignee?.name ?? action.assigneeName,
            canonical_assignee_email:
              match.canonical_assignee_email ?? assignee?.email ?? action.assigneeEmail,
            evidence: {
              ...evidence,
              recording_timestamp: action.recordingTimestamp,
              recording_playback_url: action.recordingPlaybackUrl,
              provider: 'fathom',
              provider_assignee_name: action.assigneeName,
              provider_assignee_email: action.assigneeEmail,
              user_generated: action.userGenerated,
              cross_referenced_from: 'provider_recording',
              provider_source_key: action.sourceKey,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchId)
          .eq('meeting_item_id', input.meetingItemId)
        if (mergeError) throw new BadRequestException(mergeError.message)
        continue
      }

      if (normalized) claimedTexts.add(normalized)
      const assignee = input.assignees.get(action.sourceKey) ?? null
      payload.push({
        meeting_item_id: input.meetingItemId,
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        source_recording_id: input.recordingId,
        source_type: 'provider',
        source_key: action.sourceKey,
        source_text: action.sourceText,
        title: action.sourceText.slice(0, 1000),
        status: action.completed ? 'resolved' : 'confirmed',
        canonical_assignee_type: assignee?.type ?? null,
        canonical_assignee_id: assignee?.id ?? null,
        canonical_assignee_name: assignee?.name ?? action.assigneeName,
        canonical_assignee_email: assignee?.email ?? action.assigneeEmail,
        evidence: {
          recording_timestamp: action.recordingTimestamp,
          recording_playback_url: action.recordingPlaybackUrl,
          provider: 'fathom',
          provider_assignee_name: action.assigneeName,
          provider_assignee_email: action.assigneeEmail,
          user_generated: action.userGenerated,
        },
      })
    }

    if (payload.length === 0) return [...new Set(matchedIds)]

    const { data, error } = await supabase
      .from('meeting_actions')
      .upsert(payload, { onConflict: 'meeting_item_id,source_key' })
      .select('id')
    if (error) throw new BadRequestException(error.message)
    return [...new Set([...matchedIds, ...(data ?? []).map((row) => String(row.id))])]
  }
}
