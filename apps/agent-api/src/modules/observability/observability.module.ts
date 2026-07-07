import { Module } from '@nestjs/common'
import { RuntimeIdentityGuard } from '../agent-sync/guards/runtime-identity.guard'
import { InternalOpenClawObservabilityController } from './internal-openclaw-observability.controller'

@Module({
  controllers: [InternalOpenClawObservabilityController],
  providers: [RuntimeIdentityGuard],
})
export class ObservabilityModule {}
