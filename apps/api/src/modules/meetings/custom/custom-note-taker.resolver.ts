import { Injectable, type OnModuleInit } from '@nestjs/common'
import { VaultService } from '../../vault/services/vault.service'
import {
  MeetingProviderRegistry,
  type DynamicProviderResolver,
} from '../providers/meeting-provider.registry'
import {
  describeProviderCapabilities,
  type ProviderCapabilities,
  type TranscriptProvider,
} from '../providers/transcript-provider.contract'
import {
  isCustomMeetingProviderId,
  type MeetingProviderId,
} from '../providers/transcript-source.types'
import { CustomWebhookTranscriptProvider } from './custom-webhook-transcript-provider'
import { MeetingProviderDefinitionsRepository } from './meeting-provider-definitions.repository'

/**
 * Turns a stored definition into a provider on demand. One database read per
 * webhook keeps every API instance current after an admin edits a definition.
 */
@Injectable()
export class CustomNoteTakerResolver implements DynamicProviderResolver, OnModuleInit {
  constructor(
    private readonly registry: MeetingProviderRegistry,
    private readonly definitions: MeetingProviderDefinitionsRepository,
    private readonly vault: VaultService,
  ) {}

  onModuleInit(): void {
    this.registry.registerResolver(this)
  }

  async resolve(id: MeetingProviderId): Promise<TranscriptProvider | null> {
    if (!isCustomMeetingProviderId(id)) return null
    const definition = await this.definitions.findBySlug(id, { activeOnly: true })
    if (!definition) return null
    return new CustomWebhookTranscriptProvider(definition, (userId, provider, label) =>
      this.vault.getSecret(userId, provider, label),
    )
  }

  async listCapabilities(): Promise<ProviderCapabilities[]> {
    const definitions = await this.definitions.listActive()
    return definitions.map((definition) =>
      describeProviderCapabilities(
        new CustomWebhookTranscriptProvider(definition, async () => null),
      ),
    )
  }
}
