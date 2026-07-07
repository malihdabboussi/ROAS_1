import { Global, Module } from '@nestjs/common'
import { MissionWorkerBillingClientService } from './mission-worker-billing-client.service'
import { ProviderBillingReconcilerService } from './provider-billing-reconciler.service'

@Global()
@Module({
  providers: [MissionWorkerBillingClientService, ProviderBillingReconcilerService],
  exports: [MissionWorkerBillingClientService],
})
export class ProviderBillingModule {}
