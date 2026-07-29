import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CanonicalMeetingAssignee,
  MeetingAssigneeCandidate,
} from '../domain/meeting-assignee-identity'
import type { FathomMeetingSource, FathomSourceAction } from '../providers/fathom-meeting-source'

type MeetingScope = {
  meetingItemId: string
  spaceId: string
  userId: string
  orgId: string | null
}

@Injectable()
export class MeetingWorkspaceRepository {
  async listCandidateRecordings(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      userId: string
      calendarEventId: string | null
      anchorAt: string | null
    },
  ): Promise<Record<string, unknown>[]> {
    let query = supabase
      .from('meeting_recordings')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('user_id', input.userId)
    if (input.calendarEventId) {
      query = query.eq('calendar_event_id', input.calendarEventId)
    } else if (input.anchorAt) {
      const anchorMs = new Date(input.anchorAt).getTime()
      if (!Number.isFinite(anchorMs)) return []
      const lower = new Date(anchorMs - 10 * 60 * 1000).toISOString()
      const upper = new Date(anchorMs + 10 * 60 * 1000).toISOString()
      query = query.or(
        `and(scheduled_start_at.gte.${lower},scheduled_start_at.lte.${upper}),and(recording_start_at.gte.${lower},recording_start_at.lte.${upper})`,
      )
    } else {
      return []
    }
    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async upsertWorkspace(
    supabase: SupabaseClient,
    input: MeetingScope & {
      calendarEventId: string | null
      phase?: 'scheduled' | 'live' | 'processing' | 'complete'
    },
  ): Promise<Record<string, unknown>> {
    const phase = input.phase ? { phase: input.phase } : {}
    const { data, error } = await supabase
      .from('meeting_workspaces')
      .upsert(
        {
          meeting_item_id: input.meetingItemId,
          space_id: input.spaceId,
          user_id: input.userId,
          org_id: input.orgId,
          calendar_event_id: input.calendarEventId,
          ...phase,
        },
        { onConflict: 'meeting_item_id' },
      )
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async upsertParticipantContextLinks(
    supabase: SupabaseClient,
    input: MeetingScope & { participantEmails: string[] },
  ): Promise<void> {
    const links: Array<Record<string, unknown>> = [
      {
        meeting_item_id: input.meetingItemId,
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        entity_type: 'space',
        entity_id: input.spaceId,
        source: 'calendar',
        confidence: 1,
        confirmation_state: 'confirmed',
        metadata: {},
      },
    ]
    if (input.participantEmails.length > 0) {
      let contactsQuery = supabase
        .from('contacts')
        .select('id, email')
        .in('email', input.participantEmails)
      contactsQuery = input.orgId
        ? contactsQuery.eq('org_id', input.orgId)
        : contactsQuery.eq('user_id', input.userId).is('org_id', null)
      const { data: contacts, error } = await contactsQuery
      if (error) throw new BadRequestException(error.message)
      for (const contact of contacts ?? []) {
        links.push({
          meeting_item_id: input.meetingItemId,
          space_id: input.spaceId,
          user_id: input.userId,
          org_id: input.orgId,
          entity_type: 'contact',
          entity_id: contact.id,
          source: 'crm',
          confidence: 1,
          confirmation_state: 'confirmed',
          metadata: { email: nullableText(contact.email) },
        })
      }
    }

    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('campaign_id')
      .eq('id', input.spaceId)
      .maybeSingle()
    if (spaceError) throw new BadRequestException(spaceError.message)
    if (space?.campaign_id) {
      links.push({
        meeting_item_id: input.meetingItemId,
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        entity_type: 'campaign',
        entity_id: space.campaign_id,
        source: 'crm',
        confidence: 1,
        confirmation_state: 'confirmed',
        metadata: {},
      })
    }

    const { error } = await supabase
      .from('meeting_context_links')
      .upsert(links, { onConflict: 'meeting_item_id,entity_type,entity_id' })
    if (error) throw new BadRequestException(error.message)
  }

  async upsertRecording(
    supabase: SupabaseClient,
    input: MeetingScope & { source: FathomMeetingSource },
  ): Promise<Record<string, unknown>> {
    const source = input.source
    const { data, error } = await supabase
      .from('meeting_recordings')
      .upsert(
        {
          meeting_item_id: input.meetingItemId,
          space_id: input.spaceId,
          user_id: input.userId,
          org_id: input.orgId,
          provider: source.provider,
          external_recording_id: source.externalRecordingId,
          provider_meeting_id: source.providerMeetingId,
          calendar_event_id: source.calendarEventId,
          title: source.title,
          recording_url: source.recordingUrl,
          scheduled_start_at: source.scheduledStart,
          scheduled_end_at: source.scheduledEnd,
          recording_start_at: source.recordingStart,
          recording_end_at: source.recordingEnd,
          duration_seconds: source.durationSeconds,
          provider_summary: source.providerSummary,
          provider_action_items: source.actions.map((action) => action.raw),
          transcript_entries: source.transcript.length,
          participant_emails: source.participantEmails,
          metadata: { raw_provider_fields: Object.keys(source.raw).sort() },
        },
        { onConflict: 'user_id,provider,external_recording_id' },
      )
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async upsertTranscriptDocument(
    supabase: SupabaseClient,
    input: MeetingScope & {
      recordingId: string
      source: FathomMeetingSource
      docBody: string
    },
  ): Promise<Record<string, unknown>> {
    const { data: recording, error: recordingError } = await supabase
      .from('meeting_recordings')
      .select('transcript_doc_item_id')
      .eq('id', input.recordingId)
      .single()
    if (recordingError) throw new BadRequestException(recordingError.message)

    const title = `Transcript — ${input.source.title}`.slice(0, 500)
    const customData = {
      _view_type: 'doc',
      entry_type: 'meeting_transcript',
      meeting_item_id: input.meetingItemId,
      meeting_recording_id: input.recordingId,
      provider: input.source.provider,
      external_recording_id: input.source.externalRecordingId,
      recording_url: input.source.recordingUrl,
      source_locked: true,
    }
    const existingId = String(recording?.transcript_doc_item_id ?? '').trim()
    if (existingId) {
      const { data, error } = await supabase
        .from('space_items')
        .update({ title, doc_body: input.docBody, custom_data: customData })
        .eq('id', existingId)
        .eq('space_id', input.spaceId)
        .select()
        .single()
      if (error) throw new BadRequestException(error.message)
      return data as Record<string, unknown>
    }

    const { data, error } = await supabase
      .from('space_items')
      .insert({
        space_id: input.spaceId,
        user_id: input.userId,
        org_id: input.orgId,
        parent_item_id: input.meetingItemId,
        title,
        doc_body: input.docBody,
        source: 'fathom',
        custom_data: customData,
      })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async linkTranscriptDocument(
    supabase: SupabaseClient,
    recordingId: string,
    transcriptDocItemId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('meeting_recordings')
      .update({ transcript_doc_item_id: transcriptDocItemId })
      .eq('id', recordingId)
    if (error) throw new BadRequestException(error.message)
  }

  async upsertProviderActions(
    supabase: SupabaseClient,
    input: MeetingScope & {
      recordingId: string
      actions: FathomSourceAction[]
      assignees: Map<string, CanonicalMeetingAssignee>
    },
  ): Promise<string[]> {
    if (input.actions.length === 0) return []
    const payload = input.actions.map((action) => {
      const assignee = input.assignees.get(action.sourceKey) ?? null
      return {
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
      }
    })
    const { data, error } = await supabase
      .from('meeting_actions')
      .upsert(payload, { onConflict: 'meeting_item_id,source_key' })
      .select('id')
    if (error) throw new BadRequestException(error.message)
    return (data ?? []).map((row) => String(row.id))
  }

  async listAssigneeCandidates(
    supabase: SupabaseClient,
    input: Pick<MeetingScope, 'userId' | 'orgId'>,
  ): Promise<MeetingAssigneeCandidate[]> {
    let userIds = [input.userId]
    if (input.orgId) {
      const { data: members, error } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', input.orgId)
        .eq('status', 'active')
        .limit(500)
      if (error) throw new BadRequestException(error.message)
      userIds = (members ?? []).map((row) => String(row.user_id)).filter(Boolean)
    }

    const candidates: MeetingAssigneeCandidate[] = []
    if (userIds.length > 0) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
      if (error) throw new BadRequestException(error.message)
      for (const profile of profiles ?? []) {
        const name = String(profile.full_name ?? '').trim()
        if (!name) continue
        candidates.push({
          type: 'user',
          id: String(profile.id),
          name,
          email: nullableText(profile.email),
        })
      }
    }

    let contactsQuery = supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .limit(1000)
    contactsQuery = input.orgId
      ? contactsQuery.eq('org_id', input.orgId)
      : contactsQuery.eq('user_id', input.userId).is('org_id', null)
    const { data: contacts, error: contactsError } = await contactsQuery
    if (contactsError) throw new BadRequestException(contactsError.message)
    for (const contact of contacts ?? []) {
      const name = [contact.first_name, contact.last_name]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ')
      if (!name) continue
      candidates.push({
        type: 'contact',
        id: String(contact.id),
        name,
        email: nullableText(contact.email),
      })
    }
    return candidates
  }

  async listRecordings(
    supabase: SupabaseClient,
    meetingItemId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('meeting_recordings')
      .select('*')
      .eq('meeting_item_id', meetingItemId)
      .order('recording_start_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }

  async setPrimaryRecording(
    supabase: SupabaseClient,
    meetingItemId: string,
    recordingId: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('set_meeting_primary_recording', {
      p_meeting_item_id: meetingItemId,
      p_recording_id: recordingId,
    })
    if (error) throw new BadRequestException(error.message)
  }
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
