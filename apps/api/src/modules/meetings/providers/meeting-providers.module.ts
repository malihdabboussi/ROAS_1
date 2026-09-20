import { Module } from '@nestjs/common'
import { MeetingProviderRegistry } from './meeting-provider.registry'

/**
 * Dependency-free leaf module holding the provider registry, so integration
 * modules (Fathom, Fireflies, Read.ai) and the intake module can both import
 * it without creating an import cycle.
 */
@Module({
  providers: [MeetingProviderRegistry],
  exports: [MeetingProviderRegistry],
})
export class MeetingProvidersModule {}
