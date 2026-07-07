import { Module } from '@nestjs/common'
import { BrainModule } from '../brain/brain.module'
import { SpacesRetrievalRepository } from './repositories/spaces-retrieval.repository'
import { SpaceAssetIndexRegistry } from './services/space-asset-index.registry'
import { SpaceAssetIndexService } from './services/space-asset-index.service'
import { SpaceGraphExpansionService } from './services/space-graph-expansion.service'
import { SpaceKeywordContextService } from './services/space-keyword-context.service'
import { SpaceRetrievalService } from './services/space-retrieval.service'
import { SpaceSemanticChunkWriterService } from './services/space-semantic-chunk-writer.service'
import { SpaceSemanticEdgeWriterService } from './services/space-semantic-edge-writer.service'
import { SpaceStructuralEdgeBuilderService } from './services/space-structural-edge-builder.service'

@Module({
  imports: [BrainModule],
  providers: [
    SpacesRetrievalRepository,
    SpaceAssetIndexRegistry,
    SpaceAssetIndexService,
    SpaceKeywordContextService,
    SpaceGraphExpansionService,
    SpaceRetrievalService,
    SpaceSemanticChunkWriterService,
    SpaceSemanticEdgeWriterService,
    SpaceStructuralEdgeBuilderService,
  ],
  exports: [SpaceAssetIndexService, SpaceRetrievalService],
})
export class SpacesRetrievalModule {}
