import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { BrainNodeTransferService } from '../services/brain-node-transfer.service'
import { MemoriesService } from '../services/memories.service'
import type {
  BrainNodeTransferDto,
  CreateConnectionDto,
  UpdateMemoryDto,
} from '../types/brain.types'

@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class MemoriesCrudController {
  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly transferService: BrainNodeTransferService,
  ) {}

  @Get('memories/:id')
  async getDetail(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.memoriesService.getMemoryDetail(supabase, id)
  }

  @Patch('memories/:id')
  async update(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: UpdateMemoryDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.memoriesService.updateMemory(supabase, id, body)
  }

  @Delete('memories/:id')
  async delete(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.memoriesService.deleteMemory(supabase, id)
    return { success: true }
  }

  @Post('memories/:id/connect')
  @HttpCode(HttpStatus.CREATED)
  async connect(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @Param('id') memoryId: string,
    @Body() body: CreateConnectionDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.memoriesService.createConnection(supabase, user.id, memoryId, body)
  }

  @Delete('connections/:id')
  async deleteConnection(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.memoriesService.deleteConnection(supabase, id)
    return { success: true }
  }

  @Post('nodes/transfer')
  @HttpCode(HttpStatus.OK)
  async transferNode(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: BrainNodeTransferDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.transferService.transfer(supabase, user.id, body)
  }
}
