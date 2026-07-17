import { Module } from '@nestjs/common'
import { EntitySearchController } from './controllers/entity-search.controller'
import { EntitySearchRepository } from './repositories/entity-search.repository'
import { EntityArtifactSearchRepository } from './repositories/entity-artifact-search.repository'
import { EntityArtifactSearchService } from './services/entity-artifact-search.service'
import { EntitySearchService } from './services/entity-search.service'

@Module({
  controllers: [EntitySearchController],
  providers: [
    EntitySearchService,
    EntitySearchRepository,
    EntityArtifactSearchService,
    EntityArtifactSearchRepository,
  ],
  exports: [EntitySearchService],
})
export class EntitySearchModule {}
