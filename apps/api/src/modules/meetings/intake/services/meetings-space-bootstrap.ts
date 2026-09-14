import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'

export type MeetingsSpaceBootstrapResult = { id: string; action: 'create' | 'reuse' }

/**
 * Make sure the caller has a Meetings space (org "Meetings" or personal
 * "Personal Dashboard") with its automations, so meetings from any note taker
 * have somewhere to land. Shared by Fathom OAuth, Fireflies and Read AI.
 */
export async function ensureMeetingsSpaceForScope(input: {
  supabase: SupabaseClient
  scope: RequestScope
  resolveMeetingsSpaceId: (
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ) => Promise<string | null>
  instantiate: (
    supabase: SupabaseClient,
    scope: RequestScope,
    templateKey: string,
    options: Record<string, unknown>,
  ) => Promise<unknown>
  findCampaignId?: (
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ) => Promise<string | null>
}): Promise<MeetingsSpaceBootstrapResult> {
  const { supabase, scope } = input
  // Prefer org Meetings when connected in org context; else personal-account.
  const existingId = await input.resolveMeetingsSpaceId(supabase, scope.userId, scope.orgId ?? null)
  if (existingId) return { id: existingId, action: 'reuse' }

  const targetOrgId = scope.orgId ?? null
  const createScope: RequestScope = targetOrgId ? scope : { ...scope, orgId: null, orgRole: null }
  const campaignId = await (input.findCampaignId ?? findMeetingsCampaignId)(
    supabase,
    scope.userId,
    targetOrgId,
  )
  const created = await input.instantiate(supabase, createScope, 'personal-dashboard', {
    title: targetOrgId ? 'Meetings' : 'Personal Dashboard',
    visibility: targetOrgId ? 'team' : 'private',
    include_tasks: true,
    include_docs: true,
    include_channel: false,
    include_automations: true,
    ...(campaignId ? { campaign_id: campaignId } : {}),
  })
  const id = String((created as { id?: unknown })?.id ?? '')
  if (!id) throw new Error('Personal Dashboard setup did not return a Space')
  return { id, action: 'create' }
}

/** Org context → the org's General campaign; personal → the user's Personal campaign. */
export async function findMeetingsCampaignId(
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
): Promise<string | null> {
  let query = supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .neq('status', 'archived')
  query = orgId
    ? query.eq('org_id', orgId).contains('config', { system_kind: 'general' })
    : query.is('org_id', null).contains('config', { system_kind: 'personal' })
  const { data, error } = await query.maybeSingle()
  if (error || !data?.id) return null
  return String(data.id)
}
