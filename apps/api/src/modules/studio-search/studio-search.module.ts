import { Module } from '@nestjs/common'
import { StudioSearchController } from './controllers/studio-search.controller'
import { StudioSearchRepository } from './repositories/studio-search.repository'
import { StudioSearchService } from './services/studio-search.service'

@Module({
  controllers: [StudioSearchController],
  providers: [StudioSearchService, StudioSearchRepository],
})
export class StudioSearchModule {}
