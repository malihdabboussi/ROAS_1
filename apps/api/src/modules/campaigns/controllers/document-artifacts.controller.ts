import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class DocumentArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('documents/:id')
  async getDocument(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getDocument(supabase, user.id, id)
  }

  @Patch('documents/:id')
  async updateDocument(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string
      content?: Record<string, unknown>
      metadata?: Record<string, unknown>
    },
    @OrgContext() _scope: RequestScope,
  ) {
    const hasTitle = typeof body?.title === 'string'
    const hasContent = body?.content !== undefined && body.content !== null
    const hasMetadata = body?.metadata !== undefined && body.metadata !== null
    if (!hasTitle && !hasContent && !hasMetadata) {
      throw new BadRequestException('At least one of title, content, or metadata is required')
    }
    return this.artifactsService.updateDocument(supabase, user.id, id, {
      title: hasTitle && body.title !== undefined ? body.title.trim() : undefined,
      content: hasContent ? (body!.content as Record<string, unknown>) : undefined,
      metadata: hasMetadata ? (body!.metadata as Record<string, unknown>) : undefined,
    })
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deleteDocument(supabase, id)
  }
}
