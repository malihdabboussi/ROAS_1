import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import type {
  AssignMemorySourceDto,
  BrainNodeTransferBySourceDto,
  BrainNodeTransferDto,
} from '../../brain/types/brain.types'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { InternalBrainService } from '../services/internal-brain.service'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalBrainNodesController {
  constructor(private readonly internalBrainService: InternalBrainService) {}

  /**
   * POST /api/internal/brain/nodes/transfer
   */
  @Post('brain/nodes/transfer')
  @HttpCode(HttpStatus.OK)
  async brainTransferNode(
    @Body()
    body: { user_id: string } & BrainNodeTransferDto,
  ) {
    if (!body.user_id?.trim()) {
      throw new BadRequestException('user_id is required')
    }
    const { user_id, ...dto } = body
    return this.internalBrainService.transferNode(user_id.trim(), dto as BrainNodeTransferDto)
  }

  /**
   * POST /api/internal/brain/nodes/delete
   */
  @Post('brain/nodes/delete')
  @HttpCode(HttpStatus.OK)
  async brainDeleteNode(
    @Body()
    body: {
      user_id: string
      node_type: 'memory' | 'snapshot' | 'sk_entry' | 'sk_source' | 'connection'
      node_id: string
    },
  ) {
    if (!body.user_id?.trim()) {
      throw new BadRequestException('user_id is required')
    }
    if (!body.node_type || !body.node_id?.trim()) {
      throw new BadRequestException('node_type and node_id are required')
    }
    return this.internalBrainService.deleteBrainNode(
      body.user_id.trim(),
      body.node_type,
      body.node_id.trim(),
    )
  }

  /**
   * POST /api/internal/brain/nodes/transfer-by-source
   */
  @Post('brain/nodes/transfer-by-source')
  @HttpCode(HttpStatus.OK)
  async brainTransferBySource(
    @Body()
    body: { user_id: string } & BrainNodeTransferBySourceDto,
  ) {
    if (!body.user_id?.trim()) {
      throw new BadRequestException('user_id is required')
    }
    const { user_id, ...dto } = body
    return this.internalBrainService.transferBySource(
      user_id.trim(),
      dto as BrainNodeTransferBySourceDto,
    )
  }

  /**
   * POST /api/internal/brain/nodes/assign-source
   */
  @Post('brain/nodes/assign-source')
  @HttpCode(HttpStatus.OK)
  async brainAssignMemorySource(
    @Body()
    body: { user_id: string } & AssignMemorySourceDto,
  ) {
    if (!body.user_id?.trim()) {
      throw new BadRequestException('user_id is required')
    }
    const { user_id, ...dto } = body
    return this.internalBrainService.assignMemorySource(
      user_id.trim(),
      dto as AssignMemorySourceDto,
    )
  }
}
