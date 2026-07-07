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
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
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
import { FunnelsService } from '../services/funnels.service'

const FunnelFileBodySchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  role: z.string().optional(),
  funnel_page_id: z.string().uuid().optional().nullable(),
})

@Controller('funnels')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class FunnelPagesController {
  constructor(private readonly funnelsService: FunnelsService) {}

  @Post(':id/pages')
  @HttpCode(HttpStatus.CREATED)
  async createPage(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Body()
    body: {
      name: string
      page_type?: string
      generated_html: string
      generated_css: string
      order_index: number
      slug?: string
      path?: string
    },
  ) {
    if (
      !body.name ||
      body.generated_html === undefined ||
      body.generated_css === undefined ||
      body.order_index === undefined
    ) {
      throw new BadRequestException(
        'name, generated_html, generated_css, and order_index are required',
      )
    }
    return this.funnelsService.createPage(supabase, user.id, funnelId, body, scope.orgId)
  }

  @Patch(':id/pages/reorder')
  async reorderPages(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Body() body: { pageIds: string[] },
  ) {
    if (!body?.pageIds || !Array.isArray(body.pageIds)) {
      throw new BadRequestException('pageIds array is required')
    }
    return this.funnelsService.reorderPages(supabase, funnelId, body.pageIds, scope.orgId)
  }

  @Get(':id/pages/:pageId')
  async getPage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.funnelsService.getPage(supabase, funnelId, pageId, scope.orgId)
  }

  @Get(':id/pages/:pageId/bundle')
  async getPageBundle(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.funnelsService.getPageBundle(supabase, funnelId, pageId, scope.orgId)
  }

  @Put(':id/files')
  async upsertFunnelFile(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Body(new ZodValidationPipe(FunnelFileBodySchema))
    body: z.infer<typeof FunnelFileBodySchema>,
  ) {
    return this.funnelsService.upsertFunnelFile(supabase, user.id, funnelId, body, scope.orgId)
  }

  @Patch(':id/pages/:pageId/move')
  async movePage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') targetFunnelId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.funnelsService.movePageToFunnel(supabase, targetFunnelId, pageId, scope.orgId)
  }

  @Delete(':id/pages/:pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Param('pageId') pageId: string,
  ) {
    await this.funnelsService.deletePage(supabase, funnelId, pageId, scope.orgId)
  }

  @Patch(':id/pages/:pageId')
  async updatePage(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Param('pageId') pageId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.funnelsService.updatePage(supabase, user.id, funnelId, pageId, body, scope.orgId)
  }
}
