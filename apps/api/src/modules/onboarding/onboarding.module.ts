import { Module } from '@nestjs/common'
import { MachinesModule } from '../machines/machines.module'
import { MissionsModule } from '../missions/missions.module'
import { OnboardingController } from './controllers/onboarding.controller'
import { OnboardingRepository } from './repositories/onboarding.repository'
import { OnboardingStatusService } from './services/onboarding-status.service'

@Module({
  imports: [MachinesModule, MissionsModule],
  controllers: [OnboardingController],
  providers: [OnboardingStatusService, OnboardingRepository],
})
export class OnboardingModule {}
