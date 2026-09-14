import { Injectable } from '@nestjs/common'
import {
  describeProviderCapabilities,
  type ProviderCapabilities,
  type TranscriptProvider,
} from './transcript-provider.contract'
import type { MeetingProviderId } from './transcript-source.types'

/**
 * Single registry of transcript providers. Provider modules register their
 * adapter in `onModuleInit`; the intake and the UI read from here.
 */
@Injectable()
export class MeetingProviderRegistry {
  private readonly providers = new Map<MeetingProviderId, TranscriptProvider>()

  register(provider: TranscriptProvider): void {
    const id = provider.identity.id
    if (this.providers.has(id)) {
      throw new Error(`Meeting provider already registered: ${id}`)
    }
    this.providers.set(id, provider)
  }

  get(id: MeetingProviderId): TranscriptProvider | null {
    return this.providers.get(id) ?? null
  }

  require(id: MeetingProviderId): TranscriptProvider {
    const provider = this.get(id)
    if (!provider) throw new Error(`Meeting provider not registered: ${id}`)
    return provider
  }

  list(): TranscriptProvider[] {
    return [...this.providers.values()]
  }

  capabilities(): ProviderCapabilities[] {
    return this.list().map(describeProviderCapabilities)
  }
}
