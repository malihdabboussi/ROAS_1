import { Injectable } from '@nestjs/common'
import { ArtifactBlogRepository } from '../repositories/artifact-blog.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactBlogService {
  constructor(
    private readonly repository: ArtifactBlogRepository = new ArtifactBlogRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      create_blog_post: (data, sessionKey) => this.createBlogPost(target, data, sessionKey),
      update_blog_post: (data, sessionKey) => this.updateBlogPost(target, data, sessionKey),
      list_blog_posts: (data, sessionKey) => this.listBlogPosts(target, data, sessionKey),
      get_blog_post: (data, sessionKey) => this.getBlogPost(target, data, sessionKey),
      delete_blog_post: (data, sessionKey) => this.deleteBlogPost(target, data, sessionKey),
    }
  }

  private async createBlogPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    const funnelId = String(input.funnel_id ?? '').trim()
    const title = String(input.title ?? '').trim()
    const slug = String(input.slug ?? '').trim()
    if (!funnelId) return { success: false, error: 'funnel_id is required' }
    if (!title) return { success: false, error: 'title is required' }
    if (!slug) return { success: false, error: 'slug is required' }
    const spaceId = getActiveSpaceId(input)

    const payload = {
      user_id: userId,
      org_id: orgId ?? null,
      funnel_id: funnelId,
      campaign_id: campaignId ?? null,
      ...(spaceId ? { space_id: spaceId } : {}),
      title,
      slug,
      content: input.content ?? [],
      excerpt: typeof input.excerpt === 'string' ? input.excerpt : null,
      cover_image: typeof input.cover_image === 'string' ? input.cover_image : null,
      author: typeof input.author === 'string' ? input.author : null,
      tags: Array.isArray(input.tags) ? input.tags : [],
      seo: input.seo && typeof input.seo === 'object' && !Array.isArray(input.seo) ? input.seo : {},
      status:
        input.status === 'published' || input.status === 'archived' || input.status === 'draft'
          ? input.status
          : 'draft',
      published_at: typeof input.published_at === 'string' ? input.published_at : null,
      metadata:
        input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
          ? input.metadata
          : {},
    }

    const { data, error } = await this.repository.createBlogPost(supabase, payload)
    if (error) throw error
    if (!data?.id) throw new Error('Blog post was not created')
    const blogPost = data as {
      id: string
      title?: string | null
      cover_image?: string | null
      status?: string | null
    }
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: 'websites',
      logger: target.logger,
    })
    await this.tryPersistMissionDeliverable(target, sessionKey, {
      type: 'blog_post',
      entityId: blogPost.id,
      entityTable: 'blog_posts',
      title: blogPost.title ?? 'Untitled Blog Post',
      sourceAction: 'create_blog_post',
    })
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-blog-post-${blogPost.id}`,
          artifactType: 'blog-post',
          artifactId: blogPost.id,
          name: blogPost.title ?? 'Untitled Blog Post',
          imageUrl: blogPost.cover_image ?? undefined,
          status: blogPost.status ?? 'draft',
          spaceId: spaceId ?? undefined,
        },
      ],
      ...data,
    }
  }

  private async updateBlogPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const blogPostId = String(input.blog_post_id ?? '').trim()
    if (!blogPostId) return { success: false, error: 'blog_post_id is required' }

    const allowedKeys = [
      'title',
      'slug',
      'content',
      'excerpt',
      'cover_image',
      'author',
      'tags',
      'seo',
      'status',
      'published_at',
      'metadata',
    ] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedKeys) {
      if (input[key] !== undefined) updates[key] = input[key]
    }
    if (Object.keys(updates).length === 1) return { success: false, error: 'No updates provided' }

    const { data, error } = await this.repository.updateBlogPost(supabase, {
      blogPostId,
      userId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Blog post not found' }
    return data
  }

  private async listBlogPosts(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const funnelId = String(input.funnel_id ?? '').trim()
    if (!funnelId) return { success: false, error: 'funnel_id is required' }

    const status = String(input.status ?? '').trim()
    const limit = Number.parseInt(String(input.limit ?? ''), 10)
    const { data, error } = await this.repository.listBlogPosts(supabase, {
      userId,
      orgId: orgId ?? null,
      funnelId,
      status,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 250) : null,
    })
    if (error) throw error
    return data ?? []
  }

  private async getBlogPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const blogPostId = String(input.blog_post_id ?? '').trim()
    if (!blogPostId) return { success: false, error: 'blog_post_id is required' }

    const { data, error } = await this.repository.findBlogPostForUser(supabase, {
      blogPostId,
      userId,
      select: '*',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Blog post not found' }
    return data
  }

  private buildDeleteConfirmBlock(input: {
    action: string
    entityType: string
    entityId: string
    entityName: string
  }) {
    return {
      type: 'delete_confirm',
      id: `delete-${input.entityType}-${input.entityId}-${Date.now()}`,
      delete_action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      status: 'pending',
    }
  }

  private async deleteBlogPost(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const blogPostId = String(input.blog_post_id ?? '').trim()
    if (!blogPostId) return { success: false, error: 'blog_post_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findBlogPostForUser(supabase, {
      blogPostId,
      userId,
      select: 'id, title',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Blog post not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        this.buildDeleteConfirmBlock({
          action: 'delete_blog_post',
          entityType: 'blog_post',
          entityId: String(data.id),
          entityName: String(data.title ?? 'Untitled Blog Post'),
        }),
      ],
    }
  }

  private async tryPersistMissionDeliverable(
    target: Record<string, any>,
    sessionKey: string | undefined,
    entity: {
      type: string
      entityId: string
      entityTable: string
      title: string
      sourceAction: string
    },
  ): Promise<void> {
    try {
      if (!sessionKey || !target.isMissionSessionKey(sessionKey)) return
      const userId = target.resolveUserId(sessionKey)
      const { missionId, campaignId, orgId } = await target.resolveMissionContext(
        sessionKey,
        userId,
      )
      const agentKey = target.parseAgentIdFromSessionKey(sessionKey) ?? 'unknown'
      await target.persistMissionDeliverable({
        missionId,
        userId,
        campaignId,
        orgId,
        agentKey,
        type: entity.type,
        title: entity.title,
        sourceAction: entity.sourceAction,
        content: null,
        metadata: { entity_id: entity.entityId, entity_table: entity.entityTable },
        idempotencyKey: `mission:${missionId}:${entity.entityTable}:${entity.entityId}`,
      })
    } catch (err) {
      console.error(
        `[mission_deliverable_failed] action=${entity.sourceAction} entity=${entity.entityTable}:${entity.entityId}`,
        err,
      )
    }
  }
}
