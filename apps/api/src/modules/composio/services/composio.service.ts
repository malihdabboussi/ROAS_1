import { AuthScheme, Composio } from '@composio/core'
import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getLegacyIntegrationRouteConfig } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { ComposioRepository } from '../repositories/composio.repository'
import {
  INTEGRATION_DOMAIN_MAP,
  LEGACY_INTEGRATION_CAPABILITIES,
} from './composio-legacy-capabilities'

type InitiateConnectionOptions = {
  callbackUrl?: string
  allowMultiple?: boolean
  alias?: string
  data?: Record<string, unknown>
  longRedirectUrl?: boolean
  connectionData?: Record<string, string>
  accountType?: 'PRIVATE' | 'SHARED'
}

type ListConnectedAccountsOptions = {
  userId?: string
  toolkitSlugs?: string[]
  statuses?: string[]
  authConfigIds?: string[]
}

type ListToolkitsOptions = {
  search?: string
  limit?: number
  cursor?: string
  category?: string
}

type ComposioToolkitCatalogRow = {
  toolkit_slug: string
  name: string
  description: string
  logo: string | null
  metadata: Record<string, unknown>
  similarity?: number
}

type EmbeddingBillingContext = {
  userId?: string
  orgId?: string | null
  feature: string
  action: string
  metadata?: Record<string, unknown>
}

@Injectable()
export class ComposioService {
  private readonly composio: Composio
  private readonly logger = new Logger(ComposioService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly composioRepository: ComposioRepository,
    @Optional() private readonly creditsService?: CreditsService,
  ) {
    const apiKey = this.config.get<string>('COMPOSIO_API_KEY') || ''
    const baseURL = this.config.get<string>('COMPOSIO_BASE_URL') || undefined

    this.composio = new Composio({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      toolkitVersions: 'latest',
    } as Record<string, unknown>)
  }

  async initiateConnectedAccount(
    userId: string,
    authConfigId: string,
    options: InitiateConnectionOptions = {},
  ): Promise<{ id: string; redirectUrl: string | null; status: string | null }> {
    const linkOptions: Record<string, unknown> = {
      ...(options.callbackUrl ? { callbackUrl: options.callbackUrl } : {}),
      ...(typeof options.allowMultiple === 'boolean'
        ? { allowMultiple: options.allowMultiple }
        : {}),
      ...(options.alias ? { alias: options.alias } : {}),
      ...(options.accountType ? { experimental: { accountType: options.accountType } } : {}),
    }

    const request = (await (options.connectionData
      ? this.composio.connectedAccounts.initiate(userId, authConfigId, {
          ...(options.callbackUrl ? { callbackUrl: options.callbackUrl } : {}),
          ...(typeof options.allowMultiple === 'boolean'
            ? { allowMultiple: options.allowMultiple }
            : {}),
          ...(options.alias ? { alias: options.alias } : {}),
          ...(options.data ? { data: options.data } : {}),
          config: AuthScheme.APIKey(options.connectionData) as never,
        })
      : this.composio.connectedAccounts.link(userId, authConfigId, linkOptions as never))) as {
      id: string
      redirectUrl?: string
      redirect_url?: string
      status?: string
    }

    return {
      id: request.id,
      redirectUrl: request.redirectUrl ?? request.redirect_url ?? null,
      status: request.status ?? null,
    }
  }

  async getConnectedAccount(connectionId: string): Promise<unknown> {
    return this.composio.connectedAccounts.get(connectionId)
  }

  async listConnectedAccounts(options: ListConnectedAccountsOptions = {}): Promise<unknown[]> {
    const params: Record<string, unknown> = {}

    if (options.userId) params.userIds = [options.userId]
    if (options.toolkitSlugs?.length) params.toolkitSlugs = options.toolkitSlugs
    if (options.statuses?.length) params.statuses = options.statuses
    if (options.authConfigIds?.length) params.authConfigIds = options.authConfigIds

    const result = (await this.composio.connectedAccounts.list(params as never)) as
      | unknown[]
      | { items?: unknown[]; data?: unknown[] }

    if (Array.isArray(result)) return result
    if (Array.isArray(result.items)) return result.items
    if (Array.isArray(result.data)) return result.data
    return []
  }

  async disconnectConnectedAccount(connectionId: string): Promise<void> {
    await this.composio.connectedAccounts.delete(connectionId)
  }

  async listToolkits(options: ListToolkitsOptions = {}): Promise<unknown[]> {
    const result = (await (
      this.composio.toolkits as { get: (opts?: Record<string, unknown>) => Promise<unknown> }
    ).get({
      ...(options.search ? { search: options.search } : {}),
      ...(typeof options.limit === 'number' ? { limit: options.limit } : {}),
      ...(options.cursor ? { cursor: options.cursor } : {}),
      ...(options.category ? { category: options.category } : {}),
    })) as unknown[] | { items?: unknown[]; data?: unknown[] }

    if (Array.isArray(result)) return result
    if (Array.isArray(result.items)) return result.items
    if (Array.isArray(result.data)) return result.data
    return []
  }

  async listToolsForToolkits(
    userId: string,
    toolkitSlugs: string[],
    limit = 500,
  ): Promise<unknown[]> {
    const result = await this.composio.tools.get(userId, {
      toolkits: toolkitSlugs,
      limit,
    })
    return this.normalizeToolsResult(result)
  }

  async executeTool(
    toolSlug: string,
    userId: string,
    argumentsPayload: Record<string, unknown>,
    connectedAccountId?: string,
  ): Promise<unknown> {
    return this.composio.tools.execute(toolSlug, {
      userId,
      arguments: argumentsPayload,
      ...(connectedAccountId ? { connectedAccountId } : {}),
      dangerouslySkipVersionCheck: true,
    } as Record<string, unknown>)
  }

  async getAccessTokenForToolkit(
    userId: string,
    toolkitSlug: string,
    connectedAccountId?: string,
  ): Promise<string | null> {
    const accounts = (await this.listConnectedAccounts({
      userId,
      toolkitSlugs: [toolkitSlug],
      statuses: ['ACTIVE'],
    })) as Array<Record<string, unknown>>

    if (accounts.length === 0) return null

    const preferredId = String(connectedAccountId ?? '').trim()
    const account =
      (preferredId
        ? accounts.find((item) => String(item.id ?? item.nanoid ?? '').trim() === preferredId)
        : null) ?? accounts[0]
    const accountId = String(account?.id ?? account?.nanoid ?? '').trim()
    if (!accountId) return null

    const details = (await this.composio.connectedAccounts.get(accountId)) as Record<
      string,
      unknown
    >

    const state = details.state as Record<string, unknown> | undefined
    const val = state?.val as Record<string, unknown> | undefined
    const connectionParams = details.connectionParams as Record<string, unknown> | undefined

    const raw =
      val?.oauth_token ??
      val?.access_token ??
      connectionParams?.access_token ??
      details.accessToken ??
      details.access_token ??
      ''
    const token = String(raw).trim()
    return token || null
  }

  async createTrigger(
    userId: string,
    slug: string,
    params: { connectedAccountId?: string; triggerConfig?: Record<string, unknown> } = {},
  ): Promise<{ triggerId: string }> {
    const result = (await this.composio.triggers.create(userId, slug, {
      ...(params.connectedAccountId ? { connectedAccountId: params.connectedAccountId } : {}),
      ...(params.triggerConfig ? { triggerConfig: params.triggerConfig } : {}),
    })) as { triggerId: string }
    return { triggerId: result.triggerId }
  }

  async disableTrigger(triggerId: string): Promise<void> {
    await this.composio.triggers.disable(triggerId)
  }

  async enableTrigger(triggerId: string): Promise<void> {
    await this.composio.triggers.enable(triggerId)
  }

  async syncToolkitCatalog(
    limit = 400,
    billing?: { userId: string; orgId?: string | null },
  ): Promise<{ success: boolean; processed: number; upserted: number }> {
    const cappedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 2000) : 400
    const toolkits = await this.listToolkits({ limit: cappedLimit })

    let upserted = 0
    for (const item of toolkits) {
      const toolkit = (item ?? {}) as Record<string, unknown>
      const slug = String(toolkit.slug ?? toolkit.toolkit_slug ?? '')
        .trim()
        .toLowerCase()
      if (!slug) continue

      const name = String(toolkit.name ?? slug).trim() || slug
      const description = String(toolkit.description ?? '').trim()
      const logo = String(toolkit.logo ?? toolkit.icon ?? '').trim()
      const categories = this.normalizeCategories(toolkit.categories)
      const metadata: Record<string, unknown> = {
        source: 'composio',
        ...(categories.length > 0 ? { categories } : {}),
      }
      const embeddingText = [name, description, categories.join(' ')].filter(Boolean).join(' — ')
      const embedding = await this.generateEmbedding(embeddingText, {
        ...(billing ?? {}),
        feature: 'integrations',
        action: 'composio_toolkit_catalog_embedding',
        metadata: { toolkit_slug: slug },
      })

      const { error } = await this.composioRepository.upsertToolkitCatalog({
        toolkit_slug: slug,
        name,
        description,
        logo: logo || null,
        categories,
        metadata,
        embedding,
        updated_at: new Date().toISOString(),
      })
      if (!error) upserted += 1
    }

    return {
      success: true,
      processed: toolkits.length,
      upserted,
    }
  }

  async searchToolkitCatalog(
    query: string,
    limit = 10,
    billing?: { userId: string; orgId?: string | null },
  ): Promise<ComposioToolkitCatalogRow[]> {
    const cleaned = query.trim()
    if (!cleaned) return []

    const embedding = await this.generateEmbedding(cleaned, {
      ...(billing ?? {}),
      feature: 'integrations',
      action: 'composio_toolkit_search_embedding',
      metadata: { query_length: cleaned.length },
    })
    const cappedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 25) : 10

    if (embedding) {
      const { data } = await this.composioRepository.searchToolkitCatalogByEmbedding(
        embedding,
        cappedLimit,
      )
      if (Array.isArray(data) && data.length > 0) {
        return data.map((row) => this.normalizeToolkitCatalogRow(row))
      }
    }

    const { data } = await this.composioRepository.searchToolkitCatalogByText(cleaned, cappedLimit)

    return (data ?? []).map((row) => this.normalizeToolkitCatalogRow(row))
  }

  private normalizeToolkitCatalogRow(value: unknown): ComposioToolkitCatalogRow {
    const row = (value ?? {}) as Record<string, unknown>
    return {
      toolkit_slug: String(row.toolkit_slug ?? ''),
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
      logo: row.logo ? String(row.logo) : null,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {},
      similarity:
        typeof row.similarity === 'number' && Number.isFinite(row.similarity)
          ? row.similarity
          : undefined,
    }
  }

  private normalizeCategories(raw: unknown): string[] {
    if (!Array.isArray(raw)) return []
    return raw
      .map((entry) =>
        String(entry ?? '')
          .trim()
          .toLowerCase(),
      )
      .filter((entry) => entry.length > 0)
      .slice(0, 12)
  }

  private normalizeToolsResult(value: unknown): unknown[] {
    const queue: unknown[] = [value]
    const discoveredTools: unknown[] = []

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) continue

      if (Array.isArray(current)) {
        for (const entry of current) queue.push(entry)
        continue
      }

      if (typeof current !== 'object') continue
      const payload = current as Record<string, unknown>
      const hasToolIdentity =
        typeof payload.slug === 'string' ||
        typeof payload.name === 'string' ||
        typeof payload.enum === 'string' ||
        typeof payload.toolSlug === 'string' ||
        typeof payload.tool_slug === 'string'

      if (hasToolIdentity) {
        discoveredTools.push(payload)
        continue
      }

      if (Array.isArray(payload.items)) queue.push(payload.items)
      if (Array.isArray(payload.data)) queue.push(payload.data)
      if (Array.isArray(payload.tools)) queue.push(payload.tools)
      if (Array.isArray(payload.results)) queue.push(payload.results)
      if (payload.tool && typeof payload.tool === 'object') queue.push(payload.tool)

      // Some Composio responses are keyed maps: { TOOL_SLUG: { ...toolSchema } }.
      // Parse those and synthesize slug from the map key when needed.
      for (const [key, nested] of Object.entries(payload)) {
        if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue
        const nestedRecord = nested as Record<string, unknown>
        const nestedHasToolIdentity =
          typeof nestedRecord.slug === 'string' ||
          typeof nestedRecord.name === 'string' ||
          typeof nestedRecord.enum === 'string' ||
          typeof nestedRecord.toolSlug === 'string' ||
          typeof nestedRecord.tool_slug === 'string'

        if (nestedHasToolIdentity) {
          discoveredTools.push(nestedRecord)
          continue
        }

        const looksLikeToolSchema =
          typeof nestedRecord.description === 'string' ||
          typeof nestedRecord.parameters === 'object' ||
          typeof nestedRecord.inputSchema === 'object' ||
          typeof nestedRecord.input_schema === 'object'

        if (looksLikeToolSchema && key.trim().length > 0) {
          discoveredTools.push({ ...nestedRecord, slug: key.trim() })
        }
      }
    }

    return discoveredTools
  }

  async syncCapabilities(
    userId?: string,
    options?: { only?: string[]; force?: boolean },
  ): Promise<{ success: boolean; composio: number; legacy: number; skipped: number }> {
    let composioCount = 0
    let legacyCount = 0
    let skippedCount = 0
    const only = options?.only
    const force = options?.force ?? false

    const { data: existingRows } = await this.composioRepository.findSyncedIntegrationIds()
    const syncedIntegrations = new Set(
      (existingRows ?? []).map((r: { integration_id: string }) => r.integration_id),
    )

    const resolvedUserId = userId || 'default'
    const activeComposioAccounts = (await this.listConnectedAccounts({
      statuses: ['ACTIVE'],
    })) as Array<Record<string, unknown>>
    const toolkitUserIdMap = new Map<string, string>()
    for (const account of activeComposioAccounts) {
      const toolkitSlug = String(
        account.toolkitSlug ??
          account.toolkit_slug ??
          (account.toolkit as Record<string, unknown> | undefined)?.slug ??
          '',
      )
        .trim()
        .toLowerCase()
      const accountUserId = String(
        account.userId ??
          account.user_id ??
          account.entityId ??
          account.entity_id ??
          account.customerId ??
          account.customer_id ??
          '',
      ).trim()
      if (!toolkitSlug || !accountUserId) continue
      if (!toolkitUserIdMap.has(toolkitSlug)) {
        toolkitUserIdMap.set(toolkitSlug, accountUserId)
      }
    }

    const { data: configs } = await this.composioRepository.findProjectToolkitConfigs()

    for (const cfg of (configs ?? []) as Array<{
      integration_id: string
      toolkit_slug: string
      enabled: boolean
      metadata?: Record<string, unknown> | null
    }>) {
      if (!cfg.enabled) continue
      if (only && !only.includes(cfg.integration_id)) continue

      if (!force && !only && syncedIntegrations.has(cfg.integration_id)) {
        skippedCount++
        this.logger.log(
          `syncCapabilities: skipped (already synced) integration=${cfg.integration_id}`,
        )
        continue
      }

      const metadata =
        cfg.metadata && typeof cfg.metadata === 'object' && !Array.isArray(cfg.metadata)
          ? (cfg.metadata as Record<string, unknown>)
          : {}
      // Absent / empty execution_mode means native/legacy. Only explicit
      // metadata.execution_mode = 'composio' opts into Composio capability sync.
      const executionMode = String(metadata.execution_mode ?? '')
        .trim()
        .toLowerCase()
      if (executionMode !== 'composio') continue

      try {
        const toolkitSlug = String(cfg.toolkit_slug ?? '')
          .trim()
          .toLowerCase()
        const toolkitUserId = toolkitUserIdMap.get(toolkitSlug) ?? resolvedUserId
        const tools = (await this.listToolsForToolkits(toolkitUserId, [cfg.toolkit_slug])) as Array<
          Record<string, unknown>
        >
        if (tools.length === 0) {
          this.logger.warn(
            `syncCapabilities: no tools discovered toolkit=${cfg.toolkit_slug} integration=${cfg.integration_id} user=${toolkitUserId}`,
          )
        }
        for (const tool of tools) {
          const t = (tool ?? {}) as Record<string, unknown>
          const slug = String(t.slug ?? t.name ?? t.enum ?? '').trim()
          if (!slug) continue
          const displayNameComposio = String(t.displayName ?? t.display_name ?? slug)
            .replace(/_/g, ' ')
            .trim()
          const descriptionComposio = String(t.description ?? '').trim()
          const parameters = (
            t.parameters && typeof t.parameters === 'object'
              ? t.parameters
              : t.inputParameters && typeof t.inputParameters === 'object'
                ? t.inputParameters
                : t.input_parameters && typeof t.input_parameters === 'object'
                  ? t.input_parameters
                  : {}
          ) as Record<string, unknown>

          const { data: existingRow } = await this.composioRepository.findIntegrationCapabilityCopy(
            cfg.integration_id,
            slug,
          )

          const existingMeta =
            existingRow?.metadata &&
            typeof existingRow.metadata === 'object' &&
            !Array.isArray(existingRow.metadata)
              ? (existingRow.metadata as Record<string, unknown>)
              : {}
          const preserveCopy = existingMeta.manual_capability_copy === true

          const displayName =
            preserveCopy &&
            typeof existingRow?.display_name === 'string' &&
            existingRow.display_name.trim()
              ? existingRow.display_name.trim()
              : displayNameComposio
          const description =
            preserveCopy &&
            typeof existingRow?.description === 'string' &&
            existingRow.description.trim()
              ? existingRow.description.trim()
              : descriptionComposio

          const embeddingText = `${cfg.integration_id} ${displayName}: ${description}`.slice(0, 500)
          const embedding = await this.generateEmbedding(embeddingText, {
            userId: resolvedUserId,
            feature: 'integrations',
            action: 'composio_capability_embedding',
            metadata: { integration_id: cfg.integration_id, action_slug: slug },
          })

          const domains = INTEGRATION_DOMAIN_MAP[cfg.integration_id] ?? ['shared']
          const { error } = await this.composioRepository.upsertIntegrationCapability({
            integration_id: cfg.integration_id,
            action_slug: slug,
            execution_mode: 'composio',
            display_name: displayName,
            description,
            parameters,
            examples: [],
            metadata: preserveCopy
              ? { ...existingMeta, source: 'composio', toolkit_slug: cfg.toolkit_slug }
              : { source: 'composio', toolkit_slug: cfg.toolkit_slug },
            domains,
            embedding,
            updated_at: new Date().toISOString(),
          })
          if (!error) composioCount++
        }
      } catch (error) {
        this.logger.warn(
          `syncCapabilities: failed toolkit=${cfg.toolkit_slug} integration=${cfg.integration_id} reason=${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    for (const entry of LEGACY_INTEGRATION_CAPABILITIES) {
      if (only && !only.includes(entry.integration_id)) continue

      if (!force && !only && syncedIntegrations.has(entry.integration_id)) {
        skippedCount++
        continue
      }

      const embeddingText =
        `${entry.integration_id} ${entry.display_name}: ${entry.description}`.slice(0, 500)
      const embedding = await this.generateEmbedding(embeddingText, {
        userId: resolvedUserId,
        feature: 'integrations',
        action: 'composio_legacy_capability_embedding',
        metadata: { integration_id: entry.integration_id, action_slug: entry.action_slug },
      })
      const domains = INTEGRATION_DOMAIN_MAP[entry.integration_id] ?? ['shared']
      const routeConfig = getLegacyIntegrationRouteConfig(entry.integration_id, entry.action_slug)

      const { error } = await this.composioRepository.upsertIntegrationCapability({
        ...entry,
        route_config: routeConfig ?? null,
        domains,
        embedding,
        updated_at: new Date().toISOString(),
      })
      if (!error) legacyCount++
    }

    return { success: true, composio: composioCount, legacy: legacyCount, skipped: skippedCount }
  }

  private async generateEmbedding(
    text: string,
    billing?: EmbeddingBillingContext,
  ): Promise<number[] | null> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) return null
    const model = this.config.get<string>('EMBEDDING_MODEL') || 'gemini-embedding-2'
    const content = text.trim()
    if (!content) return null

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=` +
        encodeURIComponent(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: content }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 768,
        }),
      },
    )
    if (!response.ok) return null
    const json = (await response.json()) as { embedding?: { values?: number[] } }
    const values = json.embedding?.values
    if (!Array.isArray(values)) return null
    await this.chargeEmbeddingUsage(text, model, billing)
    return values
  }

  private async chargeEmbeddingUsage(
    text: string,
    modelName: string,
    billing?: EmbeddingBillingContext,
  ): Promise<void> {
    if (!billing?.userId) return
    if (!this.creditsService) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('composio_billing_service_not_configured')
    }
    const inputTokens = Math.max(1, Math.ceil(text.length / 4))
    await this.creditsService.processDirectTextUsage({
      userId: billing.userId,
      orgId: billing.orgId ?? undefined,
      feature: billing.feature,
      action: billing.action,
      modelName,
      usage: {
        input: inputTokens,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: inputTokens,
      },
      costSource: 'char_estimate',
      metadata: billing.metadata,
    })
  }
}
