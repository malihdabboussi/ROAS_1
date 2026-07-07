import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { WordpressListQuerySchema, WordpressTaxonomyCreateSchema } from '../dto/wordpress.dto'
import { WordpressService } from '../services/wordpress.service'
import { validateWordpressRequest } from './wordpress-controller-validation'

@Controller('integrations/wordpress')
export class WordpressTaxonomiesController {
  constructor(private readonly wordpress: WordpressService) {}

  @Get('categories')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listCategories(
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const categories = await this.wordpress.listCategories(
      scope,
      validateWordpressRequest(WordpressListQuerySchema, query),
    )
    return { success: true, categories }
  }

  @Post('categories')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createCategory(@OrgContext() scope: RequestScope, @Body() body: unknown) {
    const category = await this.wordpress.createCategory(
      scope,
      validateWordpressRequest(WordpressTaxonomyCreateSchema, body),
    )
    return { success: true, category }
  }

  @Get('tags')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listTags(
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const tags = await this.wordpress.listTags(
      scope,
      validateWordpressRequest(WordpressListQuerySchema, query),
    )
    return { success: true, tags }
  }

  @Post('tags')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createTag(@OrgContext() scope: RequestScope, @Body() body: unknown) {
    const tag = await this.wordpress.createTag(
      scope,
      validateWordpressRequest(WordpressTaxonomyCreateSchema, body),
    )
    return { success: true, tag }
  }

  @Get('site')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getSiteInfo(@OrgContext() scope: RequestScope) {
    const site = await this.wordpress.getSiteInfo(scope)
    return { success: true, site }
  }
}
