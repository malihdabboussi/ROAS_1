import { Injectable } from '@nestjs/common'
import {
  describeProviderCapabilities,
  type ProviderCapabilities,
  type TranscriptProvider,
} from './transcript-provider.contract'
import type { MeetingProviderId } from './transcript-source.types'

/**
 * Resolves providers that are not code plug-ins (note takers defined from
 * Settings). Consulted only when the in-memory map has no match.
 */
export interface DynamicProviderResolver {
  resolve(id: MeetingProviderId): Promise<TranscriptProvider | null>
  listCapabilities(): Promise<ProviderCapabilities[]>
}

/**
 * Single registry of transcript providers. Provider modules register their
 * adapter in `onModuleInit`; the intake and the UI read from here. Built-in
 * plug-ins live in the map; definition-backed ones come from the resolver.
 */
@Injectable()
export class MeetingProviderRegistry {
  private readonly providers = new Map<MeetingProviderId, TranscriptProvider>()
  private resolver: DynamicProviderResolver | null = null

  register(provider: TranscriptProvider): void {
    const id = provider.identity.id
    if (this.providers.has(id)) {
      throw new Error(`Meeting provider already registered: ${id}`)
    }
    this.providers.set(id, provider)
  }

  registerResolver(resolver: DynamicProviderResolver): void {
    if (this.resolver) throw new Error('Meeting provider resolver already registered')
    this.resolver = resolver
  }

  /** Built-in plug-ins only; use `resolve` when the id may be a defined note taker. */
  get(id: MeetingProviderId): TranscriptProvider | null {
    return this.providers.get(id) ?? null
  }

  require(id: MeetingProviderId): TranscriptProvider {
    const provider = this.get(id)
    if (!provider) throw new Error(`Meeting provider not registered: ${id}`)
    return provider
  }

  async resolve(id: MeetingProviderId): Promise<TranscriptProvider | null> {
    const builtIn = this.providers.get(id)
    if (builtIn) return builtIn
    return this.resolver ? this.resolver.resolve(id) : null
  }

  list(): TranscriptProvider[] {
    return [...this.providers.values()]
  }

  /** Built-in capabilities only. */
  capabilities(): ProviderCapabilities[] {
    return this.list().map(describeProviderCapabilities)
  }

  /** Built-in plus defined note takers. */
  async listCapabilities(): Promise<ProviderCapabilities[]> {
    const dynamic = this.resolver ? await this.resolver.listCapabilities() : []
    return [...this.capabilities(), ...dynamic]
  }
}
