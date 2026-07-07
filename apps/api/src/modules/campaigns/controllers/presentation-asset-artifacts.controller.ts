import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
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
import { ArtifactsService } from '../services/artifacts.service'
import {
  PresentationAssetBodySchema,
  PresentationCommentBodySchema,
  PresentationCommentPatchSchema,
  PresentationFileBodySchema,
  type PresentationAssetBody,
  type PresentationCommentBody,
  type PresentationCommentPatch,
  type PresentationFileBody,
} from './presentation-artifact.schemas'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class PresentationAssetArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('presentations/:id')
  async getPresentation(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getPresentation(supabase, id)
  }

  @Get('presentations/:id/files')
  async listOrGetPresentationFiles(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
    @Query('path') path?: string,
  ) {
    if (path) {
      return this.artifactsService.getPresentationFile(supabase, id, path)
    }
    return this.artifactsService.listPresentationFiles(supabase, id)
  }

  @Put('presentations/:id/files')
  async upsertPresentationFile(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PresentationFileBodySchema)) body: PresentationFileBody,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.upsertPresentationFile(
      supabase,
      user.id,
      id,
      body.path,
      body.content,
      body.role,
    )
  }

  @Delete('presentations/:id/files')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePresentationFile(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Query('path') path: string,
    @OrgContext() _scope: RequestScope,
  ) {
    if (!path) throw new BadRequestException('path is required')
    await this.artifactsService.deletePresentationFile(supabase, id, path)
  }

  @Get('presentations/:id/assets')
  async listPresentationAssets(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listPresentationAssets(supabase, id)
  }

  @Post('presentations/:id/assets')
  @HttpCode(HttpStatus.CREATED)
  async attachPresentationAsset(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PresentationAssetBodySchema)) body: PresentationAssetBody,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.attachPresentationAsset(
      supabase,
      user.id,
      id,
      body.path,
      body.media_asset_id,
      body.role,
    )
  }

  @Delete('presentations/:id/assets')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachPresentationAsset(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Query('path') path: string,
    @OrgContext() _scope: RequestScope,
  ) {
    if (!path) throw new BadRequestException('path is required')
    await this.artifactsService.detachPresentationAsset(supabase, id, path)
  }

  @Get('presentations/:id/bundle')
  async getPresentationBundle(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getPresentationBundle(supabase, id)
  }

  @Get('presentations/:id/comments')
  async listPresentationComments(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.listPresentationComments(supabase, user.id, id)
  }

  @Put('presentations/:id/comments/:commentId')
  async upsertPresentationComment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(PresentationCommentBodySchema)) body: PresentationCommentBody,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.upsertPresentationComment(supabase, user.id, id, commentId, {
      body: body.body,
      slide_index: body.slide_index ?? null,
      element_trace: body.element_trace ?? null,
    })
  }

  @Patch('presentations/:id/comments/:commentId')
  async updatePresentationComment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(PresentationCommentPatchSchema)) body: PresentationCommentPatch,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updatePresentationComment(supabase, user.id, id, commentId, body)
  }

  @Delete('presentations/:id/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePresentationComment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deletePresentationComment(supabase, user.id, id, commentId)
  }
}
