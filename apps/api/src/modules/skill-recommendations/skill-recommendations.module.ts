import { Module } from '@nestjs/common'
import { MissionsModule } from '../missions/missions.module'
import { SkillRecommendationsController } from './controllers/skill-recommendations.controller'
import { AgentLearningLoopRepository } from './repositories/agent-learning-loop.repository'
import { SkillRecommendationsRepository } from './repositories/skill-recommendations.repository'
import { SkillRecommendationDetectionService } from './services/skill-recommendation-detection.service'
import { SkillRecommendationJaimeService } from './services/skill-recommendation-jaime.service'
import { SkillRecommendationJobsService } from './services/skill-recommendation-jobs.service'
import { SkillRecommendationsService } from './services/skill-recommendations.service'
import { AgentLearningLoopPolicyService } from './services/agent-learning-loop-policy.service'
import { AgentLearningLoopApplyService } from './services/agent-learning-loop-apply.service'

@Module({
  imports: [MissionsModule],
  controllers: [SkillRecommendationsController],
  providers: [
    SkillRecommendationsService,
    SkillRecommendationDetectionService,
    SkillRecommendationJobsService,
    SkillRecommendationJaimeService,
    AgentLearningLoopPolicyService,
    AgentLearningLoopApplyService,
    AgentLearningLoopRepository,
    SkillRecommendationsRepository,
  ],
  exports: [
    SkillRecommendationsService,
    SkillRecommendationDetectionService,
    AgentLearningLoopPolicyService,
    AgentLearningLoopApplyService,
  ],
})
export class SkillRecommendationsModule {}
