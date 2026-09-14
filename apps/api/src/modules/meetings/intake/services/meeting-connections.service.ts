import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { VaultService } from '../../../vault/services/vault.service'
import { CUSTOM_NOTE_TAKER_SECRET_LABEL } from '../../custom/custom-webhook-transcript-provider'
import { MeetingProviderDefinitionsRepository } from '../../custom/meeting-provider-definitions.repository'
import type { NoteTakerDefinition } from '../../custom/note-taker-definition.schema'
import {
  isCustomMeetingProviderId,
  type CustomMeetingProviderId,
} from '../../providers/transcript-source.types'
import {
  buildMeetingWebhookUrl,
  readWebhookKey,
  resolvePublicApiUrl,
} from '../../providers/webhook-key'
import { MeetingIntakeRepository } from '../repositories/meeting-intake.repository'

export type MeetingConnectionStatus = {
  connected: boolean
  status: string | null
  connectedAt: string | null
  /** Address to paste into the tool; available as soon as an address was requested. */
  webhookUrl: string | null
  requiresSecret: boolean
  secretConfigured: boolean
}

/**
 * Connect, status and disconnect for note takers defined from Settings. The
 * address can be requested before connecting (a pending row holds the key),
 * because most tools hand out their signing secret only once a webhook with
 * our address exists.
 */
@Injectable()
export class MeetingConnectionsService {
  private readonly apiUrl: string

  constructor(
    private readonly connections: MeetingIntakeRepository,
    private readonly definitions: MeetingProviderDefinitionsRepository,
    private readonly vault: VaultService,
    @Optional() config?: ConfigService,
  ) {
    this.apiUrl = resolvePublicApiUrl((key) => config?.get<string>(key) ?? process.env[key])
  }

  async webhookAddress(providerParam: string, userId: string): Promise<{ webhookUrl: string }> {
    const definition = await this.requireDefinition(providerParam)
    await this.connections.ensurePendingWebhookConnection(definition.slug, userId, {
      connectionLabel: definition.displayName,
    })
    const key = await this.connections.ensureWebhookKey(definition.slug, userId)
    return { webhookUrl: buildMeetingWebhookUrl(this.apiUrl, definition.slug, key)! }
  }

  async connect(
    providerParam: string,
    userId: string,
    secret: string | undefined,
  ): Promise<{ webhookUrl: string }> {
    const definition = await this.requireDefinition(providerParam)
    const requiresSecret = definition.signature.scheme !== 'none'
    const trimmed = secret?.trim() ?? ''
    if (requiresSecret && trimmed.length < 8) {
      throw new BadRequestException(
        `Paste the signing secret ${definition.displayName} shows for the webhook`,
      )
    }
    if (requiresSecret) {
      await this.vault.storeSecret(
        userId,
        definition.slug,
        CUSTOM_NOTE_TAKER_SECRET_LABEL,
        trimmed,
        'custom',
        {},
      )
    }
    await this.connections.upsertPastedWebhookConnection(definition.slug, userId, {
      connectionLabel: definition.displayName,
    })
    const key = await this.connections.ensureWebhookKey(definition.slug, userId)
    return { webhookUrl: buildMeetingWebhookUrl(this.apiUrl, definition.slug, key)! }
  }

  async disconnect(providerParam: string, userId: string): Promise<void> {
    const definition = await this.requireDefinition(providerParam)
    await this.vault.deleteSecret(userId, definition.slug, CUSTOM_NOTE_TAKER_SECRET_LABEL)
    await this.connections.markPastedWebhookDisconnected(definition.slug, userId)
  }

  async status(providerParam: string, userId: string): Promise<MeetingConnectionStatus> {
    const definition = await this.requireDefinition(providerParam)
    const requiresSecret = definition.signature.scheme !== 'none'
    const secretConfigured = requiresSecret
      ? await this.vault.hasSecret(userId, definition.slug, CUSTOM_NOTE_TAKER_SECRET_LABEL)
      : true
    const connection = await this.connections.findAnyConnectionForUser(definition.slug, userId)
    if (!connection) {
      return {
        connected: false,
        status: null,
        connectedAt: null,
        webhookUrl: null,
        requiresSecret,
        secretConfigured,
      }
    }
    return {
      connected: connection.status === 'connected' && secretConfigured,
      status: connection.status,
      connectedAt:
        typeof connection.metadata.connected_at === 'string'
          ? connection.metadata.connected_at
          : null,
      webhookUrl: buildMeetingWebhookUrl(
        this.apiUrl,
        definition.slug,
        readWebhookKey(connection.metadata),
      ),
      requiresSecret,
      secretConfigured,
    }
  }

  private async requireDefinition(providerParam: string): Promise<NoteTakerDefinition> {
    if (!isCustomMeetingProviderId(providerParam)) {
      throw new NotFoundException('Unknown note taker')
    }
    const definition = await this.definitions.findBySlug(providerParam as CustomMeetingProviderId, {
      activeOnly: true,
    })
    if (!definition) throw new NotFoundException('Unknown note taker')
    return definition
  }
}
