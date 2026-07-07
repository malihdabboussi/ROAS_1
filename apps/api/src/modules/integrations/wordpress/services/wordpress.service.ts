import { createHmac, timingSafeEqual } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { RequestScope } from '@vibey/api-shared'
import { VaultService } from '../../../vault/services/vault.service'
import { WordpressIntegration } from '../integrations/wordpress.integration'
import { WordpressRepository } from '../repositories/wordpress.repository'
import type {
  WordpressConnectionMethod,
  WordpressConnectionMetadata,
  WordpressConnectionSecret,
  WordpressMediaPayload,
  WordpressPostPayload,
  WordpressUserIntegration,
} from '../types/wordpress.types'

const STATE_TTL_MS = 10 * 60 * 1000

type WordpressState = {
  userId: string
  orgId?: string
  orgRole?: string
  redirectTo: string
  connectionScope?: 'personal' | 'org_shared'
  method: WordpressConnectionMethod
  siteUrl?: string
  createdAt: number
}

@Injectable()
export class WordpressService {
  private readonly stateSecret: string

  constructor(
    private readonly config: ConfigService,
    private readonly wordpress: WordpressIntegration,
    private readonly repository: WordpressRepository,
    private readonly vault: VaultService,
  ) {
    this.stateSecret =
      this.config.get<string>('WORDPRESS_STATE_SECRET') ||
      this.config.get<string>('OAUTH_STATE_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      ''
  }

  async getStatus(scope: RequestScope): Promise<Record<string, unknown>> {
    const row = await this.repository.getConnection(scope)
    if (!row || row.status !== 'connected') {
      return { connected: false, status: row?.status ?? null }
    }
    const metadata = row.metadata ?? null
    const hasSecret = metadata?.vault_secret_label
      ? await this.vault.hasSecret(row.user_id, 'wordpress', metadata.vault_secret_label)
      : false
    return {
      connected: hasSecret,
      status: hasSecret ? row.status : 'error',
      connection_method: metadata?.connection_method ?? null,
      site_url: metadata?.site_url ?? null,
      site_name: metadata?.site_name ?? null,
      username: metadata?.username ?? null,
      connectedAt: row.connected_at,
      user_integration_id: row.id,
    }
  }

  async startConnect(
    userId: string,
    scope: RequestScope,
    params: {
      connection_method: WordpressConnectionMethod
      redirectTo: string
      siteUrl?: string
      connection_scope?: 'personal' | 'org_shared'
    },
  ): Promise<{ authorizeUrl: string }> {
    const state = this.signState({
      userId,
      ...(scope.orgId ? { orgId: scope.orgId } : {}),
      ...(scope.orgRole ? { orgRole: scope.orgRole } : {}),
      redirectTo: this.normalizeRedirectTo(params.redirectTo),
      connectionScope: params.connection_scope,
      method: params.connection_method,
      siteUrl: params.siteUrl,
      createdAt: Date.now(),
    })

    if (params.connection_method === 'wordpress_com') {
      return { authorizeUrl: this.wordpress.buildWordpressComAuthorizationUrl(state) }
    }

    if (!params.siteUrl) throw new BadRequestException('siteUrl is required')
    const siteUrl = this.wordpress.normalizeSiteUrl(params.siteUrl)
    await this.wordpress.discoverSelfHosted(siteUrl)
    return { authorizeUrl: this.wordpress.buildApplicationPasswordAuthorizationUrl(siteUrl, state) }
  }

  async completeWordpressComCallback(params: {
    code?: string
    state: string
    error?: string
    error_description?: string
  }): Promise<string> {
    const state = this.verifyState(params.state)
    if (state.method !== 'wordpress_com') throw new BadRequestException('Invalid WordPress state')
    if (params.error) {
      return this.withQuery(state.redirectTo, 'wordpress_error', params.error_description || params.error)
    }
    if (!params.code) throw new BadRequestException('code is required')

    const token = await this.wordpress.exchangeWordpressComCode(params.code)
    const accessToken = String(token.access_token ?? '')
    if (!accessToken) throw new BadRequestException('WordPress.com did not return an access token')

    const sites = await this.wordpress.listWordpressComSites(accessToken)
    const site = this.resolvePrimaryWordpressComSite(sites)
    const siteId = String(site.ID ?? site.ID ?? site.id ?? token.blog_id ?? '')
    const siteUrl = String(site.URL ?? site.url ?? token.blog_url ?? '')
    const siteName = String(site.name ?? site.title ?? siteUrl)
    if (!siteId || !siteUrl) throw new BadRequestException('No WordPress.com site found')

    await this.storeConnectedCredential({
      ownerUserId: state.userId,
      scope: this.scopeFromState(state),
      connectionScope: state.connectionScope,
      metadata: {
        connection_method: 'wordpress_com',
        site_url: siteUrl,
        site_id: siteId,
        site_name: siteName,
        vault_secret_label: this.vaultLabel(siteId),
      },
      secret: {
        method: 'wordpress_com',
        accessToken,
        tokenType: String(token.token_type ?? ''),
        scope: String(token.scope ?? ''),
        blogId: siteId,
        blogUrl: siteUrl,
      },
      connectionLabel: siteName || siteUrl,
    })

    return this.withQuery(state.redirectTo, 'wordpress_connected', '1')
  }

  async completeApplicationPasswordCallback(params: {
    state: string
    site_url: string
    user_login: string
    password: string
  }): Promise<string> {
    const state = this.verifyState(params.state)
    if (state.method !== 'self_hosted') throw new BadRequestException('Invalid WordPress state')
    const siteUrl = this.wordpress.normalizeSiteUrl(params.site_url || state.siteUrl || '')
    const siteInfo = await this.wordpress.verifySelfHostedCredentials(
      siteUrl,
      params.user_login,
      params.password,
    )
    const discovery = await this.wordpress.discoverSelfHosted(siteUrl)
    const siteName = String(discovery.site.name ?? discovery.site.title ?? siteUrl)

    await this.storeConnectedCredential({
      ownerUserId: state.userId,
      scope: this.scopeFromState(state),
      connectionScope: state.connectionScope,
      metadata: {
        connection_method: 'self_hosted',
        site_url: siteUrl,
        site_name: siteName,
        username: String(siteInfo.username ?? siteInfo.name ?? params.user_login),
        rest_url: discovery.restUrl,
        vault_secret_label: this.vaultLabel(siteUrl),
      },
      secret: {
        method: 'self_hosted',
        username: params.user_login,
        applicationPassword: params.password,
      },
      connectionLabel: siteName || siteUrl,
    })

    return this.withQuery(state.redirectTo, 'wordpress_connected', '1')
  }

  async disconnect(scope: RequestScope): Promise<void> {
    const row = await this.requireConnection(scope)
    const metadata = row.metadata ?? null
    if (metadata?.vault_secret_label) {
      await this.vault.deleteSecret(row.user_id, 'wordpress', metadata.vault_secret_label)
    }
    await this.repository.disconnect(row.id, {
      ...(metadata ?? {}),
      disconnected_at: new Date().toISOString(),
    })
  }

  async listPosts(scope: RequestScope, query: Record<string, unknown>): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.listPosts(connection.siteUrl, connection.secret, query, connection.siteId)
  }

  async createPost(scope: RequestScope, payload: WordpressPostPayload): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.createPost(connection.siteUrl, connection.secret, payload, connection.siteId)
  }

  async updatePost(scope: RequestScope, postId: string, payload: WordpressPostPayload): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.updatePost(connection.siteUrl, connection.secret, postId, payload, connection.siteId)
  }

  async listPages(scope: RequestScope, query: Record<string, unknown>): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.listPages(connection.siteUrl, connection.secret, query, connection.siteId)
  }

  async createPage(scope: RequestScope, payload: WordpressPostPayload): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.createPage(connection.siteUrl, connection.secret, payload, connection.siteId)
  }

  async updatePage(scope: RequestScope, pageId: string, payload: WordpressPostPayload): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.updatePage(connection.siteUrl, connection.secret, pageId, payload, connection.siteId)
  }

  async uploadMedia(scope: RequestScope, payload: WordpressMediaPayload): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.uploadMedia(connection.siteUrl, connection.secret, payload, connection.siteId)
  }

  async listCategories(scope: RequestScope, query: Record<string, unknown>): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.listCategories(connection.siteUrl, connection.secret, query, connection.siteId)
  }

  async createCategory(scope: RequestScope, payload: Record<string, unknown>): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.createCategory(connection.siteUrl, connection.secret, payload, connection.siteId)
  }

  async listTags(scope: RequestScope, query: Record<string, unknown>): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.listTags(connection.siteUrl, connection.secret, query, connection.siteId)
  }

  async createTag(scope: RequestScope, payload: Record<string, unknown>): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.createTag(connection.siteUrl, connection.secret, payload, connection.siteId)
  }

  async getSiteInfo(scope: RequestScope): Promise<unknown> {
    const connection = await this.getCredential(scope)
    return this.wordpress.getSiteInfo(connection.siteUrl, connection.secret, connection.siteId)
  }

  async publishBlogPost(
    scope: RequestScope,
    params: { blog_post_id: string; status?: WordpressPostPayload['status']; update_existing?: boolean },
  ): Promise<Record<string, unknown>> {
    const connection = await this.getCredential(scope)
    const blogPost = await this.repository.getBlogPostForUser(params.blog_post_id, scope.userId)
    const metadata =
      blogPost.metadata && typeof blogPost.metadata === 'object' && !Array.isArray(blogPost.metadata)
        ? (blogPost.metadata as Record<string, unknown>)
        : {}
    const existingId = params.update_existing !== false ? String(metadata.wordpress_post_id ?? '') : ''
    const payload: WordpressPostPayload = {
      title: String(blogPost.title ?? ''),
      content: this.renderBlogContent(blogPost.content),
      excerpt: typeof blogPost.excerpt === 'string' ? blogPost.excerpt : undefined,
      slug: typeof blogPost.slug === 'string' ? blogPost.slug : undefined,
      status: params.status ?? (blogPost.status === 'published' ? 'publish' : 'draft'),
    }
    const result = existingId
      ? await this.wordpress.updatePost(connection.siteUrl, connection.secret, existingId, payload, connection.siteId)
      : await this.wordpress.createPost(connection.siteUrl, connection.secret, payload, connection.siteId)

    const resultRecord = (result ?? {}) as Record<string, unknown>
    const wordpressPostId = resultRecord.ID ?? resultRecord.id ?? existingId
    const wordpressPostUrl = resultRecord.URL ?? resultRecord.link ?? resultRecord.guid
    const updatedMetadata = {
      ...metadata,
      wordpress_post_id: wordpressPostId,
      wordpress_post_url: wordpressPostUrl,
      wordpress_synced_at: new Date().toISOString(),
    }
    await this.repository.updateBlogPostMetadata(params.blog_post_id, updatedMetadata)
    return { post: result, blog_post_metadata: updatedMetadata }
  }

  private async getCredential(scope: RequestScope): Promise<{
    row: WordpressUserIntegration
    siteUrl: string
    siteId?: string
    secret: WordpressConnectionSecret
  }> {
    const row = await this.requireConnection(scope)
    const metadata = row.metadata
    if (!metadata?.vault_secret_label || !metadata.site_url) {
      throw new BadRequestException('WordPress connection metadata is incomplete')
    }
    const rawSecret = await this.vault.getSecret(row.user_id, 'wordpress', metadata.vault_secret_label)
    if (!rawSecret) throw new BadRequestException('WordPress credentials are missing')
    const secret = JSON.parse(rawSecret) as WordpressConnectionSecret
    return { row, siteUrl: metadata.site_url, siteId: metadata.site_id, secret }
  }

  private async requireConnection(scope: RequestScope): Promise<WordpressUserIntegration> {
    const row = await this.repository.getConnection(scope)
    if (!row || row.status !== 'connected') throw new BadRequestException('WordPress is not connected')
    return row
  }

  private async storeConnectedCredential(params: {
    ownerUserId: string
    scope: RequestScope
    connectionScope?: 'personal' | 'org_shared'
    metadata: WordpressConnectionMetadata
    secret: WordpressConnectionSecret
    connectionLabel: string | null
  }): Promise<void> {
    await this.vault.storeSecret(
      params.ownerUserId,
      'wordpress',
      params.metadata.vault_secret_label,
      JSON.stringify(params.secret),
      params.secret.method === 'wordpress_com' ? 'oauth_token' : 'application_password',
      {
        site_url: params.metadata.site_url,
        connection_method: params.metadata.connection_method,
      },
    )
    await this.repository.upsertConnection({
      scope: params.scope,
      ownerUserId: params.ownerUserId,
      status: 'connected',
      metadata: params.metadata,
      connectionLabel: params.connectionLabel,
      connectionScope: params.connectionScope,
    })
  }

  private signState(state: WordpressState): string {
    if (!this.stateSecret) throw new BadRequestException('Missing WordPress state secret')
    const payload = Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')
    const signature = createHmac('sha256', this.stateSecret).update(payload).digest('base64url')
    return `${payload}.${signature}`
  }

  private verifyState(rawState: string): WordpressState {
    if (!this.stateSecret) throw new BadRequestException('Missing WordPress state secret')
    const [payload, signature] = rawState.split('.')
    if (!payload || !signature) throw new BadRequestException('Invalid WordPress state')
    const expected = createHmac('sha256', this.stateSecret).update(payload).digest('base64url')
    const signatureBuffer = Buffer.from(signature, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    if (signatureBuffer.length !== expectedBuffer.length) {
      throw new BadRequestException('Invalid WordPress state signature')
    }
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new BadRequestException('Invalid WordPress state signature')
    }
    const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as WordpressState
    if (Date.now() - state.createdAt > STATE_TTL_MS) {
      throw new BadRequestException('WordPress state expired')
    }
    return state
  }

  private resolvePrimaryWordpressComSite(sites: Record<string, unknown>): Record<string, unknown> {
    const list = Array.isArray(sites.sites) ? (sites.sites as Array<Record<string, unknown>>) : []
    const visible = list.find((site) => !site.is_private) ?? list[0]
    if (!visible) throw new BadRequestException('No WordPress.com site found')
    return visible
  }

  private renderBlogContent(content: unknown): string {
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .map((block) => this.renderBlogContent(block))
        .filter(Boolean)
        .join('\n\n')
    }
    if (content && typeof content === 'object') {
      const record = content as Record<string, unknown>
      if (typeof record.html === 'string') return record.html
      if (typeof record.content === 'string') return record.content
      if (typeof record.text === 'string') return `<p>${this.escapeHtml(record.text)}</p>`
      if (Array.isArray(record.blocks)) return this.renderBlogContent(record.blocks)
    }
    return ''
  }

  private normalizeRedirectTo(redirectTo: string): string {
    try {
      const url = new URL(redirectTo)
      return url.toString()
    } catch {
      return '/settings?tab=integrations'
    }
  }

  private withQuery(url: string, key: string, value: string): string {
    const parsed = new URL(url, this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000')
    parsed.searchParams.set(key, value)
    return parsed.toString()
  }

  private scopeFromState(state: WordpressState): RequestScope {
    return {
      userId: state.userId,
      orgId: state.orgId,
      orgRole: state.orgRole,
    } as RequestScope
  }

  private vaultLabel(seed: string): string {
    return `connection:${Buffer.from(seed, 'utf8').toString('base64url')}`
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}
