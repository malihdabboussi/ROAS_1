import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  CreateSegmentDtoSchema,
  UpdateSegmentDtoSchema,
  type CreateSegmentInput,
  type UpdateSegmentInput,
} from '../dto'
import { SegmentsService } from '../services/segments.service'

@Controller('segments')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class SegmentsController {
  private readonly logger = new Logger(SegmentsController.name)

  constructor(private readonly segmentsService: SegmentsService) {}

  @Get('filter-options')
  async getFilterOptions(@Supabase() supabase: SupabaseClient) {
    return this.segmentsService.getFilterOptions(supabase)
  }

  @Get()
  async getSegments(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.segmentsService.getSegments(supabase, scope.orgId)
  }

  @Get(':id')
  async getSegment(
    @Param('id') id: string,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.segmentsService.getSegment(supabase, id, scope.orgId)
  }

  @Post()
  async createSegment(
    @Body(new ZodValidationPipe(CreateSegmentDtoSchema)) dto: CreateSegmentInput,
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.segmentsService.createSegment(supabase, user.id, dto, scope.orgId)
  }

  @Put(':id')
  async updateSegment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSegmentDtoSchema)) dto: UpdateSegmentInput,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      return await this.segmentsService.updateSegment(supabase, id, dto, scope.orgId)
    } catch (error) {
      if ((error as Error).message === 'Segment not found') {
        throw new HttpException('Segment not found', HttpStatus.NOT_FOUND)
      }
      this.logger.error(`Failed to update segment: ${error}`)
      throw new HttpException('Failed to update segment', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('preview')
  async previewSegment(
    @Body() body: { filters: Record<string, unknown> },
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const count = await this.segmentsService.previewSegment(supabase, body.filters)
      return { success: true, count }
    } catch (error) {
      this.logger.error(`Failed to preview segment: ${error}`)
      return { success: false, count: 0 }
    }
  }

  @Delete(':id')
  async deleteSegment(
    @Param('id') id: string,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.segmentsService.deleteSegment(supabase, id, scope.orgId)
  }
}
