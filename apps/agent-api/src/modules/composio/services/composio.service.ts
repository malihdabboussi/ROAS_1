import type { Composio } from '@composio/core'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { buildExternalAssetRef, type ExternalAssetRef } from '@vibey/api-shared'

type InitiateConnectionOptions = {
  callbackUrl?: string
  allowMultiple?: boolean
  accountType?: 'PRIVATE' | 'SHARED'
}

type ListToolkitsOptions = {
  search?: string
  limit?: number
  cursor?: string
  category?: string
}

type ListConnectedAccountsOptions = {
  userId?: string
  toolkitSlugs?: string[]
  statuses?: string[]
  authConfigIds?: string[]
}

@Injectable()
export class ComposioService {
  private _composio: Composio | null = null

  constructor(private readonly config: ConfigService) {}

  private get composio(): Composio {
    if (!this._composio) {
      const apiKey = this.config.get<string>('COMPOSIO_API_KEY') || ''
      if (!apiKey) throw new Error('COMPOSIO_API_KEY is not configured')
      const baseURL = this.config.get<string>('COMPOSIO_BASE_URL') || undefined
      const { Composio: ComposioClass } = require('@composio/core')
      this._composio = new ComposioClass({
        apiKey,
        ...(baseURL ? { baseURL } : {}),
        toolkitVersions: 'latest',
      } as Record<string, unknown>)
    }
    return this._composio!
  }

  async initiateConnectedAccount(
    userId: string,
    authConfigId: string,
    options: InitiateConnectionOptions = {},
  ): Promise<{ id: string; redirectUrl: string | null; status: string | null }> {
    const linkOptions: Record<string, unknown> = {
      ...(options.callbackUrl ? { callbackUrl: options.callbackUrl } : {}),
      ...(typeof options.allowMultiple === 'boolean'
        ? { allowMultiple: options.allowMultiple }
        : {}),
      ...(options.accountType ? { experimental: { accountType: options.accountType } } : {}),
    }

    const request = (await this.composio.connectedAccounts.link(
      userId,
      authConfigId,
      linkOptions as never,
    )) as {
      id: string
      redirectUrl?: string
      redirect_url?: string
      status?: string
    }

    return {
      id: request.id,
      redirectUrl: request.redirectUrl ?? request.redirect_url ?? null,
      status: request.status ?? null,
    }
  }

  async getConnectedAccount(connectionId: string): Promise<unknown> {
    return this.composio.connectedAccounts.get(connectionId)
  }

  async listToolkits(options: ListToolkitsOptions = {}): Promise<unknown[]> {
    const result = (await (
      this.composio.toolkits as { get: (opts?: Record<string, unknown>) => Promise<unknown> }
    ).get({
      ...(options.search ? { search: options.search } : {}),
      ...(typeof options.limit === 'number' ? { limit: options.limit } : {}),
      ...(options.cursor ? { cursor: options.cursor } : {}),
      ...(options.category ? { category: options.category } : {}),
    })) as unknown[] | { items?: unknown[]; data?: unknown[] }

    if (Array.isArray(result)) return result
    if (Array.isArray(result.items)) return result.items
    if (Array.isArray(result.data)) return result.data
    return []
  }

  async listConnectedAccounts(options: ListConnectedAccountsOptions = {}): Promise<unknown[]> {
    const params: Record<string, unknown> = {}
    if (options.userId) params.userIds = [options.userId]
    if (options.toolkitSlugs?.length) params.toolkitSlugs = options.toolkitSlugs
    if (options.statuses?.length) params.statuses = options.statuses
    if (options.authConfigIds?.length) params.authConfigIds = options.authConfigIds

    const result = (await this.composio.connectedAccounts.list(params as never)) as
      | unknown[]
      | { items?: unknown[]; data?: unknown[] }

    if (Array.isArray(result)) return result
    if (Array.isArray(result.items)) return result.items
    if (Array.isArray(result.data)) return result.data
    return []
  }

  async listToolsForToolkits(userId: string, toolkitSlugs: string[]): Promise<unknown[]> {
    const result = (await this.composio.tools.get(userId, {
      toolkits: toolkitSlugs,
    })) as unknown[] | { items?: unknown[]; data?: unknown[] }

    if (Array.isArray(result)) return result
    if (Array.isArray(result.items)) return result.items
    if (Array.isArray(result.data)) return result.data
    return []
  }

  async executeTool(
    toolSlug: string,
    userId: string,
    argumentsPayload: Record<string, unknown>,
    connectedAccountId?: string,
  ): Promise<unknown> {
    return this.composio.tools.execute(toolSlug, {
      userId,
      arguments: argumentsPayload,
      ...(connectedAccountId ? { connectedAccountId } : {}),
      dangerouslySkipVersionCheck: true,
    } as Record<string, unknown>)
  }

  async uploadFile(
    file: string,
    toolSlug: string,
    toolkitSlug: string,
  ): Promise<{ name: string; mimetype: string; s3key: string; asset_ref: ExternalAssetRef }> {
    const uploaded = (await this.composio.files.upload({ file, toolSlug, toolkitSlug })) as {
      name: string
      mimetype: string
      s3key: string
    }
    return {
      ...uploaded,
      asset_ref: buildExternalAssetRef({
        provider: 'composio',
        external_id: uploaded.s3key,
        file_path: uploaded.s3key,
        url: file,
        mime_type: uploaded.mimetype,
        name: uploaded.name,
        original_filename: uploaded.name,
        file_size: null,
        org_id: null,
        source: 'composio',
        source_surface: 'composio_file_upload',
        metadata: { tool_slug: toolSlug, toolkit_slug: toolkitSlug },
      }),
    }
  }

  async getAccessTokenForToolkit(
    userId: string,
    toolkitSlug: string,
    connectedAccountId?: string,
  ): Promise<string | null> {
    const accounts = (await this.listConnectedAccounts({
      userId,
      toolkitSlugs: [toolkitSlug],
      statuses: ['ACTIVE'],
    })) as Array<Record<string, unknown>>

    if (accounts.length === 0) return null

    const preferredId = String(connectedAccountId ?? '').trim()
    const account =
      (preferredId
        ? accounts.find((item) => String(item.id ?? item.nanoid ?? '').trim() === preferredId)
        : null) ?? accounts[0]
    const accountId = String(account.id ?? account.nanoid ?? '').trim()
    if (!accountId) return null

    const details = (await this.composio.connectedAccounts.get(accountId)) as Record<
      string,
      unknown
    >

    const state = details.state as Record<string, unknown> | undefined
    const val = state?.val as Record<string, unknown> | undefined
    const connectionParams = details.connectionParams as Record<string, unknown> | undefined

    const raw =
      val?.oauth_token ??
      val?.access_token ??
      connectionParams?.access_token ??
      details.accessToken ??
      details.access_token ??
      ''
    const token = String(raw).trim()
    return token || null
  }
}
