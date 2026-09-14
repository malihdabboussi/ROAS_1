import { Module } from '@nestjs/common'
import { VaultModule } from '../../vault/vault.module'
import { MeetingProvidersModule } from '../providers/meeting-providers.module'
import { CustomNoteTakerResolver } from './custom-note-taker.resolver'
import { MeetingProviderDefinitionsRepository } from './meeting-provider-definitions.repository'
import { MeetingProviderDefinitionsService } from './meeting-provider-definitions.service'

/**
 * Note takers defined from Settings. Registers the dynamic resolver on the
 * provider registry so the door, intake and Library see definitions as
 * providers without a code plug-in per tool.
 */
@Module({
  imports: [MeetingProvidersModule, VaultModule],
  providers: [
    MeetingProviderDefinitionsRepository,
    MeetingProviderDefinitionsService,
    CustomNoteTakerResolver,
  ],
  exports: [MeetingProviderDefinitionsRepository, MeetingProviderDefinitionsService],
})
export class CustomNoteTakersModule {}
