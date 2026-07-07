import { Module } from '@nestjs/common'
import { TransferController } from './controllers/transfer.controller'
import { TransferCampaignCopyRepository } from './repositories/transfer-campaign-copy.repository'
import { TransferRepository } from './repositories/transfer.repository'
import { TransferSpaceRepository } from './repositories/transfer-space.repository'
import { TransferViewRepository } from './repositories/transfer-view.repository'
import { TransferService } from './services/transfer.service'

@Module({
  controllers: [TransferController],
  providers: [
    TransferService,
    TransferRepository,
    TransferViewRepository,
    TransferCampaignCopyRepository,
    TransferSpaceRepository,
  ],
  exports: [TransferService],
})
export class TransferModule {}
