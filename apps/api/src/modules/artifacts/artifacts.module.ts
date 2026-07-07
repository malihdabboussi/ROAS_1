import { Module } from '@nestjs/common'
import { ArtifactsController } from './controllers/artifacts.controller'
import { ArtifactsRepository } from './repositories/artifacts.repository'
import { ArtifactSkillDeleteService } from './services/artifact-skill-delete.service'
import { ArtifactsService } from './services/artifacts.service'

@Module({
  controllers: [ArtifactsController],
  providers: [ArtifactsRepository, ArtifactSkillDeleteService, ArtifactsService],
})
export class ArtifactsModule {}
