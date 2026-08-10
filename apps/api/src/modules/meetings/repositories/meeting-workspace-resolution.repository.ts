import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingCallKind } from '../domain/meeting-call-kind'
import { createInstantMeetingItem } from './create-instant-meeting-item'

export type ScheduledMeetingEvent = {
  calendarEventId: string
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
  async findSpaceOrgId(supabase: SupabaseClient, spaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('org_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return typeof data?.org_id === 'string' ? data.org_id : null
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
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
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

  async listMeetingCandidates(
    supabase: SupabaseClient,
    input: { spaceId: string; userId: string; anchorAt: string | null },
  ): Promise<Record<string, unknown>[]> {
    if (!input.anchorAt) return []
    const anchorMs = new Date(input.anchorAt).getTime()
    if (!Number.isFinite(anchorMs)) return []
    // ±20m covers Fathom "Impromptu" starts that land slightly before the invite.
    const lower = new Date(anchorMs - 20 * 60 * 1000).toISOString()
    const upper = new Date(anchorMs + 20 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, source, custom_data')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
      .in('source', ['calendar', 'manual'])
      .eq('custom_data->>entry_type', 'call')
      .gte('custom_data->>call_date', lower)
      .lte('custom_data->>call_date', upper)
      .limit(20)
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  /** Exact Meetings call already stamped with this Google/Outlook event id. */
  async findCallItemByCalendarEventId(
    supabase: SupabaseClient,
    input: { spaceId: string; userId: string; calendarEventId: string },
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, title, source, custom_data')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
      .eq('custom_data->>entry_type', 'call')
      .eq('custom_data->>calendar_event_id', input.calendarEventId)
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown> | null) ?? null
  }

  /**
   * Prefer an existing Meetings call (especially Fathom-backed) over creating a
   * second calendar stub for the same invite.
   */
  async findBestExistingCallForEvent(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      calendarEventId: string
      title: string
      start: string
    },
  ): Promise<Record<string, unknown> | null> {
    const byCalendar = await this.findCallItemByCalendarEventId(supabase, {
      spaceId: input.spaceId,
      userId: input.userId,
      calendarEventId: input.calendarEventId,
    })
    if (byCalendar) return byCalendar

    const candidates = await this.listScheduledMeetingCandidates(supabase, {
      spaceId: input.spaceId,
      userId: input.userId,
      anchorAt: input.start,
    })
    if (candidates.length === 0) return null

    const targetTitle = normalizeCallTitle(input.title)
    const ranked = candidates
      .map((row) => {
        const custom = record(row.custom_data)
        const hasRecording = Boolean(
          firstText(custom.recording_url, custom.fathom_url) ||
          firstText(record(custom.external_automation).meeting_id),
        )
        const source = String(row.source ?? '')
        const title = normalizeCallTitle(String(row.title ?? ''))
        const titleHit =
          Boolean(targetTitle) &&
          Boolean(title) &&
          (title === targetTitle || title.includes(targetTitle) || targetTitle.includes(title))
        let score = 0
        if (hasRecording) score += 40
        if (source === 'fathom') score += 20
        if (titleHit) score += 30
        if (String(custom.calendar_event_id ?? '') === input.calendarEventId) score += 50
        return { row, score }
      })
      .filter((entry) => entry.score >= 40)
      .sort((a, b) => b.score - a.score)

    return ranked[0]?.row ?? null
  }
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

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function normalizeCallTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
