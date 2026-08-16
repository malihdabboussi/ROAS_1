import { createHash, randomBytes } from 'node:crypto'
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { SupabaseServiceClient, type RequestScope } from '@vibey/api-shared'
import { computePageGraderCampaignSpaceHash } from '../../../brain/services/page-grader-campaign-space-sync'
import { MeetingsPrecallPrepService } from '../../../spaces/services/meetings-precall-prep.service'
import { VaultService } from '../../../vault/services/vault.service'
import {
  PageGraderMeetingAgendaWebhookSchema,
  PageGraderWorkStatusWebhookSchema,
  type PageGraderBrainPackageWebhookDto,
} from '../dto/page-grader.dto'
import { PageGraderIntegration } from '../integrations/page-grader.integration'
import { PageGraderBrainSyncRepository } from '../repositories/page-grader-brain-sync.repository'
import {
  PAGE_GRADER_LABEL_API_KEY,
  PAGE_GRADER_LABEL_BASE_URL,
  PAGE_GRADER_PROVIDER,
  parseClientScopeMap,
  type PageGraderClientScopeEntry,
} from './page-grader-api.helpers'
import { PageGraderApiService } from './page-grader-api.service'
import { PageGraderBrainImportService } from './page-grader-brain-import.service'
import { verifySignedPageGraderSlackClient } from './page-grader-slack-client-authorization'

export type MappedClientRow = {
  userId: string
  orgId: string | null
  clientId: string
  entry: PageGraderClientScopeEntry
  webhookSecret: string | null
}

type ConnectedPageGraderRow = {
  userId: string
  orgId: string | null
  metadata: Record<string, unknown>
  webhookSecret: string | null
}

export type AuthorizedPageGraderConnection = Pick<ConnectedPageGraderRow, 'userId' | 'orgId'>

@Injectable()
export class PageGraderBrainSyncService {
  private readonly logger = new Logger(PageGraderBrainSyncService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly vault: VaultService,
    private readonly pageGrader: PageGraderIntegration,
    private readonly brainImport: PageGraderBrainImportService,
    private readonly repository: PageGraderBrainSyncRepository,
    private readonly pageGraderApi: PageGraderApiService,
    private readonly precallPrep: MeetingsPrecallPrepService,
  ) {}

  async ensureWebhookSecret(userId: string): Promise<string> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? ({ ...(data.metadata as Record<string, unknown>) } as Record<string, unknown>)
        : {}
    const existing =
      typeof metadata.webhook_secret === 'string' && metadata.webhook_secret.trim()
        ? metadata.webhook_secret.trim()
        : ''
    if (existing) return existing
    const secret = `pgwh_${randomBytes(24).toString('hex')}`
    metadata.webhook_secret = secret
    await this.svc.client
      .from('user_integrations')
      .update({ metadata })
      .eq('user_id', userId)
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .is('org_id', null)
    return secret
  }

  async authorizeWebhookSecret(signature: string): Promise<AuthorizedPageGraderConnection[]> {
    const secret = signature.trim()
    if (!secret) throw new UnauthorizedException('Missing webhook signature')
    const connections = (await this.listConnectedPageGraderRows()).filter(
      (row) => row.webhookSecret === secret,
    )
    if (connections.length === 0) throw new UnauthorizedException('Unknown webhook secret')
    return connections.map(({ userId, orgId }) => ({ userId, orgId }))
  }

  async processWebhook(rawBody: string, signature: string) {
    const { work } = await this.beginWebhookProcessing(rawBody, signature)
    return work
  }

  /**
   * Validate the Page Grader connection before acknowledging the webhook, then
   * expose the expensive client bootstrap/Brain ingest as background work.
   */
  async beginWebhookProcessing(rawBody: string, signature: string) {
    const secret = signature.trim()
    if (!secret) throw new UnauthorizedException('Missing webhook signature')

    let payload: PageGraderBrainPackageWebhookDto
    try {
      payload = JSON.parse(rawBody) as PageGraderBrainPackageWebhookDto
    } catch {
      throw new BadRequestException('Invalid JSON body')
    }
    if (!payload?.client_id) throw new BadRequestException('client_id is required')

    const connections = (await this.listConnectedPageGraderRows()).filter(
      (row) => row.webhookSecret === secret,
    )
    if (connections.length === 0) throw new UnauthorizedException('Unknown webhook secret')

    const work = this.processBrainPackagePayload(payload, secret, connections)
    return { clientId: payload.client_id, work }
  }

  private async processBrainPackagePayload(
    payload: PageGraderBrainPackageWebhookDto,
    secret: string,
    connections: ConnectedPageGraderRow[],
  ) {
    const mapped = await this.findOrBootstrapClientsByWebhookSecret(
      secret,
      payload.client_id,
      undefined,
      connections,
    )
    if (mapped.length === 0) {
      throw new UnauthorizedException('Unknown webhook secret or unmapped client')
    }

    const results = await Promise.all(
      mapped.map((row) =>
        this.syncMappedClient(row, {
          force: payload.force === true,
          expectedHash: payload.content_hash,
        }),
      ),
    )
    return { success: true, results }
  }

  async processWorkStatusWebhook(rawBody: string, signature: string) {
    const secret = signature.trim()
    if (!secret) throw new UnauthorizedException('Missing webhook signature')

    let raw: unknown
    try {
      raw = JSON.parse(rawBody)
    } catch {
      throw new BadRequestException('Invalid JSON body')
    }
    const parsed = PageGraderWorkStatusWebhookSchema.safeParse(raw)
    if (!parsed.success) throw new BadRequestException('Invalid work-status payload')
    const payload = parsed.data

    const mapped = await this.findMappedClientsByWebhookSecret(secret, payload.client_id)
    if (mapped.length === 0) {
      throw new UnauthorizedException('Unknown webhook secret or unmapped client')
    }

    const { data: item, error } = await this.svc.client
      .from('space_items')
      .select('id, custom_data')
      .eq('id', payload.space_item_id)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!item) throw new BadRequestException('ROAS action item was not found')

    const customData = asRecord(item.custom_data)
    const pageGrader = asRecord(customData.page_grader)
    if (
      String(pageGrader.client_id ?? '') !== payload.client_id ||
      String(pageGrader.work_id ?? '') !== payload.work_id
    ) {
      throw new UnauthorizedException('Work-status payload does not match the linked ROAS item')
    }

    const actionLedger = asRecord(customData.action_ledger)
    const ledgerPageGrader = asRecord(actionLedger.page_grader)
    const normalizedStatus = String(payload.status ?? '')
      .trim()
      .toLowerCase()
    const completed = new Set(['complete', 'completed', 'closed', 'done', 'shipped']).has(
      normalizedStatus,
    )
    const dismissed = new Set(['cancelled', 'canceled', 'deleted']).has(normalizedStatus)
    const now = payload.updated_at ?? new Date().toISOString()

    const { error: updateError } = await this.svc.client
      .from('space_items')
      .update({
        custom_data: {
          ...customData,
          page_grader: {
            ...pageGrader,
            clickup_task_id: payload.clickup_task_id ?? pageGrader.clickup_task_id ?? null,
            clickup_task_url: payload.clickup_task_url ?? pageGrader.clickup_task_url ?? null,
            clickup_status: payload.status ?? null,
            clickup_status_color: payload.status_color ?? null,
            status_synced_at: now,
          },
          action_ledger: {
            ...actionLedger,
            status: completed ? 'done' : dismissed ? 'dismissed' : 'delegated',
            page_grader: {
              ...ledgerPageGrader,
              delegation_status: dismissed ? 'failed' : 'delegated',
              work_id: payload.work_id,
              clickup_task_id: payload.clickup_task_id ?? ledgerPageGrader.clickup_task_id ?? null,
              clickup_task_url:
                payload.clickup_task_url ?? ledgerPageGrader.clickup_task_url ?? null,
              clickup_status: payload.status ?? null,
              clickup_status_color: payload.status_color ?? null,
              completed_at: completed ? now : (ledgerPageGrader.completed_at ?? null),
              status_synced_at: now,
            },
            updated_at: now,
          },
        },
        updated_at: now,
      })
      .eq('id', payload.space_item_id)
    if (updateError) throw new BadRequestException(updateError.message)

    return {
      success: true,
      space_item_id: payload.space_item_id,
      work_id: payload.work_id,
      status: completed ? 'done' : dismissed ? 'dismissed' : 'delegated',
    }
  }

  async processMeetingAgendaWebhook(rawBody: string, signature: string) {
    const secret = signature.trim()
    if (!secret) throw new UnauthorizedException('Missing webhook signature')

    let raw: unknown
    try {
      raw = JSON.parse(rawBody)
    } catch {
      throw new BadRequestException('Invalid JSON body')
    }
    const parsed = PageGraderMeetingAgendaWebhookSchema.safeParse(raw)
    if (!parsed.success) throw new BadRequestException('Invalid meeting-agenda payload')
    const payload = parsed.data

    const mapped = await this.findOrBootstrapClientsByWebhookSecret(
      secret,
      payload.client_id,
      payload.client_name,
    )
    if (mapped.length === 0) {
      throw new UnauthorizedException('Unknown webhook secret or unmapped client')
    }

    const results: Array<{
      user_id: string
      calendar_event_id: string
      space_item_id: string
      title: string
      status: 'pending' | 'ready' | 'failed'
      kind: 'created' | 'refreshed' | 'skipped'
    }> = []
    for (const row of mapped) {
      results.push(await this.startAgendaPrepForUser(row.userId, row.orgId, payload, row.entry))
    }
    return { success: true, results }
  }

  private async startAgendaPrepForUser(
    userId: string,
    orgId: string | null,
    payload: {
      client_id: string
      client_name?: string
      meeting_date: string
      notes?: string | null
      refresh?: boolean
    },
    clientScope: PageGraderClientScopeEntry,
  ) {
    const supabase = this.svc.client
    const spaceId = await this.precallPrep.resolveMeetingsSpaceId(supabase, userId, orgId)
    if (!spaceId) {
      throw new BadRequestException('No Meetings space found for precall prep')
    }

    let clientName = payload.client_name?.trim() || ''
    if (!clientName) {
      try {
        const catalog = await this.pageGraderApi.listClients(userId, { all: true })
        clientName =
          catalog.clients.find((c) => c.id === payload.client_id)?.name?.trim() || 'Client'
      } catch {
        clientName = 'Client'
      }
    }

    const scope = {
      userId,
      orgId,
      orgRole: orgId ? ('owner' as const) : null,
    } as RequestScope

    const result = await this.precallPrep.runForPageGraderClient({
      supabase,
      userId,
      orgId,
      spaceId,
      pageGraderClientId: payload.client_id,
      pageGraderCampaignId: clientScope.campaign_id,
      clientName,
      meetingDate: payload.meeting_date,
      notes: payload.notes ?? null,
      refresh: payload.refresh !== false,
      scope,
    })
    return { user_id: userId, ...result }
  }

  async catchUpMappedClients(
    limit = 50,
    clientIds: string[] = [],
  ): Promise<{
    success: true
    scanned: number
    synced: number
    skipped: number
    failed: number
  }> {
    const mapped = await this.listAllMappedClients()
    const requestedIds = new Set(clientIds.map((value) => value.trim()).filter(Boolean))
    const selected =
      requestedIds.size > 0 ? mapped.filter((row) => requestedIds.has(row.clientId)) : mapped
    let synced = 0
    let skipped = 0
    let failed = 0
    const batch = selected.slice(0, Math.max(1, Math.min(limit, 200)))
    for (const row of batch) {
      try {
        const result = await this.syncMappedClient(row, { force: false })
        if (result.status === 'skipped_hash_match') {
          skipped += 1
        } else if (result.status === 'failed') {
          failed += 1
        } else {
          synced += 1
        }
      } catch (error) {
        failed += 1
        this.logger.warn(
          `Page Grader catch-up failed for client ${row.clientId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }
    return { success: true, scanned: batch.length, synced, skipped, failed }
  }

  private async syncMappedClient(
    row: MappedClientRow,
    opts: { force: boolean; expectedHash?: string },
  ) {
    const [baseUrl, apiKey] = await Promise.all([
      this.vault.getSecret(row.userId, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_BASE_URL),
      this.vault.getSecret(row.userId, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_API_KEY),
    ])
    if (!baseUrl || !apiKey) {
      return { client_id: row.clientId, status: 'failed' as const, error: 'not_connected' }
    }

    const [pkg, metaContext] = await Promise.all([
      this.pageGrader.getClientBrainPackage(baseUrl, apiKey, row.clientId),
      this.pageGrader.getClientMetaContext(baseUrl, apiKey, row.clientId).catch(() => null),
    ])
    const packageHash =
      typeof (pkg as { envelope?: { content_hash?: unknown } })?.envelope?.content_hash === 'string'
        ? String((pkg as { envelope: { content_hash: string } }).envelope.content_hash)
        : createHash('sha256').update(JSON.stringify(pkg)).digest('hex')

    const hashMatches =
      Boolean(row.entry.content_hash) &&
      (row.entry.content_hash === packageHash ||
        Boolean(opts.expectedHash && row.entry.content_hash === opts.expectedHash))
    const campaignSpaceHash = computePageGraderCampaignSpaceHash({
      campaigns: Array.isArray(pkg.client_campaigns) ? pkg.client_campaigns : [],
      metaContext,
    })
    const campaignSpacesMatch = row.entry.campaign_space_hash === campaignSpaceHash
    const repairEmptyImport =
      !opts.force &&
      !(await this.repository.hasCampaignKnowledge(this.svc.client, row.entry.campaign_id))

    if (!opts.force && hashMatches && campaignSpacesMatch && !repairEmptyImport) {
      return {
        client_id: row.clientId,
        status: 'skipped_hash_match' as const,
        content_hash: row.entry.content_hash,
        campaign_space_hash: campaignSpaceHash,
      }
    }

    const result = await this.brainImport.importClientBrain(
      this.svc.client,
      row.userId,
      {
        client_id: row.clientId,
        force: opts.force || repairEmptyImport,
        campaignId: row.entry.campaign_id,
        campaignName: row.entry.campaign_name,
        spaceId: row.entry.space_id ?? undefined,
        spaceTitle: row.entry.space_title ?? undefined,
      },
      row.orgId,
      pkg,
      metaContext,
      { skipBrainIngest: hashMatches && !campaignSpacesMatch && !repairEmptyImport },
    )

    const brainImport =
      result &&
      typeof result === 'object' &&
      result.brainImport &&
      typeof result.brainImport === 'object'
        ? (result.brainImport as Record<string, unknown>)
        : {}

    return {
      client_id: row.clientId,
      status:
        brainImport.skippedUnchanged === true && hashMatches && !repairEmptyImport
          ? ('skipped_hash_match' as const)
          : ('synced' as const),
      content_hash:
        typeof brainImport.contentHash === 'string' ? brainImport.contentHash : packageHash,
      result,
    }
  }

  private async listAllMappedClients(): Promise<MappedClientRow[]> {
    const connections = await this.listConnectedPageGraderRows()
    return connections.flatMap((row) => this.readMappedClients(row))
  }

  private async listConnectedPageGraderRows(): Promise<ConnectedPageGraderRow[]> {
    const { data, error } = await this.svc.client
      .from('user_integrations')
      .select('user_id, org_id, metadata')
      .eq('integration_id', PAGE_GRADER_PROVIDER)
      .eq('status', 'connected')
    if (error) throw new BadRequestException(`Could not list Page Grader maps: ${error.message}`)

    return (data ?? []).map((row) => {
      const metadata =
        row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : {}
      const webhookSecret =
        typeof metadata.webhook_secret === 'string' ? metadata.webhook_secret.trim() : null
      return {
        userId: String(row.user_id),
        orgId: row.org_id ? String(row.org_id) : null,
        metadata,
        webhookSecret,
      }
    })
  }

  private readMappedClients(row: ConnectedPageGraderRow): MappedClientRow[] {
    const map = parseClientScopeMap(row.metadata.client_scope_map)
    return Object.entries(map).flatMap(([clientId, entry]) =>
      entry.campaign_id
        ? [
            {
              userId: row.userId,
              orgId: row.orgId,
              clientId,
              entry,
              webhookSecret: row.webhookSecret,
            },
          ]
        : [],
    )
  }

  private async findMappedClientsByWebhookSecret(
    secret: string,
    clientId: string,
  ): Promise<MappedClientRow[]> {
    const all = await this.listAllMappedClients()
    return all.filter((row) => row.webhookSecret === secret && row.clientId === clientId)
  }

  private async findOrBootstrapClientsByWebhookSecret(
    secret: string,
    clientId: string,
    clientName?: string,
    prefetchedConnections?: ConnectedPageGraderRow[],
  ): Promise<MappedClientRow[]> {
    const connections = (
      prefetchedConnections ?? (await this.listConnectedPageGraderRows())
    ).filter((row) => row.webhookSecret === secret)
    const resolved: MappedClientRow[] = []

    for (const connection of connections) {
      const existing = this.readMappedClients(connection).find((row) => row.clientId === clientId)
      if (existing) {
        resolved.push(existing)
        continue
      }

      try {
        // Possession of a webhook secret is not enough to select an arbitrary client UUID.
        // Confirm the client belongs to this exact Page Grader connection before importing it.
        const catalog = await this.pageGraderApi.listClients(connection.userId, { all: true })
        const client = catalog.clients.find((row) => row.id === clientId)
        if (!client) continue

        await this.brainImport.importClientBrain(
          this.svc.client,
          connection.userId,
          {
            client_id: clientId,
            campaignName:
              clientName?.trim() || client.display_name?.trim() || client.name?.trim() || 'Client',
          },
          connection.orgId,
        )
        const entry = (await this.pageGraderApi.getClientScopeMap(connection.userId))[clientId]
        if (!entry?.campaign_id) continue
        resolved.push({
          userId: connection.userId,
          orgId: connection.orgId,
          clientId,
          entry,
          webhookSecret: connection.webhookSecret,
        })
      } catch (error) {
        this.logger.warn(
          `Could not bootstrap Page Grader client ${clientId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }

    return resolved
  }

  /** Authorize one external client against the signed connection and its canonical scope map. */
  async authorizeWebhookClient(
    secret: string,
    clientId: string,
    clientName?: string,
  ): Promise<MappedClientRow[]> {
    const normalizedSecret = secret.trim()
    if (!normalizedSecret) throw new UnauthorizedException('Missing webhook signature')
    const mapped = await this.findMappedClientsByWebhookSecret(normalizedSecret, clientId)
    if (mapped.length > 0) return mapped

    const verified = await verifySignedPageGraderSlackClient({
      connections: await this.listConnectedPageGraderRows(),
      secret: normalizedSecret,
      clientId,
      clientName,
      listClients: (userId) => this.pageGraderApi.listClients(userId, { all: true }),
      onError: (error) =>
        this.logger.warn(
          `Could not verify Page Grader Slack client ${clientId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    })
    if (verified.length > 0) return verified
    throw new UnauthorizedException('Unknown webhook secret or unmapped client')
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
