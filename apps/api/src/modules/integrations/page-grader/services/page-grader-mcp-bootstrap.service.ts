import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { VaultService } from '../../../vault/services/vault.service'
import {
  derivePageGraderMcpUrl,
  PAGE_GRADER_LABEL_API_KEY,
  PAGE_GRADER_LABEL_BASE_URL,
  PAGE_GRADER_PROVIDER,
} from './page-grader-api.helpers'

type ConnectedPageGrader = {
  user_id: string
  org_id: string | null
}

const MCP_NAME = 'Page Grader'
const MCP_DESCRIPTION =
  'Page Grader client, campaign, fulfillment, meeting, memory, and cached Meta context for ROAS agents.'

@Injectable()
export class PageGraderMcpBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PageGraderMcpBootstrapService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly vault: VaultService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.PAGE_GRADER_MCP_AUTO_REGISTER === 'false') return

    try {
      const result = await this.ensureConnectedRegistrations()
      if (result.created > 0 || result.updated > 0 || result.failed > 0) {
        this.logger.log(
          `Page Grader MCP bootstrap: created=${result.created} updated=${result.updated} failed=${result.failed}`,
        )
      }
    } catch (error) {
      this.logger.warn(
        `Page Grader MCP bootstrap skipped: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async ensureConnectedRegistrations(): Promise<{
    scanned: number
    created: number
    updated: number
    failed: number
  }> {
    const { data, error } = await this.svc.client
      .from('user_integrations')
      .select('user_id, org_id')
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .eq('status', 'connected')

    if (error) throw new Error(error.message)

    let created = 0
    let updated = 0
    let failed = 0
    const rows = (data ?? []) as ConnectedPageGrader[]

    for (const row of rows) {
      try {
        const status = await this.ensureOne(row)
        if (status === 'created') created += 1
        else updated += 1
      } catch (error) {
        failed += 1
        this.logger.warn(
          `Could not bootstrap Page Grader MCP for user ${row.user_id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }

    return { scanned: rows.length, created, updated, failed }
  }

  private async ensureOne(row: ConnectedPageGrader): Promise<'created' | 'updated'> {
    const [baseUrl, apiKey] = await Promise.all([
      this.vault.getSecret(row.user_id, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_BASE_URL),
      this.vault.getSecret(row.user_id, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_API_KEY),
    ])
    if (!baseUrl || !apiKey) throw new Error('connected integration is missing credentials')

    const serverUrl = derivePageGraderMcpUrl(baseUrl)
    let projectQuery = this.svc.client
      .from('project_repos')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)

    projectQuery = row.org_id
      ? projectQuery.eq('org_id', row.org_id)
      : projectQuery.eq('user_id', row.user_id).is('org_id', null)

    const { data: project, error: projectError } = await projectQuery.maybeSingle()
    if (projectError) throw new Error(projectError.message)
    if (!project?.id) throw new Error('no matching ROAS project context')

    const { data: existingSecret, error: secretLoadError } = await this.svc.client
      .from('vault_secrets')
      .select('id')
      .eq('user_id', row.user_id)
      .eq('provider', 'mcp')
      .eq('label', MCP_NAME)
      .maybeSingle()
    if (secretLoadError) throw new Error(secretLoadError.message)

    let secretId = existingSecret?.id as string | undefined
    if (secretId) {
      const { error: updateSecretError } = await this.svc.client
        .from('vault_secrets')
        .update({
          encrypted_value: apiKey,
          org_id: row.org_id,
          metadata: { server_url: serverUrl, managed_by: 'page_grader_bootstrap' },
          updated_at: new Date().toISOString(),
        })
        .eq('id', secretId)
      if (updateSecretError) throw new Error(updateSecretError.message)
    } else {
      const { data: insertedSecret, error: insertSecretError } = await this.svc.client
        .from('vault_secrets')
        .insert({
          user_id: row.user_id,
          org_id: row.org_id,
          provider: 'mcp',
          label: MCP_NAME,
          secret_type: 'api_key',
          encrypted_value: apiKey,
          metadata: { server_url: serverUrl, managed_by: 'page_grader_bootstrap' },
        })
        .select('id')
        .single()
      if (insertSecretError) throw new Error(insertSecretError.message)
      secretId = insertedSecret.id
    }

    const { data: existingServer, error: serverLoadError } = await this.svc.client
      .from('project_mcp_servers')
      .select('id')
      .eq('project_id', project.id)
      .eq('server_url', serverUrl)
      .maybeSingle()
    if (serverLoadError) throw new Error(serverLoadError.message)

    const serverPayload = {
      name: MCP_NAME,
      description: MCP_DESCRIPTION,
      server_url: serverUrl,
      vault_secret_id: secretId,
      domain: 'universal',
      enabled: true,
      agent_enabled: true,
    }

    if (existingServer?.id) {
      const { error: updateServerError } = await this.svc.client
        .from('project_mcp_servers')
        .update(serverPayload)
        .eq('id', existingServer.id)
      if (updateServerError) throw new Error(updateServerError.message)
      return 'updated'
    }

    const { error: insertServerError } = await this.svc.client
      .from('project_mcp_servers')
      .insert({ project_id: project.id, ...serverPayload })
    if (insertServerError) throw new Error(insertServerError.message)
    return 'created'
  }
}
