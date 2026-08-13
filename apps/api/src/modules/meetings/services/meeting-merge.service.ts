import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildMeetingConversationId } from '../domain/meeting-conversation-id'
import { buildMeetingMergeSurvivorPatch, isMeetingCallItem } from '../domain/meeting-merge-plan'
import { MeetingMergeRepository } from '../repositories/meeting-merge.repository'
import { MeetingConversationDeduplicationService } from './meeting-conversation-deduplication.service'

export interface MergeMeetingsInput {
  spaceId: string
  userId: string
  survivorItemId: string
  duplicateItemIds: string[]
}

@Injectable()
export class MeetingMergeService {
  constructor(
    private readonly repo: MeetingMergeRepository,
    private readonly conversationDedup: MeetingConversationDeduplicationService,
  ) {}

  async mergeMeetings(
    supabase: SupabaseClient,
    input: MergeMeetingsInput,
  ): Promise<Record<string, unknown>> {
    const duplicateIds = [...new Set(input.duplicateItemIds)].filter(
      (id) => id !== input.survivorItemId,
    )
    if (duplicateIds.length === 0) {
      throw new BadRequestException('Select at least one duplicate meeting to merge')
    }

    const itemIds = [input.survivorItemId, ...duplicateIds]
    const rows = await this.repo.listMeetingItems(supabase, input.spaceId, itemIds)
    const rowsById = new Map(rows.map((row) => [String(row.id), row]))
    if (itemIds.some((id) => !rowsById.has(id))) {
      throw new NotFoundException('Meeting not found in this space')
    }

    const survivor = rowsById.get(input.survivorItemId)!
    const duplicates = duplicateIds.map((id) => rowsById.get(id)!)
    if (![survivor, ...duplicates].every((row) => isMeetingCallItem(row))) {
      throw new BadRequestException('Only meeting call items can be merged')
    }

    // Oldest duplicate fills gaps first — it is closest to the original event.
    const orderedDuplicates = [...duplicates].sort((a, b) =>
      String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')),
    )
    const survivorPatch = buildMeetingMergeSurvivorPatch(survivor, orderedDuplicates)

    const summary = await this.repo.mergeMeetingItems(supabase, {
      spaceId: input.spaceId,
      survivorItemId: input.survivorItemId,
      duplicateItemIds: orderedDuplicates.map((row) => String(row.id)),
      survivorPatch,
    })

    await this.archiveDuplicateConversations(
      supabase,
      input,
      orderedDuplicates.map((row) => String(row.id)),
    )

    return { survivor_item_id: input.survivorItemId, ...summary }
  }

  private async archiveDuplicateConversations(
    supabase: SupabaseClient,
    input: MergeMeetingsInput,
    duplicateIds: string[],
  ): Promise<void> {
    const keepConversationId = buildMeetingConversationId(input.survivorItemId)
    for (const duplicateId of duplicateIds) {
      try {
        await this.conversationDedup.archiveDuplicates(supabase, {
          userId: input.userId,
          meetingItemId: duplicateId,
          keepConversationId,
        })
      } catch {
        // Best-effort: the merge already committed; a failed chat archive must not undo it.
      }
    }
  }
}
