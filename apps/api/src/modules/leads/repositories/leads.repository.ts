import { LeadsRepositoryBase07 } from './leads-repository-07.base'
import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveConversationChannel } from '../lib/conversation-channel'

function contactActivityValueChanged(before: unknown, after: unknown): boolean {
  if (before === after) return false
  if (before == null && after == null) return false
  if (typeof before === 'object' || typeof after === 'object') {
    return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)
  }
  return true
}

/** Most-recent rows fetched per activity source (memberships, notes, field changes). */
const ACTIVITY_SOURCE_LIMIT = 200

/** Messages embedded per conversation for timeline previews. */
const CONVERSATION_PREVIEW_MESSAGE_LIMIT = 3

/** Max characters returned for the CRM list latest-note preview column. */
const NOTE_PREVIEW_MAX_LENGTH = 500

@Injectable()
export class LeadsRepository extends LeadsRepositoryBase07 {}
