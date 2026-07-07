import { Module } from '@nestjs/common'
import { BrainModule } from '../brain/brain.module'
import { SpaceKnowledgeGraphController } from './controllers/space-knowledge-graph.controller'
import { SpaceRetrievalRepository } from './repositories/space-retrieval.repository'
import { SpaceKnowledgeGraphService } from './services/space-knowledge-graph.service'
import { SpaceRetrievalIndexService } from './services/space-retrieval-index.service'
import { SpaceSemanticEdgeWriterService } from './services/space-semantic-edge-writer.service'
import { SpaceStructuralEdgeBuilderService } from './services/space-structural-edge-builder.service'

@Module({
  imports: [BrainModule],
  controllers: [SpaceKnowledgeGraphController],
  providers: [
    SpaceRetrievalIndexService,
    SpaceKnowledgeGraphService,
    SpaceSemanticEdgeWriterService,
    SpaceStructuralEdgeBuilderService,
    SpaceRetrievalRepository,
  ],
  exports: [SpaceRetrievalIndexService, SpaceKnowledgeGraphService],
})
export class SpaceRetrievalModule {}
