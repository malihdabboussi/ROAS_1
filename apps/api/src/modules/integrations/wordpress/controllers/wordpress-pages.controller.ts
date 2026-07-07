import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { WordpressListQuerySchema, WordpressPostSchema } from '../dto/wordpress.dto'
import { WordpressService } from '../services/wordpress.service'
import { validateWordpressRequest } from './wordpress-controller-validation'

@Controller('integrations/wordpress')
export class WordpressPagesController {
  constructor(private readonly wordpress: WordpressService) {}

  @Get('pages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listPages(
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const pages = await this.wordpress.listPages(
      scope,
      validateWordpressRequest(WordpressListQuerySchema, query),
    )
    return { success: true, pages }
  }

  @Post('pages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createPage(@OrgContext() scope: RequestScope, @Body() body: unknown) {
    const page = await this.wordpress.createPage(
      scope,
      validateWordpressRequest(WordpressPostSchema, body),
    )
    return { success: true, page }
  }

  @Patch('pages/:pageId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updatePage(
    @OrgContext() scope: RequestScope,
    @Param('pageId') pageId: string,
    @Body() body: unknown,
  ) {
    const page = await this.wordpress.updatePage(
      scope,
      pageId,
      validateWordpressRequest(WordpressPostSchema, body),
    )
    return { success: true, page }
  }
}
