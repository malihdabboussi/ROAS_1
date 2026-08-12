import type { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingsPrecallPrepService } from '../../spaces/services/meetings-precall-prep.service'
import type { CalendarAgendaEvent } from './integrations-calendar.service'

/**
 * Attach prep + related-call enrichment onto agenda events, append unmatched
 * Fathom rows, and re-dedupe (shared by personal and team agenda). Failures
 * are logged and leave the events unchanged — the agenda still works without
 * prep / related / Fathom enrichment.
 */
export async function enrichAgendaWithPrecall(input: {
  precallPrep: Pick<MeetingsPrecallPrepService, 'enrichAgendaEvents' | 'enrichAgendaRelatedCalls'>
  supabase: SupabaseClient
  userId: string
  orgId: string | null
  events: CalendarAgendaEvent[]
  start: string
  end: string
  dedupe: (events: CalendarAgendaEvent[]) => CalendarAgendaEvent[]
  logger: Logger
  label: string
}): Promise<CalendarAgendaEvent[]> {
  const { precallPrep, supabase, userId, orgId, events } = input
  try {
    const [prepMap, relatedResult] = await Promise.all([
      events.length > 0
        ? precallPrep.enrichAgendaEvents({ supabase, userId, orgId, events })
        : Promise.resolve(new Map()),
      precallPrep.enrichAgendaRelatedCalls({
        supabase,
        userId,
        orgId,
        events,
        start: input.start,
        end: input.end,
      }),
    ])
    for (const event of events) {
      event.prep = prepMap.get(event.id) ?? null
      event.related = relatedResult.relatedByEventId.get(event.id) ?? null
    }
    return input.dedupe([
      ...events,
      ...(relatedResult.unmatchedFathomEvents as CalendarAgendaEvent[]),
    ])
  } catch (error) {
    input.logger.warn(
      `${input.label} prep/related enrichment failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    return events
  }
}
