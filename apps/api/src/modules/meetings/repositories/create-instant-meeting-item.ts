import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Inserts a manual impromptu call row for Home Agenda "New call". */
export async function createInstantMeetingItem(
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
  const participantEmails = [
    ...new Set(input.attendeeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ]
  const { data, error } = await supabase
    .from('space_items')
    .insert({
      space_id: input.spaceId,
      user_id: input.userId,
      org_id: input.orgId,
      title: input.title.slice(0, 500),
      status: 'logged',
      source: 'manual',
      custom_data: {
        entry_type: 'call',
        call_kind: 'impromptu',
        call_kind_source: 'manual',
        call_date: input.startedAt,
        attendees: participantEmails,
        participant_emails: participantEmails,
      },
    })
    .select()
    .single()
  if (error) throw new BadRequestException(error.message)
  return data as Record<string, unknown>
}
