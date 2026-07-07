import { TransferServiceBase03 } from './transfer-service-03.base'
import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { TransferRepository } from '../repositories/transfer.repository'
import {
  CHILD_TABLES_NO_ORG_ID,
  CHILD_TABLES_WITH_ORG_ID,
  MOVABLE_ARTIFACT_TABLES,
  SPACE_CHILD_TABLES_WITH_ORG_ID,
  type MovableArtifactTable,
  type TransferContext,
  type TransferExecuteResult,
  type TransferMode,
  type TransferOptions,
  type TransferPreviewResult,
} from '../transfer.types'

export abstract class TransferServiceBase04 extends TransferServiceBase03 {

  protected async countLinkedContacts(campaignId: string, userId: string): Promise<number> {
    return this.transferRepository.countLinkedContacts(this.supabase, campaignId, userId)
  }
}
