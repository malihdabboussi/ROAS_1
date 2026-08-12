import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingCallKind } from '../domain/meeting-call-kind'
import { createInstantMeetingItem } from './create-instant-meeting-item'
import { MeetingCallMatchingRepository } from './meeting-call-matching.repository'

export type ScheduledMeetingEvent = {
  calendarEventId: string
  /** Stable iCalendar UID shared across providers/accounts; agenda row ids are not. */
  icalUid?: string | null
  title: string
  start: string
  end: string
  description?: string | null
  location?: string | null
  videoUrl?: string | null
  htmlLink?: string | null
  attendees: Array<{ email: string; name?: string | null }>
}

export type MeetingCallIdentityProfile = {
  email: string | null
  fathomAliases: string[]
  fullName: string | null
  internalDomains: string[]
}

@Injectable()
export class MeetingWorkspaceResolutionRepository {
  constructor(private readonly matching: MeetingCallMatchingRepository) {}

  async findSpaceOrgId(supabase: SupabaseClient, spaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('org_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return typeof data?.org_id === 'string' ? data.org_id : null
  }

  async findSpaceCampaignId(supabase: SupabaseClient, spaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('campaign_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return typeof data?.campaign_id === 'string' ? data.campaign_id : null
  }

  async findByCalendarEvent(
    supabase: SupabaseClient,
    spaceId: string,
    calendarEventId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('meeting_workspaces')
      .select('*')
      .eq('space_id', spaceId)
      .eq('calendar_event_id', calendarEventId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async findByIcalUid(
    supabase: SupabaseClient,
    spaceId: string,
    icalUid: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('meeting_workspaces')
      .select('*')
      .eq('space_id', spaceId)
      .eq('ical_uid', icalUid)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async findByMeetingItem(
    supabase: SupabaseClient,
    meetingItemId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('meeting_workspaces')
      .select('*')
      .eq('meeting_item_id', meetingItemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  async createScheduledMeeting(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      orgId: string | null
      event: ScheduledMeetingEvent
      callKind: MeetingCallKind
    },
  ): Promise<Record<string, unknown>> {
    const participantEmails = input.event.attendees
      .map((attendee) => attendee.email.trim().toLowerCase())
      .filter(Boolean)
    const attendeeLabels = input.event.attendees
      .map((attendee) => attendee.name?.trim() || attendee.email.trim())
      .filter(Boolean)
    const icalUid = input.event.icalUid?.trim() || null
    const { data, error } = await supabase
      .from('space_items')
      .insert({
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        title: input.event.title.slice(0, 500),
        description: input.event.description?.trim() || null,
        status: 'logged',
        source: 'calendar',
        custom_data: {
          entry_type: 'call',
          call_kind: input.callKind,
          call_kind_source: 'automatic',
          calendar_event_id: input.event.calendarEventId,
          ...(icalUid ? { ical_uid: icalUid } : {}),
          call_date: input.event.start,
          call_end: input.event.end,
          attendees: attendeeLabels,
          participant_emails: participantEmails,
          location: input.event.location?.trim() || null,
          video_url: input.event.videoUrl?.trim() || null,
          calendar_url: input.event.htmlLink?.trim() || null,
        },
      })
      .select()
      .single()
    if (error) {
      // Idempotent on the ical_uid natural key: a concurrent resolve for the same
      // invite already created the call, so reuse it instead of duplicating.
      if (isUniqueViolation(error) && icalUid) {
        const existing = await this.findCallItemByIcalUid(supabase, input.spaceId, icalUid)
        if (existing) return existing
      }
      throw new BadRequestException(error.message)
    }
    return data as Record<string, unknown>
  }

  findCallItemByIcalUid(
    supabase: SupabaseClient,
    spaceId: string,
    icalUid: string,
  ): Promise<Record<string, unknown> | null> {
    return this.matching.findCallItemByIcalUid(supabase, spaceId, icalUid)
  }

  async findCallIdentityProfile(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<MeetingCallIdentityProfile> {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, fathom_aliases, full_name')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw new BadRequestException(profileError.message)

    const internalDomains = new Set<string>()
    if (orgId) {
      const { data: members, error: membersError } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .limit(500)
      if (membersError) throw new BadRequestException(membersError.message)
      const memberIds = (members ?? []).map((member) => String(member.user_id)).filter(Boolean)
      if (memberIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('email')
          .in('id', memberIds)
        if (profilesError) throw new BadRequestException(profilesError.message)
        for (const memberProfile of profiles ?? []) {
          const domain = emailDomain(memberProfile.email)
          if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) internalDomains.add(domain)
        }
      }
    }

    return {
      email: nullableText(profile?.email),
      fathomAliases: Array.isArray(profile?.fathom_aliases)
        ? profile.fathom_aliases.map(String).filter(Boolean)
        : [],
      fullName: nullableText(profile?.full_name),
      internalDomains: [...internalDomains],
    }
  }

  async findMeetingItemCustomData(
    supabase: SupabaseClient,
    meetingItemId: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('space_items')
      .select('custom_data')
      .eq('id', meetingItemId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return record(data?.custom_data)
  }

  async updateMeetingItemCallKind(
    supabase: SupabaseClient,
    meetingItemId: string,
    customData: Record<string, unknown>,
    callKind: MeetingCallKind,
  ): Promise<void> {
    const externalAutomation = record(customData.external_automation)
    const nextExternalAutomation =
      Object.keys(externalAutomation).length > 0
        ? { ...externalAutomation, call_kind: callKind }
        : undefined
    const { error } = await supabase
      .from('space_items')
      .update({
        custom_data: {
          ...customData,
          call_kind: callKind,
          call_kind_source: 'automatic',
          ...(nextExternalAutomation ? { external_automation: nextExternalAutomation } : {}),
        },
      })
      .eq('id', meetingItemId)
    if (error) throw new BadRequestException(error.message)
  }

  /** Copy Fathom recording identity onto the Meetings call row (shared with Home). */
  async updateMeetingItemFathomRecording(
    supabase: SupabaseClient,
    meetingItemId: string,
    customData: Record<string, unknown>,
    input: {
      recordingUrl: string | null
      externalRecordingId: string
      providerMeetingId: string | null
    },
  ): Promise<void> {
    const externalAutomation = {
      ...record(customData.external_automation),
      provider: 'fathom',
      meeting_id: input.providerMeetingId ?? input.externalRecordingId,
    }
    const { error } = await supabase
      .from('space_items')
      .update({
        custom_data: {
          ...customData,
          entry_type: customData.entry_type ?? 'call',
          ...(input.recordingUrl
            ? { recording_url: input.recordingUrl, fathom_url: input.recordingUrl }
            : {}),
          external_automation: externalAutomation,
        },
      })
      .eq('id', meetingItemId)
    if (error) throw new BadRequestException(error.message)
  }

  createInstantMeeting(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      orgId: string | null
      title: string
      attendeeEmails: string[]
      startedAt: string
    },
  ): Promise<Record<string, unknown>> {
    return createInstantMeetingItem(supabase, input)
  }

  async deleteScheduledMeeting(
    supabase: SupabaseClient,
    meetingItemId: string,
    calendarEventId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_items')
      .delete()
      .eq('id', meetingItemId)
      .eq('source', 'calendar')
      .eq('custom_data->>calendar_event_id', calendarEventId)
    if (error) throw new BadRequestException(error.message)
  }

  // Matching queries live in MeetingCallMatchingRepository; these delegates keep
  // the resolution repository as the single seam services (and tests) mock.
  listMeetingCandidates(
    supabase: SupabaseClient,
    input: { spaceId: string; userId: string; anchorAt: string | null },
  ): Promise<Record<string, unknown>[]> {
    return this.matching.listMeetingCandidates(supabase, input)
  }

  findCallItemByCalendarEventId(
    supabase: SupabaseClient,
    input: { spaceId: string; userId: string; calendarEventId: string },
  ): Promise<Record<string, unknown> | null> {
    return this.matching.findCallItemByCalendarEventId(supabase, input)
  }

  findBestExistingCallForEvent(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      calendarEventId: string
      icalUid?: string | null
      title: string
      start: string
    },
  ): Promise<Record<string, unknown> | null> {
    return this.matching.findBestExistingCallForEvent(supabase, input)
  }

  listDuplicateCallItemIds(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      meetingItemId: string
      icalUid: string | null
      fathomMeetingId: string | null
      calendarEventId: string | null
    },
  ): Promise<string[]> {
    return this.matching.listDuplicateCallItemIds(supabase, input)
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: unknown }).code === '23505',
  )
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'yahoo.com',
])

function emailDomain(value: unknown): string | null {
  const email = nullableText(value)?.toLowerCase() ?? ''
  const at = email.lastIndexOf('@')
  return at >= 0 ? email.slice(at + 1) : null
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
