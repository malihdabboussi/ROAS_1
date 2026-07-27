/** Load portal People / roster / attendee tags for Fathom follow-up name grounding. */

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildPortalPeopleCatalog, type PortalPerson } from './fathom-portal-people-grounding'

export async function loadPortalPeopleForSpaceFollowUps(input: {
  supabase: SupabaseClient
  ownerUserId: string
  orgId: string | null
  spaceSchema: Record<string, unknown> | null | undefined
}): Promise<PortalPerson[]> {
  const attendeeLabels = extractAttendeeLabels(input.spaceSchema)
  const [contacts, roster] = await Promise.all([
    loadContacts(input.supabase, input.ownerUserId, input.orgId),
    loadRoster(input.supabase, input.ownerUserId, input.orgId),
  ])
  return buildPortalPeopleCatalog({ attendeeLabels, contacts, roster })
}

function extractAttendeeLabels(schema: Record<string, unknown> | null | undefined): string[] {
  const fields = Array.isArray(schema?.fields) ? (schema!.fields as unknown[]) : []
  const field = fields.find(
    (f) => f && typeof f === 'object' && String((f as { id?: unknown }).id ?? '') === 'attendees',
  ) as { options?: Array<{ label?: unknown }> } | undefined
  if (!field || !Array.isArray(field.options)) return []
  return field.options.map((opt) => String(opt.label ?? '').trim()).filter(Boolean)
}

async function loadContacts(
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
): Promise<
  Array<{ first_name?: string | null; last_name?: string | null; email?: string | null }>
> {
  let query = supabase
    .from('contacts')
    .select('first_name, last_name, email')
    .order('updated_at', { ascending: false })
    .limit(500)
  query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
  const { data } = await query
  return (data ?? []) as Array<{
    first_name?: string | null
    last_name?: string | null
    email?: string | null
  }>
}

async function loadRoster(
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
): Promise<
  Array<{ display_name?: string | null; email?: string | null; full_name?: string | null }>
> {
  if (orgId) {
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .limit(200)
    const ids = (members ?? [])
      .map((row) => String((row as { user_id?: unknown }).user_id ?? ''))
      .filter(Boolean)
    if (ids.length === 0) return []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name, email')
      .in('id', ids)
    return (profiles ?? []).map((row) => ({
      full_name: (row as { full_name?: string | null }).full_name,
      email: (row as { email?: string | null }).email,
      display_name: (row as { full_name?: string | null }).full_name,
    }))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) return []
  return [
    {
      full_name: profile.full_name as string | null,
      email: profile.email as string | null,
      display_name: profile.full_name as string | null,
    },
  ]
}
