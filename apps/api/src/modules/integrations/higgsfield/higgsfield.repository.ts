import { BadRequestException, Injectable } from '@nestjs/common'
import { SupabaseServiceClient, type RequestScope } from '@vibey/api-shared'

const SERVER_URL = 'https://mcp.higgsfield.ai/mcp'
const VAULT_LABEL = 'higgsfield:oauth'

@Injectable()
export class HiggsfieldRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async saveConnection(input: {
    scope: RequestScope
    tokenBundle: string
  }): Promise<{ serverId: string; vaultSecretId: string }> {
    const admin = this.serviceClient.client
    const projectId = await this.resolveProject(input.scope)
    const vaultSecretId = await this.upsertVaultSecret(input.scope, input.tokenBundle)

    const { data: existing } = await admin
      .from('project_mcp_servers')
      .select('id')
      .eq('project_id', projectId)
      .eq('server_url', SERVER_URL)
      .maybeSingle()

    const serverPayload = {
      name: 'Higgsfield',
      description: 'Generate and manage Higgsfield video assets from ROAS agents and missions.',
      server_url: SERVER_URL,
      vault_secret_id: vaultSecretId,
      domain: 'shared',
      enabled: true,
      agent_enabled: true,
    }

    if (existing?.id) {
      const { error } = await admin
        .from('project_mcp_servers')
        .update(serverPayload)
        .eq('id', existing.id)
      if (error) throw new BadRequestException('Could not update the Higgsfield connection')
      return { serverId: existing.id, vaultSecretId }
    }

    const { data: server, error } = await admin
      .from('project_mcp_servers')
      .insert({ project_id: projectId, ...serverPayload })
      .select('id')
      .single()
    if (error || !server?.id) {
      throw new BadRequestException('Could not create the Higgsfield connection')
    }
    return { serverId: server.id, vaultSecretId }
  }

  async updateProbe(
    serverId: string,
    payload: { tools: unknown[]; resources: unknown[] },
  ): Promise<void> {
    await this.serviceClient.client
      .from('project_mcp_servers')
      .update({
        cached_tools: payload.tools,
        cached_resources: payload.resources,
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', serverId)
  }

  async removeConnection(scope: RequestScope): Promise<void> {
    const admin = this.serviceClient.client
    let projectQuery = admin.from('project_repos').select('id')
    projectQuery = scope.orgId
      ? projectQuery.eq('org_id', scope.orgId)
      : projectQuery.eq('user_id', scope.userId).is('org_id', null)
    const { data: projects } = await projectQuery
    const projectIds = (projects ?? []).map((project) => project.id)
    if (projectIds.length) {
      await admin
        .from('project_mcp_servers')
        .delete()
        .in('project_id', projectIds)
        .eq('server_url', SERVER_URL)
    }

    let secretQuery = admin
      .from('vault_secrets')
      .delete()
      .eq('provider', 'mcp')
      .eq('label', VAULT_LABEL)
    secretQuery = scope.orgId
      ? secretQuery.eq('org_id', scope.orgId)
      : secretQuery.eq('user_id', scope.userId).is('org_id', null)
    await secretQuery
  }

  private async resolveProject(scope: RequestScope): Promise<string> {
    const admin = this.serviceClient.client
    let query = admin
      .from('project_repos')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('user_id', scope.userId).is('org_id', null)
    const { data } = await query.maybeSingle()
    if (data?.id) return data.id

    const scopeKey = scope.orgId ?? scope.userId
    const { data: inserted, error } = await admin
      .from('project_repos')
      .insert({
        user_id: scope.userId,
        org_id: scope.orgId,
        name: 'ROAS Workspace Integrations',
        description: 'Hidden compatibility container for workspace-level MCP integrations.',
        storage_path: `managed-mcp/${scopeKey}/workspace.zip`,
        entry_point: 'src/App.tsx',
        dependencies: {},
        manifest: { hidden: true, kind: 'workspace_mcp' },
        source: 'agent',
        source_meta: { managed_by: 'mcp_servers' },
        status: 'ready',
      })
      .select('id')
      .single()
    if (error || !inserted?.id) {
      throw new BadRequestException('Could not prepare the workspace for Higgsfield')
    }
    return inserted.id
  }

  private async upsertVaultSecret(scope: RequestScope, tokenBundle: string): Promise<string> {
    const admin = this.serviceClient.client
    let query = admin
      .from('vault_secrets')
      .select('id')
      .eq('provider', 'mcp')
      .eq('label', VAULT_LABEL)
    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('user_id', scope.userId).is('org_id', null)
    const { data: existing } = await query.maybeSingle()
    const payload = {
      user_id: scope.userId,
      org_id: scope.orgId,
      provider: 'mcp',
      label: VAULT_LABEL,
      secret_type: 'oauth_token',
      encrypted_value: tokenBundle,
      metadata: { server_url: SERVER_URL, oauth_provider: 'higgsfield' },
    }

    if (existing?.id) {
      const { error } = await admin.from('vault_secrets').update(payload).eq('id', existing.id)
      if (error) throw new BadRequestException('Could not update the Higgsfield credentials')
      return existing.id
    }

    const { data, error } = await admin.from('vault_secrets').insert(payload).select('id').single()
    if (error || !data?.id) {
      throw new BadRequestException('Could not store the Higgsfield credentials')
    }
    return data.id
  }
}
