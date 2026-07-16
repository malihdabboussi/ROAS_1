import type { SupabaseClient } from '@supabase/supabase-js'
import {
  collectFathomAttendeesWithEmail,
  type FathomAttendeeLike,
} from './fathom-meeting-item-enrichment'

/**
 * Upsert CRM contacts + campaign membership from Fathom attendee emails
 * so Meetings → People is not empty after call import.
 */
export async function upsertFathomPeopleFromAttendees(
  supabase: SupabaseClient,
  input: {
    userId: string
    orgId: string | null
    campaignId: string | null
    attendees: FathomAttendeeLike[]
  },
  onWarn?: (message: string) => void,
): Promise<void> {
  const people = collectFathomAttendeesWithEmail(input.attendees)
  if (people.length === 0) return

  for (const person of people) {
    try {
      let contactQuery = supabase.from('contacts').select('id').eq('email', person.email)
      contactQuery = input.orgId
        ? contactQuery.eq('org_id', input.orgId)
        : contactQuery.eq('user_id', input.userId).is('org_id', null)
      const { data: existing } = await contactQuery.limit(1).maybeSingle()
      let contactId = existing?.id ? String(existing.id) : null

      if (!contactId) {
        const { data: created, error } = await supabase
          .from('contacts')
          .insert({
            user_id: input.userId,
            org_id: input.orgId,
            email: person.email,
            first_name: person.first_name,
            last_name: person.last_name,
            source: 'import',
            contact_source: 'manual',
            contact_source_detail: 'fathom_meeting_attendee',
            tags: [],
          })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        contactId = String(created.id)
      }

      if (input.campaignId && contactId) {
        const { error: membershipError } = await supabase
          .from('contact_campaign_memberships')
          .upsert(
            {
              user_id: input.userId,
              contact_id: contactId,
              campaign_id: input.campaignId,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'contact_id,campaign_id' },
          )
        if (membershipError) throw new Error(membershipError.message)
      }
    } catch (error) {
      onWarn?.(
        `Failed to upsert Fathom attendee contact ${person.email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }
}
