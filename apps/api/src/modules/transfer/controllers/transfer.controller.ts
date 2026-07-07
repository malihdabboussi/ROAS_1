import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase, ZodValidationPipe } from '@vibey/api-shared'
import {
  TransferExecuteSchema,
  TransferPreviewSchema,
  type TransferExecuteInput,
  type TransferPreviewInput,
} from '../transfer.dto'
import { TransferService } from '../services/transfer.service'
import type { TransferExecuteResult, TransferPreviewResult } from '../transfer.types'

@Controller('transfer')
@UseGuards(AuthGuard, ThrottlerGuard)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  private assertSpaceViewTransferEnabled(entityType: TransferPreviewInput['entity_type']) {
    if (entityType !== 'space' && entityType !== 'view') return
    if (process.env.TRANSFER_SPACE_VIEW_ENABLED === 'false') {
      throw new NotFoundException('Space/view transfer is disabled')
    }
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async preview(
    @Body(new ZodValidationPipe(TransferPreviewSchema)) dto: TransferPreviewInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ success: boolean; preview: TransferPreviewResult }> {
    let preview: TransferPreviewResult
    this.assertSpaceViewTransferEnabled(dto.entity_type)

    switch (dto.entity_type) {
      case 'campaign':
        preview = await this.transferService.previewCampaign(
          dto.entity_id,
          user.id,
          dto.target_context,
          dto.mode,
        )
        break
      case 'artifact':
        if (!dto.artifact_table) {
          throw new Error('artifact_table is required for artifact transfers')
        }
        preview = await this.transferService.previewArtifact(
          dto.artifact_table,
          dto.entity_id,
          user.id,
          dto.target_context,
          dto.mode,
        )
        break
      case 'media':
        preview = await this.transferService.previewArtifact(
          'media_assets',
          dto.entity_id,
          user.id,
          dto.target_context,
          dto.mode,
        )
        break
      case 'project':
        preview = await this.transferService.previewProject(
          dto.entity_id,
          user.id,
          dto.target_context,
          dto.mode,
        )
        break
      case 'space':
        preview = await this.transferService.previewSpace(
          dto.entity_id,
          user.id,
          dto.target_context,
          dto.mode,
        )
        break
      case 'view':
        preview = await this.transferService.previewView(
          dto.entity_id,
          user.id,
          dto.target_context,
          dto.mode,
        )
        break
      default: {
        const _exhaustive: never = dto.entity_type
        throw new Error(`Unknown entity type: ${dto.entity_type}`)
      }
    }

    return { success: true, preview }
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Body(new ZodValidationPipe(TransferExecuteSchema)) dto: TransferExecuteInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ success: boolean; results: TransferExecuteResult[] }> {
    const results: TransferExecuteResult[] = []
    this.assertSpaceViewTransferEnabled(dto.entity_type)

    for (const entityId of dto.entity_ids) {
      let result: TransferExecuteResult

      switch (dto.entity_type) {
        case 'campaign':
          result = await this.transferService.executeCampaignTransfer(
            entityId,
            user.id,
            dto.target_context,
            dto.mode,
            dto.options,
          )
          break
        case 'artifact':
          if (!dto.artifact_table) {
            throw new Error('artifact_table is required for artifact transfers')
          }
          result = await this.transferService.executeArtifactTransfer(
            dto.artifact_table,
            entityId,
            user.id,
            dto.target_context,
            dto.mode,
            dto.options?.target_campaign_id,
          )
          break
        case 'media':
          result = await this.transferService.executeMediaTransfer(
            entityId,
            user.id,
            dto.target_context,
            dto.mode,
            dto.options?.target_campaign_id,
          )
          break
        case 'project':
          result = await this.transferService.executeProjectTransfer(
            entityId,
            user.id,
            dto.target_context,
            dto.mode,
          )
          break
        case 'space':
          result = await this.transferService.executeSpaceTransfer(
            entityId,
            user.id,
            dto.target_context,
            dto.mode,
          )
          break
        case 'view':
          result = await this.transferService.executeViewTransfer(
            entityId,
            user.id,
            dto.target_context,
            dto.mode,
            dto.options,
          )
          break
        default: {
          const _exhaustive: never = dto.entity_type
          throw new Error(`Unknown entity type: ${dto.entity_type}`)
        }
      }

      results.push(result)
    }

    return { success: true, results }
  }
}
