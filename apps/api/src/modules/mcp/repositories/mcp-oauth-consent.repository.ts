import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { McpAccountPreview } from '../mcp-oauth-consent.util'

@Injectable()
export class McpOAuthConsentRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async resolveAccountPreview(orgId: string | null): Promise<McpAccountPreview> {
    if (!orgId) {
      return {
        type: 'personal',
        id: null,
        name: 'Personal account',
        avatar_url: null,
      }
    }

    const { data, error } = await this.serviceClient.client
      .from('organizations')
      .select('id, name, avatar_url')
      .eq('id', orgId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!data) throw new BadRequestException('OAuth request organization not found')
    return {
      type: 'organization',
      id: data.id as string,
      name: data.name as string,
      avatar_url: (data.avatar_url as string | null) ?? null,
    }
  }

  async listSelectableAccounts(
    userId: string,
    lockedOrgId: string | null,
  ): Promise<McpAccountPreview[]> {
    if (lockedOrgId) {
      const { data, error } = await this.serviceClient.client
        .from('org_members')
        .select('role, organizations(id, name, avatar_url)')
        .eq('user_id', userId)
        .eq('org_id', lockedOrgId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw new BadRequestException(error.message)
      const org = data?.organizations as
        | { id?: string | null; name?: string | null; avatar_url?: string | null }
        | null
        | undefined
      if (!org?.id || !org.name) {
        throw new ForbiddenException('You are not an active member of this organization')
      }
      return [
        {
          type: 'organization',
          id: org.id,
          name: org.name,
          avatar_url: org.avatar_url ?? null,
          role: typeof data?.role === 'string' ? data.role : null,
        },
      ]
    }

    const accounts: McpAccountPreview[] = [
      {
        type: 'personal',
        id: null,
        name: 'Personal account',
        avatar_url: null,
        role: null,
      },
    ]
    const { data, error } = await this.serviceClient.client
      .from('org_members')
      .select('role, organizations(id, name, avatar_url)')
      .eq('user_id', userId)
      .eq('status', 'active')
    if (error) throw new BadRequestException(error.message)

    for (const row of data ?? []) {
      const org = row.organizations as
        | { id?: string | null; name?: string | null; avatar_url?: string | null }
        | null
        | undefined
      if (!org?.id || !org.name) continue
      accounts.push({
        type: 'organization',
        id: org.id,
        name: org.name,
        avatar_url: org.avatar_url ?? null,
        role: typeof row.role === 'string' ? row.role : null,
      })
    }

    return accounts
  }
}
