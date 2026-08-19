/**
 * Resolve the org a QC/Launch notification belongs to when the Page Grader
 * connection row is personal (`user_integrations.org_id IS NULL`).
 *
 * Without an org the bridge skipped the case ledger and the delivery anchor,
 * so QC never produced `agent_cases` rows and Launch check-ins repeated hourly
 * (plan §11.5). Order: connection org → org of the finding's ROAS campaign →
 * the user's single active org membership.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type QcConnection = { userId: string; orgId: string | null }

export async function resolveQcConnectionOrg(
  supabase: SupabaseClient,
  connection: QcConnection,
  input: { campaignIds: Array<string | null | undefined> },
): Promise<{ orgId: string | null; via: 'connection' | 'campaign' | 'membership' | 'none' }> {
  if (connection.orgId) return { orgId: connection.orgId, via: 'connection' }

  const campaignIds = [...new Set(input.campaignIds.filter((id): id is string => Boolean(id)))]
  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from('campaigns')
      .select('org_id')
      .in('id', campaignIds)
      .not('org_id', 'is', null)
      .limit(1)
      .maybeSingle()
    if (data?.org_id) return { orgId: String(data.org_id), via: 'campaign' }
  }

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', connection.userId)
    .eq('status', 'active')
    .limit(2)
  const orgIds = [...new Set((memberships ?? []).map((row) => String(row.org_id)))]
  if (orgIds.length === 1) return { orgId: orgIds[0], via: 'membership' }
  return { orgId: null, via: 'none' }
}
