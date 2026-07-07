import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  WordpressConnectionSecret,
  WordpressMediaPayload,
  WordpressPostPayload,
  WordpressSiteInfo,
} from '../types/wordpress.types'

const WORDPRESS_COM_API_BASE = 'https://public-api.wordpress.com'
const WORDPRESS_COM_AUTH_BASE = 'https://public-api.wordpress.com/oauth2'

function parseJson(raw: string): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

@Injectable()
export class WordpressIntegration {
  private readonly wpComClientId: string
  private readonly wpComClientSecret: string
  private readonly wpComRedirectUri: string
  private readonly wpComScope: string
  private readonly appPasswordCallbackUrl: string

  constructor(private readonly config: ConfigService) {
    this.wpComClientId = this.config.get<string>('WORDPRESS_COM_CLIENT_ID') || ''
    this.wpComClientSecret = this.config.get<string>('WORDPRESS_COM_CLIENT_SECRET') || ''
    this.wpComRedirectUri = this.config.get<string>('WORDPRESS_COM_REDIRECT_URI') || ''
    this.wpComScope = this.config.get<string>('WORDPRESS_COM_SCOPE') || 'global'
    this.appPasswordCallbackUrl =
      this.config.get<string>('WORDPRESS_APP_PASSWORD_CALLBACK_URL') || ''
  }

  isWordpressComConfigured(): boolean {
    return !!(this.wpComClientId && this.wpComClientSecret && this.wpComRedirectUri)
  }

  isApplicationPasswordConfigured(): boolean {
    return !!this.appPasswordCallbackUrl
  }

  buildWordpressComAuthorizationUrl(state: string): string {
    if (!this.isWordpressComConfigured()) {
      throw new BadRequestException('Missing WordPress.com OAuth configuration')
    }
    const params = new URLSearchParams()
    params.set('client_id', this.wpComClientId)
    params.set('redirect_uri', this.wpComRedirectUri)
    params.set('response_type', 'code')
    params.set('state', state)
    if (this.wpComScope) params.set('scope', this.wpComScope)
    return `${WORDPRESS_COM_AUTH_BASE}/authorize?${params.toString()}`
  }

  buildApplicationPasswordAuthorizationUrl(siteUrl: string, state: string): string {
    if (!this.isApplicationPasswordConfigured()) {
      throw new BadRequestException('Missing WordPress application password callback URL')
    }
    const base = new URL('/wp-admin/authorize-application.php', siteUrl)
    base.searchParams.set('app_name', 'Vibey')
    base.searchParams.set('app_id', 'vibey-wordpress-integration')
    base.searchParams.set('success_url', `${this.appPasswordCallbackUrl}?state=${state}`)
    base.searchParams.set('reject_url', `${this.appPasswordCallbackUrl}?state=${state}&error=rejected`)
    return base.toString()
  }

  async exchangeWordpressComCode(code: string): Promise<Record<string, unknown>> {
    if (!this.isWordpressComConfigured()) {
      throw new BadRequestException('Missing WordPress.com OAuth configuration')
    }
    const body = new URLSearchParams()
    body.set('client_id', this.wpComClientId)
    body.set('client_secret', this.wpComClientSecret)
    body.set('redirect_uri', this.wpComRedirectUri)
    body.set('grant_type', 'authorization_code')
    body.set('code', code)

    const response = await fetch(`${WORDPRESS_COM_AUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`WordPress.com token exchange failed (${response.status})`)
    }
    return parseJson(raw) as Record<string, unknown>
  }

  normalizeSiteUrl(input: string): string {
    const raw = input.trim()
    if (!raw) throw new BadRequestException('siteUrl is required')
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const url = new URL(withProtocol)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      throw new BadRequestException('Self-hosted WordPress sites must use HTTPS')
    }
    url.hash = ''
    url.search = ''
    url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString().replace(/\/$/, '')
  }

  async discoverSelfHosted(siteUrl: string): Promise<{ site: WordpressSiteInfo; restUrl: string }> {
    const response = await fetch(`${siteUrl}/wp-json/`, { method: 'GET' })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`WordPress REST discovery failed (${response.status})`)
    }
    const data = parseJson(raw) as Record<string, unknown>
    const authentication = data.authentication as Record<string, unknown> | undefined
    const appPasswords = authentication?.['application-passwords'] as
      | Record<string, unknown>
      | undefined
    if (!appPasswords) {
      throw new BadRequestException('This WordPress site does not advertise Application Passwords')
    }
    return {
      site: data as WordpressSiteInfo,
      restUrl: String(data.url ?? siteUrl).replace(/\/$/, ''),
    }
  }

  async verifySelfHostedCredentials(
    siteUrl: string,
    username: string,
    applicationPassword: string,
  ): Promise<Record<string, unknown>> {
    return this.selfHostedRequestJson(
      siteUrl,
      { method: 'self_hosted', username, applicationPassword },
      'GET',
      '/wp-json/wp/v2/users/me?context=edit',
    ) as Promise<Record<string, unknown>>
  }

  async listWordpressComSites(accessToken: string): Promise<Record<string, unknown>> {
    return this.wordpressComRequestJson(
      accessToken,
      'GET',
      '/rest/v1.1/me/sites',
    ) as Promise<Record<string, unknown>>
  }

  async getSiteInfo(
    siteUrl: string,
    secret: WordpressConnectionSecret,
    siteId?: string,
  ): Promise<unknown> {
    if (secret.method === 'wordpress_com') {
      return this.wordpressComRequestJson(secret.accessToken, 'GET', `/rest/v1.1/sites/${siteId}`)
    }
    return this.selfHostedRequestJson(siteUrl, secret, 'GET', '/wp-json/')
  }

  async listPosts(siteUrl: string, secret: WordpressConnectionSecret, query: Record<string, unknown>, siteId?: string): Promise<unknown> {
    return this.listCollection(siteUrl, secret, 'posts', query, siteId)
  }

  async createPost(siteUrl: string, secret: WordpressConnectionSecret, payload: WordpressPostPayload, siteId?: string): Promise<unknown> {
    return this.writePost(siteUrl, secret, 'posts', payload, undefined, siteId)
  }

  async updatePost(siteUrl: string, secret: WordpressConnectionSecret, postId: string, payload: WordpressPostPayload, siteId?: string): Promise<unknown> {
    return this.writePost(siteUrl, secret, 'posts', payload, postId, siteId)
  }

  async listPages(siteUrl: string, secret: WordpressConnectionSecret, query: Record<string, unknown>, siteId?: string): Promise<unknown> {
    return this.listCollection(siteUrl, secret, 'pages', query, siteId)
  }

  async createPage(siteUrl: string, secret: WordpressConnectionSecret, payload: WordpressPostPayload, siteId?: string): Promise<unknown> {
    return this.writePost(siteUrl, secret, 'pages', payload, undefined, siteId)
  }

  async updatePage(siteUrl: string, secret: WordpressConnectionSecret, pageId: string, payload: WordpressPostPayload, siteId?: string): Promise<unknown> {
    return this.writePost(siteUrl, secret, 'pages', payload, pageId, siteId)
  }

  async listCategories(siteUrl: string, secret: WordpressConnectionSecret, query: Record<string, unknown>, siteId?: string): Promise<unknown> {
    return this.listCollection(siteUrl, secret, 'categories', query, siteId)
  }

  async createCategory(siteUrl: string, secret: WordpressConnectionSecret, payload: Record<string, unknown>, siteId?: string): Promise<unknown> {
    return this.writeCollection(siteUrl, secret, 'categories', payload, undefined, siteId)
  }

  async listTags(siteUrl: string, secret: WordpressConnectionSecret, query: Record<string, unknown>, siteId?: string): Promise<unknown> {
    return this.listCollection(siteUrl, secret, 'tags', query, siteId)
  }

  async createTag(siteUrl: string, secret: WordpressConnectionSecret, payload: Record<string, unknown>, siteId?: string): Promise<unknown> {
    return this.writeCollection(siteUrl, secret, 'tags', payload, undefined, siteId)
  }

  async uploadMedia(siteUrl: string, secret: WordpressConnectionSecret, payload: WordpressMediaPayload, siteId?: string): Promise<unknown> {
    const media = await this.resolveMediaPayload(payload)
    if (secret.method === 'wordpress_com') {
      const body = new FormData()
      const blobBytes = media.bytes.buffer.slice(
        media.bytes.byteOffset,
        media.bytes.byteOffset + media.bytes.byteLength,
      ) as ArrayBuffer
      body.set('media[]', new Blob([blobBytes], { type: media.mimeType }), media.filename)
      if (payload.title) body.set('attrs[0][title]', payload.title)
      if (payload.alt_text) body.set('attrs[0][alt]', payload.alt_text)
      return this.wordpressComRequestJson(
        secret.accessToken,
        'POST',
        `/rest/v1.1/sites/${siteId}/media/new`,
        body,
      )
    }
    const uploadBytes = media.bytes.buffer.slice(
      media.bytes.byteOffset,
      media.bytes.byteOffset + media.bytes.byteLength,
    ) as ArrayBuffer
    const response = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        Authorization: this.basicAuthHeader(secret.username, secret.applicationPassword),
        'Content-Disposition': `attachment; filename="${media.filename.replace(/"/g, '')}"`,
        'Content-Type': media.mimeType,
      },
      body: uploadBytes,
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`WordPress media upload failed (${response.status})`)
    }
    const uploaded = parseJson(raw) as Record<string, unknown>
    if (payload.alt_text || payload.title) {
      const mediaId = String(uploaded.id ?? '')
      if (mediaId) {
        return this.selfHostedRequestJson(siteUrl, secret, 'POST', `/wp-json/wp/v2/media/${mediaId}`, {
          title: payload.title,
          alt_text: payload.alt_text,
        })
      }
    }
    return uploaded
  }

  private async listCollection(
    siteUrl: string,
    secret: WordpressConnectionSecret,
    collection: string,
    query: Record<string, unknown>,
    siteId?: string,
  ): Promise<unknown> {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    if (secret.method === 'wordpress_com') {
      return this.wordpressComRequestJson(
        secret.accessToken,
        'GET',
        `/rest/v1.1/sites/${siteId}/${collection}${suffix}`,
      )
    }
    return this.selfHostedRequestJson(siteUrl, secret, 'GET', `/wp-json/wp/v2/${collection}${suffix}`)
  }

  private async writePost(
    siteUrl: string,
    secret: WordpressConnectionSecret,
    collection: 'posts' | 'pages',
    payload: WordpressPostPayload,
    id?: string,
    siteId?: string,
  ): Promise<unknown> {
    return this.writeCollection(siteUrl, secret, collection, payload, id, siteId)
  }

  private async writeCollection(
    siteUrl: string,
    secret: WordpressConnectionSecret,
    collection: string,
    payload: Record<string, unknown>,
    id?: string,
    siteId?: string,
  ): Promise<unknown> {
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
    )
    if (secret.method === 'wordpress_com') {
      const path = id
        ? `/rest/v1.1/sites/${siteId}/${collection}/${id}`
        : `/rest/v1.1/sites/${siteId}/${collection}/new`
      return this.wordpressComRequestJson(secret.accessToken, 'POST', path, cleanPayload)
    }
    const path = id ? `/wp-json/wp/v2/${collection}/${id}` : `/wp-json/wp/v2/${collection}`
    return this.selfHostedRequestJson(siteUrl, secret, 'POST', path, cleanPayload)
  }

  private async wordpressComRequestJson(
    accessToken: string,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown> | FormData,
  ): Promise<unknown> {
    const isFormData = body instanceof FormData
    const response = await fetch(`${WORDPRESS_COM_API_BASE}${normalizePath(path)}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`WordPress.com API failed (${response.status})`)
    }
    return parseJson(raw)
  }

  private async selfHostedRequestJson(
    siteUrl: string,
    secret: Extract<WordpressConnectionSecret, { method: 'self_hosted' }>,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetch(`${siteUrl}${normalizePath(path)}`, {
      method,
      headers: {
        Authorization: this.basicAuthHeader(secret.username, secret.applicationPassword),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`WordPress REST API failed (${response.status})`)
    }
    return parseJson(raw)
  }

  private basicAuthHeader(username: string, applicationPassword: string): string {
    return `Basic ${Buffer.from(`${username}:${applicationPassword}`, 'utf8').toString('base64')}`
  }

  private async resolveMediaPayload(
    payload: WordpressMediaPayload,
  ): Promise<{ bytes: Buffer; filename: string; mimeType: string }> {
    if (payload.content_base64) {
      const bytes = Buffer.from(payload.content_base64, 'base64')
      return {
        bytes,
        filename: payload.filename || 'wordpress-media-upload',
        mimeType: payload.mime_type || 'application/octet-stream',
      }
    }
    if (!payload.url) throw new BadRequestException('url or content_base64 is required')
    const url = new URL(payload.url)
    if (url.protocol !== 'https:') throw new BadRequestException('Media URL must use HTTPS')
    const response = await fetch(url.toString())
    if (!response.ok) throw new BadRequestException(`Media download failed (${response.status})`)
    const arrayBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || payload.mime_type || 'application/octet-stream'
    const filename = payload.filename || url.pathname.split('/').filter(Boolean).pop() || 'wordpress-media-upload'
    return { bytes: Buffer.from(arrayBuffer), filename, mimeType: contentType }
  }
}
