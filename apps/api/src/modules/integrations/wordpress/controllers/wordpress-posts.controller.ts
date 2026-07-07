import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import {
  WordpressListQuerySchema,
  WordpressPostSchema,
  WordpressPublishBlogPostSchema,
} from '../dto/wordpress.dto'
import { WordpressService } from '../services/wordpress.service'
import { validateWordpressRequest } from './wordpress-controller-validation'

@Controller('integrations/wordpress')
export class WordpressPostsController {
  constructor(private readonly wordpress: WordpressService) {}

  @Get('posts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listPosts(
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const params = validateWordpressRequest(WordpressListQuerySchema, query)
    const posts = await this.wordpress.listPosts(scope, params)
    return { success: true, posts }
  }

  @Post('posts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createPost(@OrgContext() scope: RequestScope, @Body() body: unknown) {
    const post = await this.wordpress.createPost(
      scope,
      validateWordpressRequest(WordpressPostSchema, body),
    )
    return { success: true, post }
  }

  @Patch('posts/:postId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updatePost(
    @OrgContext() scope: RequestScope,
    @Param('postId') postId: string,
    @Body() body: unknown,
  ) {
    const post = await this.wordpress.updatePost(
      scope,
      postId,
      validateWordpressRequest(WordpressPostSchema, body),
    )
    return { success: true, post }
  }

  @Post('posts/publish-blog-post')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async publishBlogPost(@OrgContext() scope: RequestScope, @Body() body: unknown) {
    const result = await this.wordpress.publishBlogPost(
      scope,
      validateWordpressRequest(WordpressPublishBlogPostSchema, body),
    )
    return { success: true, ...result }
  }
}
