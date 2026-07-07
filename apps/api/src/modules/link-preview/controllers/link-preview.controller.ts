import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  Supabase,
  ZodValidationPipe,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { ResolveLinkPreviewsSchema, type ResolveLinkPreviewsDto } from '../dto'
import { LinkPreviewService } from '../services/link-preview.service'

@Controller('link-preview')
export class LinkPreviewController {
  constructor(private readonly service: LinkPreviewService) {}

  @Post('resolve')
  @UseGuards(AuthGuard, OrgContextGuard)
  @UsePipes(new ZodValidationPipe(ResolveLinkPreviewsSchema))
  async resolve(
    @Body() dto: ResolveLinkPreviewsDto,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    const previews = await this.service.resolveMany(dto.urls, {
      supabase,
      userId: user.id,
      orgId: scope.orgId,
    })
    return { previews }
  }
}
