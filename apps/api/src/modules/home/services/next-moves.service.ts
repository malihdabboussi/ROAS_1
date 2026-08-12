import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { NextMovesRepository } from '../repositories/next-moves.repository'

const MAX_NEXT_MOVES = 12
const DAY_MS = 86_400_000

export type NextMoveSnoozeDuration = 'week' | 'dismiss'

@Injectable()
export class NextMovesService {
  constructor(private readonly repository: NextMovesRepository) {}

  async list(supabase: SupabaseClient, scope: RequestScope) {
    const [candidates, snoozed] = await Promise.all([
      this.repository.listCandidates(supabase, scope),
      this.repository.listSnoozedKeys(supabase, scope),
    ])
    return {
      suggestions: candidates
        .filter((item) => !snoozed.has(this.key(item.id)))
        .slice(0, MAX_NEXT_MOVES)
        .map((item) => ({
          id: item.id,
          title: item.title,
          prompt: `Open the source call "${item.meetingTitle}" and help me complete this action item: ${item.title}. Use the call context and show me a draft before taking any external action.`,
          source: {
            type: 'meeting' as const,
            title: item.meetingTitle,
            occurredAt: item.meetingDate,
            spaceId: item.spaceId,
            meetingItemId: item.meetingItemId,
          },
        })),
    }
  }

  async snooze(
    supabase: SupabaseClient,
    scope: RequestScope,
    id: string,
    duration: NextMoveSnoozeDuration,
  ): Promise<{ success: true }> {
    const days = duration === 'week' ? 7 : 3650
    const snoozedUntil = new Date(Date.now() + days * DAY_MS).toISOString()
    await this.repository.upsertSnooze(supabase, scope, this.key(id), snoozedUntil)
    return { success: true }
  }

  private key(id: string): string {
    return `next_move:${id}`
  }
}
