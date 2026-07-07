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
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class BlogPostArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('funnels/:funnelId/blog-posts')
  async listBlogPosts(
    @Supabase() supabase: SupabaseClient,
    @Param('funnelId') funnelId: string,
    @OrgContext() _scope: RequestScope,
    @Query('status') status?: 'draft' | 'published' | 'archived',
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined
    return this.artifactsService.listBlogPosts(supabase, funnelId, { status, limit, offset })
  }

  @Get('funnels/:funnelId/blog-posts/:id')
  async getBlogPost(
    @Supabase() supabase: SupabaseClient,
    @Param('funnelId') funnelId: string,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    const blogPost = await this.artifactsService.getBlogPost(supabase, id)
    if (blogPost.funnel_id !== funnelId)
      throw new BadRequestException('Blog post does not belong to funnel')
    return blogPost
  }

  @Get('blog-posts/:id')
  async getBlogPostById(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getBlogPost(supabase, id)
  }

  @Post('funnels/:funnelId/blog-posts')
  @HttpCode(HttpStatus.CREATED)
  async createBlogPost(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('funnelId') funnelId: string,
    @Body()
    body: {
      campaign_id?: string | null
      title: string
      slug: string
      content?: unknown
      excerpt?: string | null
      cover_image?: string | null
      author?: string | null
      tags?: string[]
      seo?: Record<string, unknown>
      status?: 'draft' | 'published' | 'archived'
      published_at?: string | null
      metadata?: Record<string, unknown>
    },
    @OrgContext() scope: RequestScope,
  ) {
    if (!body?.title?.trim()) throw new BadRequestException('title is required')
    if (!body?.slug?.trim()) throw new BadRequestException('slug is required')
    return this.artifactsService.createBlogPost(
      supabase,
      user.id,
      funnelId,
      {
        ...body,
        title: body.title.trim(),
        slug: body.slug.trim(),
      },
      scope.orgId,
    )
  }

  @Patch('blog-posts/:id')
  async updateBlogPost(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string
      slug?: string
      content?: unknown
      excerpt?: string | null
      cover_image?: string | null
      author?: string | null
      tags?: string[]
      seo?: Record<string, unknown>
      status?: 'draft' | 'published' | 'archived'
      published_at?: string | null
      metadata?: Record<string, unknown>
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateBlogPost(supabase, id, body)
  }

  @Delete('blog-posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlogPost(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deleteBlogPost(supabase, id)
  }
}
