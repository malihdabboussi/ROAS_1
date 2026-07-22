import { randomBytes } from 'node:crypto'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { VaultService } from '../../../vault/services/vault.service'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import type {
  ListPageGraderAssigneesDto,
  ListPageGraderClientsDto,
  SendPageGraderWorkDto,
  UpsertPageGraderClientScopeMapDto,
} from '../dto/page-grader.dto'
import { PageGraderIntegration } from '../integrations/page-grader.integration'
import type { PageGraderMeetingUpsert } from '../integrations/page-grader.integration'
import {
  FALLBACK_PAGE_GRADER_TASK_TYPES,
  getPageGraderCreds,
  PAGE_GRADER_LABEL_API_KEY,
  PAGE_GRADER_LABEL_BASE_URL,
  PAGE_GRADER_PROVIDER,
  parseClientScopeMap,
  safeHost,
  type PageGraderClientScopeEntry,
  type PageGraderSendResult,
} from './page-grader-api.helpers'
import { PageGraderSendWorkService } from './page-grader-send-work.service'

export type { PageGraderClientScopeEntry, PageGraderSendResult }

@Injectable()
export class PageGraderApiService {
  private readonly logger = new Logger(PageGraderApiService.name)

  constructor(
    private readonly pageGrader: PageGraderIntegration,
    private readonly vault: VaultService,
    private readonly connections: IntegrationConnectionsRepository,
    private readonly svc: SupabaseServiceClient,
    private readonly sendWorkService: PageGraderSendWorkService,
  ) {}

  private async getCreds(userId: string) {
    return getPageGraderCreds(this.vault, userId)
  }

  async connect(userId: string, baseUrl: string, apiKey: string) {
    await this.pageGrader.healthCheck(baseUrl, apiKey)

    await Promise.all([
      this.vault.storeSecret(
        userId,
        PAGE_GRADER_PROVIDER,
        PAGE_GRADER_LABEL_BASE_URL,
        baseUrl,
        'custom',
        {},
      ),
      this.vault.storeSecret(
        userId,
        PAGE_GRADER_PROVIDER,
        PAGE_GRADER_LABEL_API_KEY,
        apiKey,
        'api_key',
        {},
      ),
    ])

    // Catalog parent must exist before user_integrations insert (FK).
    await this.connections.ensureAvailable({
      id: PAGE_GRADER_PROVIDER,
      provider: PAGE_GRADER_PROVIDER,
      name: 'Page Grader',
      description:
        'Send Space tasks to Page Grader as workload for client funnel, copy, and design teams.',
      auth_type: 'api_key',
      is_available: true,
      metadata: {
        category: 'productivity',
        website: 'https://portal.roas.io',
      },
    })

    const webhookSecret = `pgwh_${randomBytes(24).toString('hex')}`
    const now = new Date().toISOString()
    await this.connections.upsertConnection(PAGE_GRADER_PROVIDER, userId, {
      user_id: userId,
      integration_id: PAGE_GRADER_PROVIDER,
      provider: PAGE_GRADER_PROVIDER,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: { base_url_host: safeHost(baseUrl), webhook_secret: webhookSecret },
      updated_at: now,
      scope_mode: 'personal',
    })

    return { connected: true, webhook_secret: webhookSecret }
  }

  async disconnect(userId: string) {
    await Promise.all([
      this.vault.deleteSecret(userId, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_BASE_URL),
      this.vault.deleteSecret(userId, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_API_KEY),
    ])
    await this.connections.markPersonalDisconnected(PAGE_GRADER_PROVIDER, userId)
  }

  async getStatus(userId: string) {
    const hasUrl = await this.vault.hasSecret(
      userId,
      PAGE_GRADER_PROVIDER,
      PAGE_GRADER_LABEL_BASE_URL,
    )
    const hasKey = await this.vault.hasSecret(
      userId,
      PAGE_GRADER_PROVIDER,
      PAGE_GRADER_LABEL_API_KEY,
    )
    if (!hasUrl || !hasKey) return { connected: false, status: null, baseUrlHost: null }

    const { data } = await this.svc.client
      .from('user_integrations')
      .select('status, connected_at, metadata')
      .eq('user_id', userId)
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .is('org_id', null)
      .maybeSingle()

    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}

    return {
      connected: data?.status === 'connected',
      status: (data?.status as string) ?? null,
      connectedAt: (data?.connected_at as string) ?? null,
      baseUrlHost: typeof metadata.base_url_host === 'string' ? metadata.base_url_host : null,
      webhook_secret: typeof metadata.webhook_secret === 'string' ? metadata.webhook_secret : null,
      brain_webhook_path: '/api/integrations/page-grader/webhooks/brain-package',
    }
  }

  async listClients(userId: string, opts: ListPageGraderClientsDto) {
    const creds = await this.getCreds(userId)
    const fetchAll = opts.all !== false && opts.offset == null
    const pageSize = Math.min(opts.limit ?? 100, 100)
    const clients: Awaited<ReturnType<typeof this.pageGrader.listClients>> = []
    const seenIds = new Set<string>()

    if (fetchAll) {
      let offset = 0
      // Cap pages so a runaway Portal listing cannot hang the settings request.
      for (let page = 0; page < 50; page += 1) {
        const batch = await this.pageGrader.listClients(creds.baseUrl, creds.apiKey, {
          q: opts.q,
          limit: pageSize,
          offset,
        })
        let added = 0
        for (const client of batch) {
          if (!client?.id || seenIds.has(client.id)) continue
          seenIds.add(client.id)
          clients.push(client)
          added += 1
        }
        // Stop when Portal returns a short page, or when offset is ignored (no new ids).
        if (batch.length < pageSize || added === 0) break
        offset += batch.length
      }
    } else {
      const batch = await this.pageGrader.listClients(creds.baseUrl, creds.apiKey, {
        q: opts.q,
        limit: opts.limit ?? pageSize,
        offset: opts.offset ?? 0,
      })
      clients.push(...batch)
    }

    const [clientTagMap, clientScopeMap] = await Promise.all([
      this.readClientTagMap(userId),
      this.readClientScopeMap(userId),
    ])
    return {
      clients,
      client_tag_map: clientTagMap,
      client_scope_map: clientScopeMap,
    }
  }

  async getClientMetaContext(userId: string, clientId: string) {
    const creds = await this.getCreds(userId)
    const metaContext = await this.pageGrader.getClientMetaContext(
      creds.baseUrl,
      creds.apiKey,
      clientId,
    )
    return { meta_context: metaContext }
  }

  async listTaskTypes(userId: string) {
    const creds = await this.getCreds(userId)
    try {
      const taskTypes = await this.pageGrader.listTaskTypes(creds.baseUrl, creds.apiKey)
      if (taskTypes.length > 0) return { task_types: taskTypes }
    } catch (err) {
      this.logger.warn(
        `Page Grader task-types unavailable, using fallback: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    return { task_types: FALLBACK_PAGE_GRADER_TASK_TYPES }
  }

  async listAssignees(userId: string, opts: ListPageGraderAssigneesDto) {
    const creds = await this.getCreds(userId)
    const assignees = await this.pageGrader.listAssignees(creds.baseUrl, creds.apiKey, opts)
    return { assignees }
  }

  async upsertClientScopeMap(userId: string, dto: UpsertPageGraderClientScopeMapDto) {
    await this.getCreds(userId)
    const next: Record<string, PageGraderClientScopeEntry> = {}
    for (const row of dto.mappings) {
      next[row.client_id] = {
        campaign_id: row.campaign_id,
        ...(row.campaign_name ? { campaign_name: row.campaign_name } : {}),
        space_id: row.space_id ?? null,
        ...(row.space_title ? { space_title: row.space_title } : {}),
      }
    }
    await this.writeClientScopeMap(userId, next)
    return { client_scope_map: next }
  }

  /** Merge one client → campaign/space mapping without wiping other clients. */
  async mergeClientScopeEntry(
    userId: string,
    input: {
      clientId: string
      campaignId: string
      campaignName?: string | null
      spaceId?: string | null
      spaceTitle?: string | null
      contentHash?: string | null
      lastSyncedAt?: string | null
      lastSyncStatus?: string | null
    },
  ) {
    await this.getCreds(userId)
    const existing = await this.readClientScopeMap(userId)
    const prev = existing[input.clientId]
    const next: Record<string, PageGraderClientScopeEntry> = {
      ...existing,
      [input.clientId]: {
        campaign_id: input.campaignId,
        ...(input.campaignName ? { campaign_name: input.campaignName } : {}),
        space_id: input.spaceId ?? null,
        ...(input.spaceTitle ? { space_title: input.spaceTitle } : {}),
        content_hash:
          input.contentHash !== undefined ? input.contentHash : (prev?.content_hash ?? null),
        last_synced_at:
          input.lastSyncedAt !== undefined ? input.lastSyncedAt : (prev?.last_synced_at ?? null),
        last_sync_status:
          input.lastSyncStatus !== undefined
            ? input.lastSyncStatus
            : (prev?.last_sync_status ?? null),
      },
    }
    await this.writeClientScopeMap(userId, next)
    return { client_scope_map: next }
  }

  async sendWork(
    supabase: SupabaseClient,
    userId: string,
    dto: SendPageGraderWorkDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ): Promise<{ success: boolean; results: PageGraderSendResult[] }> {
    return this.sendWorkService.sendWork(supabase, userId, dto, orgId, orgRole)
  }

  async upsertClientMeeting(userId: string, clientId: string, meeting: PageGraderMeetingUpsert) {
    const creds = await this.getCreds(userId)
    return this.pageGrader.upsertClientMeeting(creds.baseUrl, creds.apiKey, clientId, meeting)
  }

  private async readClientTagMap(
    userId: string,
  ): Promise<Record<string, { tag_id: string; tag_label: string }>> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    const raw = metadata.client_tag_map
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: Record<string, { tag_id: string; tag_label: string }> = {}
    for (const [clientId, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const row = value as Record<string, unknown>
      const tagId = typeof row.tag_id === 'string' ? row.tag_id.trim() : ''
      const tagLabel = typeof row.tag_label === 'string' ? row.tag_label.trim() : ''
      if (!clientId || !tagId || !tagLabel) continue
      out[clientId] = { tag_id: tagId, tag_label: tagLabel }
    }
    return out
  }

  private async rememberClientTag(
    userId: string,
    clientId: string,
    tagId: string,
    tagLabel: string,
  ): Promise<void> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    if (!data?.id) return
    const metadata =
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    const existing =
      metadata.client_tag_map &&
      typeof metadata.client_tag_map === 'object' &&
      !Array.isArray(metadata.client_tag_map)
        ? (metadata.client_tag_map as Record<string, unknown>)
        : {}
    await this.svc.client
      .from('user_integrations')
      .update({
        metadata: {
          ...metadata,
          client_tag_map: {
            ...existing,
            [clientId]: { tag_id: tagId, tag_label: tagLabel },
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
  }

  private async readClientScopeMap(
    userId: string,
  ): Promise<Record<string, PageGraderClientScopeEntry>> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    return parseClientScopeMap(metadata.client_scope_map)
  }

  private async writeClientScopeMap(
    userId: string,
    next: Record<string, PageGraderClientScopeEntry>,
  ): Promise<void> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    if (!data?.id) throw new BadRequestException('Page Grader is not connected')
    const metadata =
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    const { error } = await this.svc.client
      .from('user_integrations')
      .update({
        metadata: {
          ...metadata,
          client_scope_map: next,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) throw new BadRequestException(error.message)
  }
}
