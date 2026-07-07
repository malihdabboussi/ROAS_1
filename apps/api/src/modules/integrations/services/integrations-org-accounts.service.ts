import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { IntegrationsRepository } from '../repositories/integrations.repository'

export type OrgConnectedAccountsResult = {
  success: boolean
  accounts: Array<{
    id: string
    user_id: string
    integration_id: string
    provider: string
    status: string
    scope_mode: 'personal' | 'org_shared'
    is_default: boolean
    connection_label: string | null
    connected_at: string | null
    updated_at: string | null
    person: { id: string; name: string | null; email: string | null } | null
  }>
}

@Injectable()
export class IntegrationsOrgAccountsService {
  constructor(private readonly repository: IntegrationsRepository) {}

  async listOrgConnectedAccounts(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<OrgConnectedAccountsResult> {
    if (!scope.orgId) return { success: true, accounts: [] }

    const { data: rows, error } = await this.repository
      .table(supabase, 'user_integrations')
      .select(
        'id, user_id, integration_id, provider, status, scope_mode, is_default, connection_label, connected_at, updated_at, org_id',
      )
      .eq('org_id', scope.orgId)
      .order('integration_id', { ascending: true })
      .order('updated_at', { ascending: false })
    if (error) {
      return { success: false, accounts: [] }
    }

    const userIds = [
      ...new Set(((rows ?? []) as Array<{ user_id: string }>).map((r) => String(r.user_id))),
    ]
    const { data: profiles } = userIds.length
      ? await this.repository
          .table(supabase, 'profiles')
          .select('id, full_name, email')
          .in('id', userIds)
      : { data: [] as Array<{ id: string; full_name?: string | null; email?: string | null }> }
    type ProfileRow = { id: string; full_name?: string | null; email?: string | null }
    const profileById = new Map<string, ProfileRow>(
      (profiles ?? []).map((p): [string, ProfileRow] => [String(p.id), p as ProfileRow]),
    )

    const accounts = ((rows ?? []) as Array<Record<string, unknown>>).map((r) => {
      const profile = profileById.get(String(r.user_id))
      return {
        id: String(r.id),
        user_id: String(r.user_id),
        integration_id: String(r.integration_id),
        provider: String(r.provider),
        status: String(r.status),
        scope_mode: (r.scope_mode as 'personal' | 'org_shared') ?? 'personal',
        is_default: Boolean(r.is_default ?? false),
        connection_label: (r.connection_label as string | null) ?? null,
        connected_at: (r.connected_at as string | null) ?? null,
        updated_at: (r.updated_at as string | null) ?? null,
        person: profile
          ? {
              id: profile.id,
              name: profile.full_name ?? null,
              email: profile.email ?? null,
            }
          : null,
      }
    })

    return { success: true, accounts }
  }
}
