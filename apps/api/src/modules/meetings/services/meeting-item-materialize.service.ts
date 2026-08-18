import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildMeetingCallIdentity,
  resolveMeetingCallKind,
  shouldReplaceMeetingCallKind,
  type MeetingCallIdentity,
} from '../domain/meeting-call-kind'
import { callStatusWhenInviteMoved, inviteTimesMoved } from '../domain/meeting-call-status'
import {
  meetingHostCustomData,
  resolveMeetingHost,
  shouldStampMeetingHost,
} from '../domain/meeting-host'
import {
  MeetingWorkspaceResolutionRepository,
  type ScheduledMeetingEvent,
} from '../repositories/meeting-workspace-resolution.repository'

export const MAX_MATERIALIZE_EVENTS = 80

@Injectable()
export class MeetingItemMaterializeService {
  private readonly logger = new Logger(MeetingItemMaterializeService.name)

  constructor(private readonly resolutionRepository: MeetingWorkspaceResolutionRepository) {}

  async materializeScheduledMeetings(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      orgId: string | null
      events: ScheduledMeetingEvent[]
    },
  ): Promise<{ created: number; linked: number; skipped: number }> {
    const events = input.events.slice(0, MAX_MATERIALIZE_EVENTS)
    const orgId = await this.resolutionRepository.findSpaceOrgId(supabase, input.spaceId)
    const profile = await this.resolutionRepository.findCallIdentityProfile(
      supabase,
      input.userId,
      orgId,
    )
    const identity = buildMeetingCallIdentity({
      email: profile.email,
      fathomAliases: profile.fathomAliases,
      fullName: profile.fullName,
      internalDomains: profile.internalDomains,
    })
    let created = 0
    let linked = 0
    let skipped = 0
    for (const event of events) {
      try {
        const result = await this.ensureScheduledMeetingItem(supabase, {
          spaceId: input.spaceId,
          userId: input.userId,
          orgId,
          identity,
          event,
        })
        if (result === 'created') created += 1
        else if (result === 'linked') linked += 1
        else skipped += 1
      } catch (error) {
        skipped += 1
        this.logger.warn(
          `Materialize skipped ${event.calendarEventId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }
    return { created, linked, skipped }
  }

  private async ensureScheduledMeetingItem(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      orgId: string | null
      identity: MeetingCallIdentity
      event: ScheduledMeetingEvent
    },
  ): Promise<'created' | 'linked' | 'skipped'> {
    const icalUid = text(input.event.icalUid)
    let existing =
      (await this.resolutionRepository.findCallItemByCalendarEventId(supabase, {
        spaceId: input.spaceId,
        userId: input.userId,
        calendarEventId: input.event.calendarEventId,
      })) ?? null
    if (!existing && icalUid) {
      existing = await this.resolutionRepository.findCallItemByIcalUid(
        supabase,
        input.spaceId,
        icalUid,
      )
    }
    if (!existing) {
      existing = await this.resolutionRepository.findBestExistingCallForEvent(supabase, {
        spaceId: input.spaceId,
        userId: input.userId,
        calendarEventId: input.event.calendarEventId,
        icalUid,
        title: input.event.title,
        start: input.event.start,
      })
    }
    const callKind = resolveMeetingCallKind({
      identity: input.identity,
      recordedByEmail: '',
      attendees: input.event.attendees,
      attendeeLabels: input.event.attendees.map(
        (attendee) => attendee.name?.trim() || attendee.email.trim(),
      ),
      titleHint: input.event.title,
      summary: input.event.description,
    })
    if (!existing) {
      await this.resolutionRepository.createScheduledMeeting(supabase, {
        spaceId: input.spaceId,
        userId: input.userId,
        orgId: input.orgId,
        event: input.event,
        callKind,
      })
      return 'created'
    }
    await this.syncExistingCall(supabase, existing, input.event, callKind)
    return 'linked'
  }

  private async syncExistingCall(
    supabase: SupabaseClient,
    existing: Record<string, unknown>,
    event: ScheduledMeetingEvent,
    callKind: ReturnType<typeof resolveMeetingCallKind>,
  ): Promise<void> {
    const meetingItemId = text(existing.id)
    if (!meetingItemId) return
    const customData = record(existing.custom_data)
    const patch: Record<string, unknown> = {}
    const icalUid = text(event.icalUid)
    if (!text(customData.calendar_event_id)) patch.calendar_event_id = event.calendarEventId
    if (icalUid && !text(customData.ical_uid)) patch.ical_uid = icalUid
    if (shouldStampMeetingHost(customData)) {
      Object.assign(
        patch,
        meetingHostCustomData(resolveMeetingHost({ organizer: event.organizer })),
      )
    }
    if (shouldReplaceMeetingCallKind(customData)) {
      patch.call_kind = callKind
      patch.call_kind_source = 'automatic'
    }
    if (inviteTimesMoved(text(customData.call_date), event.start)) {
      const nextStatus = callStatusWhenInviteMoved(customData.call_status)
      if (nextStatus) patch.call_status = nextStatus
      patch.call_date = event.start
      patch.call_end = event.end
    }
    if (Object.keys(patch).length === 0) return
    await this.resolutionRepository.patchMeetingItemCustomData(
      supabase,
      meetingItemId,
      customData,
      patch,
    )
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
