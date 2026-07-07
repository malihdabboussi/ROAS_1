import { Module } from '@nestjs/common'
import { EntitySearchController } from './controllers/entity-search.controller'
import { EntitySearchRepository } from './repositories/entity-search.repository'
import { EntitySearchService } from './services/entity-search.service'

@Module({
  controllers: [EntitySearchController],
  providers: [EntitySearchService, EntitySearchRepository],
  exports: [EntitySearchService],
})
export class EntitySearchModule {}
