import { createHmac } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { GitHubIntegration } from '../integrations/github.integration'
import { GitHubReposRepository } from '../repositories/github-repos.repository'
import type { GitHubUserIntegration } from '../types/github.types'

type StatePayload = {
  userId: string
  redirectTo: string
  ts: number
  orgId?: string | null
  scopeMode?: 'personal' | 'org_shared'
}

@Injectable()
export class GitHubOAuthService {
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    private readonly config: ConfigService,
    private readonly github: GitHubIntegration,
    private readonly connections: IntegrationConnectionsRepository,
    private readonly repositories: GitHubReposRepository,
  ) {
    this.stateSecret = this.config.get<string>('GITHUB_OAUTH_STATE_SECRET') || ''
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000'
  }

  isConfigured(): boolean {
    return this.github.isConfigured() && !!this.stateSecret
  }

  getInstallUrl(
    userId: string,
    redirectTo: string,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'GitHub App is not configured. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, GITHUB_OAUTH_STATE_SECRET.',
      )
    }

    const finalRedirectTo = this.normalizeRedirectTo(redirectTo)
    const state = this.signState({
      userId,
      redirectTo: finalRedirectTo,
      ts: Date.now(),
      orgId: orgId ?? null,
      scopeMode,
    })
    return this.github.buildInstallUrl(state)
  }

  async handleCallback(
    installationId: number,
    setupAction: string,
    state: string,
  ): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('GitHub App is not configured')

    const parsedState = this.verifyState(state)

    const tokenData = await this.github.getInstallationToken(installationId)
    const repos = await this.github.listInstallationRepos(tokenData.token)

    await this.upsertUserIntegration(
      parsedState.userId,
      installationId,
      setupAction,
      parsedState.orgId ?? null,
      parsedState.scopeMode ?? 'personal',
    )
    await this.syncRepos(parsedState.userId, installationId, repos)

    const url = new URL(parsedState.redirectTo)
    url.searchParams.set('github_connected', '1')
    return url.toString()
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{
    connected: boolean
    status: string | null
    installationId: number | null
    connectedAt: string | null
    repos: { repo_full_name: string; repo_id: number; default_branch: string }[]
  }> {
    const data = await this.connections.getStatus(supabase, 'github', userId, orgId)

    if (!data) {
      return { connected: false, status: null, installationId: null, connectedAt: null, repos: [] }
    }

    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const installationId = (metadata?.installation_id as number | undefined) ?? null
    const status = (data.status as string | undefined) ?? null

    let repos: { repo_full_name: string; repo_id: number; default_branch: string }[] = []
    if (status === 'connected') {
      repos = await this.repositories.listActiveRepos(supabase, userId)
    }

    return {
      connected: status === 'connected',
      status,
      installationId,
      connectedAt: (data.connected_at as string | null) ?? null,
      repos,
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string, orgId?: string | null): Promise<void> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    await this.connections.markDisconnectedById(
      supabase,
      integration.id,
      'Failed to disconnect GitHub',
    )
    await this.repositories.markReposInactive(supabase, String(integration.user_id ?? userId))
  }

  async getInstallationTokenForUser(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ token: string; installationId: number }> {
    const integration = await this.getConnectedIntegration(supabase, userId, orgId)
    const metadata = (integration.metadata as Record<string, unknown> | null) ?? {}
    const installationId = metadata.installation_id as number | undefined
    if (!installationId) {
      throw new BadRequestException('Missing GitHub installation ID. Reconnect GitHub.')
    }

    const tokenData = await this.github.getInstallationToken(installationId)
    return { token: tokenData.token, installationId }
  }

  // ── Internal helpers ──

  private normalizeRedirectTo(redirectTo: string): string {
    try {
      const url = new URL(redirectTo)
      const app = new URL(this.appUrl)
      if (url.origin !== app.origin) return this.appUrl
      return url.toString()
    } catch {
      return this.appUrl
    }
  }

  private signState(payload: StatePayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    const sig = createHmac('sha256', this.stateSecret).update(encoded).digest('base64url')
    return `${encoded}.${sig}`
  }

  private verifyState(state: string): StatePayload {
    const [encoded, sig] = state.split('.')
    if (!encoded || !sig) throw new BadRequestException('Invalid state')

    const expected = createHmac('sha256', this.stateSecret).update(encoded).digest('base64url')
    if (expected !== sig) throw new BadRequestException('Invalid state')

    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StatePayload
    if (!decoded?.userId || !decoded?.redirectTo || typeof decoded.ts !== 'number') {
      throw new BadRequestException('Invalid state')
    }
    if (Date.now() - decoded.ts > 10 * 60 * 1000) {
      throw new BadRequestException('State expired')
    }
    return decoded
  }

  private async upsertUserIntegration(
    userId: string,
    installationId: number,
    setupAction: string,
    orgId?: string | null,
    scopeMode: 'personal' | 'org_shared' = 'personal',
  ): Promise<void> {
    this.assertSupabaseServiceConfigured()
    const now = new Date().toISOString()
    const row = {
      user_id: userId,
      org_id: orgId ?? null,
      integration_id: 'github',
      provider: 'github',
      scope_mode: scopeMode,
      is_default: false,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: { installation_id: installationId, setup_action: setupAction },
      connection_label: installationId ? `Installation #${installationId}` : null,
      updated_at: now,
    }

    await this.connections.upsertConnection(
      'github',
      userId,
      row,
      orgId,
      scopeMode,
      'Failed to save GitHub connection',
    )
  }

  private async syncRepos(
    userId: string,
    installationId: number,
    repos: { id: number; full_name: string; default_branch: string }[],
  ): Promise<void> {
    const url = this.config.get<string>('SUPABASE_URL') || ''
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!url || !serviceKey) return
    await this.repositories.syncInstallationRepos(userId, installationId, repos)
  }

  private async getConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<GitHubUserIntegration> {
    return this.connections.getConnectedIntegration<GitHubUserIntegration>(
      supabase,
      'github',
      userId,
      orgId,
      'GitHub is not connected',
    )
  }

  private assertSupabaseServiceConfigured(): void {
    const url = this.config.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL || ''
    const serviceKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ''
    if (!url || !serviceKey) {
      throw new BadRequestException('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
  }
}
