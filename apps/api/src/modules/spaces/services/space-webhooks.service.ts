import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { VaultService } from '../../vault/services/vault.service'
import type {
  CreateSpaceWebhookEndpointDto,
  UpdateSpaceWebhookEndpointDto,
  WebhookFieldMappingDto,
} from '../dto'
import {
  SpaceWebhooksRepository,
  type SpaceWebhookEndpointRecord,
  type SpaceWebhookEventRecord,
} from '../repositories/space-webhooks.repository'
import { SpaceAutomationService } from './space-automation.service'
import {
  applyWebhookFieldMappings,
  inferWebhookValueType,
  resolveJsonPointer,
} from './space-webhook-mapping'

const WEBHOOK_VAULT_PROVIDER = 'flow_webhook'

type WebhookEndpointResponse = Omit<SpaceWebhookEndpointRecord, 'vault_secret_label'> & {
  webhook_url: string
}

type IncomingWebhookInput = {
  publicToken: string
  rawBody: Buffer | undefined
  signature: string | undefined
  idempotencyKey?: string
  query?: Record<string, unknown>
  headers?: Record<string, unknown>
}

@Injectable()
export class SpaceWebhooksService {
  constructor(
    private readonly repo: SpaceWebhooksRepository,
    private readonly vault: VaultService,
    private readonly automationService: SpaceAutomationService,
    private readonly configService: ConfigService,
  ) {}

  async listEndpoints(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<WebhookEndpointResponse[]> {
    const rows = await this.repo.listEndpoints(supabase, spaceId)
    return rows.map((row) => this.toEndpointResponse(row))
  }

  async createEndpoint(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    spaceId: string,
    dto: CreateSpaceWebhookEndpointDto,
  ): Promise<WebhookEndpointResponse & { signing_secret: string }> {
    const signingSecret = this.generateSecret()
    const vaultLabel = `space-webhook:${randomBytes(16).toString('hex')}`
    const publicToken = randomBytes(32).toString('base64url')
    const mappings = this.prepareMappingsForStore(dto.field_mappings ?? [], dto.sample_payload)

    await this.vault.storeSecret(userId, WEBHOOK_VAULT_PROVIDER, vaultLabel, signingSecret, 'hmac')
    try {
      const row = await this.repo.createEndpoint(supabase, {
        org_id: orgId,
        space_id: spaceId,
        created_by: userId,
        name: dto.name.trim(),
        public_token: publicToken,
        vault_secret_label: vaultLabel,
        field_mappings: mappings,
        sample_payload: dto.sample_payload ?? null,
      })
      return { ...this.toEndpointResponse(row), signing_secret: signingSecret }
    } catch (err) {
      await this.vault.deleteSecret(userId, WEBHOOK_VAULT_PROVIDER, vaultLabel)
      throw err
    }
  }

  async updateEndpoint(
    supabase: SupabaseClient,
    spaceId: string,
    endpointId: string,
    dto: UpdateSpaceWebhookEndpointDto,
  ): Promise<WebhookEndpointResponse> {
    const existing = await this.requireEndpoint(supabase, spaceId, endpointId)
    const samplePayload =
      dto.sample_payload === undefined ? existing.sample_payload : (dto.sample_payload ?? null)
    const patch: Record<string, unknown> = {}
    if (dto.name !== undefined) patch.name = dto.name.trim()
    if (dto.status !== undefined) patch.status = dto.status
    if (dto.sample_payload !== undefined) patch.sample_payload = dto.sample_payload ?? null
    if (dto.field_mappings !== undefined) {
      patch.field_mappings = this.prepareMappingsForStore(dto.field_mappings, samplePayload)
    }
    const row = await this.repo.updateEndpoint(supabase, endpointId, patch)
    return this.toEndpointResponse(row)
  }

  async deleteEndpoint(
    supabase: SupabaseClient,
    spaceId: string,
    endpointId: string,
  ): Promise<WebhookEndpointResponse> {
    const existing = await this.requireEndpoint(supabase, spaceId, endpointId)
    await this.vault.deleteSecret(
      existing.created_by,
      WEBHOOK_VAULT_PROVIDER,
      existing.vault_secret_label,
    )
    const row = await this.repo.updateEndpoint(supabase, endpointId, { status: 'disabled' })
    return this.toEndpointResponse(row)
  }

  async rotateSecret(
    supabase: SupabaseClient,
    spaceId: string,
    endpointId: string,
  ): Promise<WebhookEndpointResponse & { signing_secret: string }> {
    const existing = await this.requireEndpoint(supabase, spaceId, endpointId)
    const signingSecret = this.generateSecret()
    await this.vault.storeSecret(
      existing.created_by,
      WEBHOOK_VAULT_PROVIDER,
      existing.vault_secret_label,
      signingSecret,
      'hmac',
    )
    const row = await this.repo.updateEndpoint(supabase, endpointId, { status: 'active' })
    return { ...this.toEndpointResponse(row), signing_secret: signingSecret }
  }

  async listEvents(
    supabase: SupabaseClient,
    spaceId: string,
    endpointId: string,
    limit: number,
  ): Promise<SpaceWebhookEventRecord[]> {
    await this.requireEndpoint(supabase, spaceId, endpointId)
    return this.repo.listEvents(supabase, endpointId, limit)
  }

  async assertEndpointUsableForTrigger(
    supabase: SupabaseClient,
    spaceId: string,
    trigger: unknown,
  ): Promise<void> {
    if (!trigger || typeof trigger !== 'object') return
    const record = trigger as Record<string, unknown>
    if (record.type !== 'webhook_received') return
    const endpointId = String(record.webhook_endpoint_id ?? '').trim()
    if (!endpointId) throw new BadRequestException('Webhook trigger requires a webhook endpoint')
    const endpoint = await this.repo.findEndpoint(supabase, spaceId, endpointId)
    if (!endpoint || endpoint.status !== 'active') {
      throw new BadRequestException('Webhook trigger endpoint is missing or disabled')
    }
  }

  async handleIncomingWebhook(input: IncomingWebhookInput): Promise<{
    success: boolean
    duplicate?: boolean
    event_id?: string
    matched_automation_ids?: string[]
  }> {
    if (!input.rawBody) throw new BadRequestException('Missing raw body')
    if (!input.signature) throw new BadRequestException('Missing x-vibey-signature header')

    const endpoint = await this.repo.findActiveEndpointByPublicToken(input.publicToken)
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found')

    const secret = await this.vault.getSecret(
      endpoint.created_by,
      WEBHOOK_VAULT_PROVIDER,
      endpoint.vault_secret_label,
    )
    if (!secret) throw new InternalServerErrorException('Webhook signing secret is missing')
    if (!this.verifySignature(input.rawBody, secret, input.signature)) {
      throw new UnauthorizedException('Invalid webhook signature')
    }

    let payload: unknown
    try {
      payload = JSON.parse(input.rawBody.toString('utf8')) as unknown
    } catch {
      throw new BadRequestException('Webhook body must be valid JSON')
    }

    const nowIso = new Date().toISOString()
    const mappings = this.normalizeMappings(endpoint.field_mappings)
    const fields = applyWebhookFieldMappings(payload, mappings)
    const serviceClient = this.repo.getServiceClient()
    const inserted = await this.repo.insertEvent(serviceClient, {
      endpoint_id: endpoint.id,
      org_id: endpoint.org_id,
      space_id: endpoint.space_id,
      idempotency_key: this.normalizeIdempotencyKey(input.idempotencyKey),
      payload,
      fields,
      query: this.safeRecord(input.query),
      headers_summary: this.summarizeHeaders(input.headers),
      status: 'received',
    })
    if (inserted.error) {
      if (inserted.error.code === '23505') return { success: true, duplicate: true }
      throw new BadRequestException(inserted.error.message)
    }
    const event = inserted.data
    if (!event) throw new InternalServerErrorException('Webhook event was not recorded')

    try {
      const result = await this.automationService.processWebhookEvent(serviceClient, {
        endpointId: endpoint.id,
        eventId: event.id,
        userId: endpoint.created_by,
        orgId: endpoint.org_id,
        spaceId: endpoint.space_id,
        payload,
        fields,
        query: this.safeRecord(input.query),
        receivedAt: nowIso,
      })
      const matchedAutomationIds = result.matched_automation_ids
      await this.repo.updateEvent(serviceClient, event.id, {
        status:
          matchedAutomationIds.length === 0 ? 'ignored' : result.queued ? 'queued' : 'processed',
        matched_automation_ids: matchedAutomationIds,
        processed_at: new Date().toISOString(),
      })
      await this.repo.markEndpointReceived(serviceClient, endpoint.id, nowIso)
      return {
        success: true,
        event_id: event.id,
        matched_automation_ids: matchedAutomationIds,
      }
    } catch (err) {
      await this.repo.updateEvent(serviceClient, event.id, {
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
        processed_at: new Date().toISOString(),
      })
      throw err
    }
  }

  private async requireEndpoint(
    supabase: SupabaseClient,
    spaceId: string,
    endpointId: string,
  ): Promise<SpaceWebhookEndpointRecord> {
    const endpoint = await this.repo.findEndpoint(supabase, spaceId, endpointId)
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found')
    return endpoint
  }

  private prepareMappingsForStore(
    mappings: WebhookFieldMappingDto[],
    samplePayload: unknown,
  ): WebhookFieldMappingDto[] {
    return mappings.map((mapping) => ({
      ...mapping,
      label: mapping.label.trim(),
      value_type:
        mapping.value_type ??
        inferWebhookValueType(resolveJsonPointer(samplePayload, mapping.source_path)),
    }))
  }

  private normalizeMappings(raw: unknown): WebhookFieldMappingDto[] {
    return Array.isArray(raw) ? (raw as WebhookFieldMappingDto[]) : []
  }

  private verifySignature(rawBody: Buffer, secret: string, signature: string): boolean {
    const trimmed = signature.trim()
    if (!trimmed.startsWith('sha256=')) return false
    const actualHex = trimmed.slice('sha256='.length)
    if (!/^[a-f0-9]{64}$/i.test(actualHex)) return false
    const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex')
    const actual = Buffer.from(actualHex, 'hex')
    const expected = Buffer.from(expectedHex, 'hex')
    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
  }

  private toEndpointResponse(row: SpaceWebhookEndpointRecord): WebhookEndpointResponse {
    const { vault_secret_label: _vaultSecretLabel, ...rest } = row
    return {
      ...rest,
      webhook_url: this.buildWebhookUrl(row.public_token),
    }
  }

  private buildWebhookUrl(publicToken: string): string {
    const baseUrl = (
      this.configService.get<string>('PUBLIC_API_URL') ||
      this.configService.get<string>('API_URL') ||
      this.configService.get<string>('BACKEND_URL') ||
      ''
    ).trim()
    const path = `/api/flow-webhooks/${publicToken}`
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(32).toString('base64url')}`
  }

  private normalizeIdempotencyKey(value: string | undefined): string | null {
    const trimmed = String(value ?? '').trim()
    return trimmed ? trimmed.slice(0, 200) : null
  }

  private safeRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private summarizeHeaders(value: unknown): Record<string, unknown> {
    const headers = this.safeRecord(value)
    const summary: Record<string, unknown> = {}
    for (const key of ['content-type', 'user-agent', 'x-vibey-event-id', 'x-webhook-id']) {
      if (headers[key] !== undefined) summary[key] = headers[key]
    }
    return summary
  }
}
