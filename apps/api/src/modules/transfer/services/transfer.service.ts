import { TransferServiceBase04 } from './transfer-service-04.base'
import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { TransferCampaignCopyRepository } from '../repositories/transfer-campaign-copy.repository'
import { TransferRepository } from '../repositories/transfer.repository'
import { TransferSpaceRepository } from '../repositories/transfer-space.repository'
import { TransferViewRepository } from '../repositories/transfer-view.repository'

@Injectable()
export class TransferService extends TransferServiceBase04 {
  constructor(
    svc: SupabaseServiceClient,
    transferRepository: TransferRepository,
    transferViewRepository: TransferViewRepository,
    transferCampaignCopyRepository: TransferCampaignCopyRepository,
    transferSpaceRepository: TransferSpaceRepository,
  ) {
    super(
      svc,
      transferRepository,
      transferViewRepository,
      transferCampaignCopyRepository,
      transferSpaceRepository,
    )
  }
}
