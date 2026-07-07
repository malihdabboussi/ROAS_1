import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SupabaseAuthConfig,
  SupabaseAuthUser,
  SupabaseOrganization,
  SupabaseProject,
  SupabaseProjectApiKey,
} from '../types/supabase.types'
import { SupabaseOAuthService } from './supabase-oauth.service'

const SUPABASE_API_BASE = 'https://api.supabase.com'

@Injectable()
export class SupabaseManagementService {
  constructor(private readonly oauth: SupabaseOAuthService) {}

  async listOrganizations(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<SupabaseOrganization[]> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiGet<SupabaseOrganization[]>(token, '/v1/organizations')
  }

  async listProjects(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<SupabaseProject[]> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiGet<SupabaseProject[]>(token, '/v1/projects')
  }

  async getProject(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
  ): Promise<SupabaseProject> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiGet<SupabaseProject>(token, `/v1/projects/${projectRef}`)
  }

  async createProject(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    params: {
      organization_id: string
      name: string
      region: string
      db_pass: string
      plan?: string
    },
  ): Promise<SupabaseProject> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiPost<SupabaseProject>(token, '/v1/projects', {
      organization_id: params.organization_id,
      name: params.name,
      region: params.region,
      db_pass: params.db_pass,
      plan: params.plan ?? 'free',
    })
  }

  async getProjectApiKeys(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
  ): Promise<SupabaseProjectApiKey[]> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiGet<SupabaseProjectApiKey[]>(token, `/v1/projects/${projectRef}/api-keys`)
  }

  async runQuery(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    query: string,
    parameters?: unknown[],
  ): Promise<unknown> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    const body: Record<string, unknown> = { query }
    if (parameters?.length) body.parameters = parameters
    return this.apiPost<unknown>(token, `/v1/projects/${projectRef}/database/query`, body)
  }

  async runReadOnlyQuery(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    query: string,
    parameters?: unknown[],
  ): Promise<unknown> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    const body: Record<string, unknown> = { query }
    if (parameters?.length) body.parameters = parameters
    return this.apiPost<unknown>(token, `/v1/projects/${projectRef}/database/query/read-only`, body)
  }

  // ── Auth Management ──

  async listAuthUsers(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    page = 1,
    perPage = 50,
  ): Promise<{ users: SupabaseAuthUser[]; total: number }> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiGet<{ users: SupabaseAuthUser[]; total: number }>(
      token,
      `/v1/projects/${projectRef}/auth/users?page=${page}&per_page=${perPage}`,
    )
  }

  async getAuthUser(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    authUserId: string,
  ): Promise<SupabaseAuthUser> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiGet<SupabaseAuthUser>(
      token,
      `/v1/projects/${projectRef}/auth/users/${authUserId}`,
    )
  }

  async createAuthUser(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    params: {
      email?: string
      phone?: string
      password?: string
      email_confirm?: boolean
      user_metadata?: Record<string, unknown>
    },
  ): Promise<SupabaseAuthUser> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiPost<SupabaseAuthUser>(
      token,
      `/v1/projects/${projectRef}/auth/users`,
      params as Record<string, unknown>,
    )
  }

  async updateAuthUser(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    authUserId: string,
    params: {
      email?: string
      phone?: string
      password?: string
      ban_duration?: string
      user_metadata?: Record<string, unknown>
    },
  ): Promise<SupabaseAuthUser> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiPut<SupabaseAuthUser>(
      token,
      `/v1/projects/${projectRef}/auth/users/${authUserId}`,
      params as Record<string, unknown>,
    )
  }

  async deleteAuthUser(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    authUserId: string,
  ): Promise<void> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    await this.apiDelete(token, `/v1/projects/${projectRef}/auth/users/${authUserId}`)
  }

  async getAuthConfig(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
  ): Promise<SupabaseAuthConfig> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiGet<SupabaseAuthConfig>(token, `/v1/projects/${projectRef}/config/auth`)
  }

  async updateAuthConfig(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    projectRef: string,
    config: Partial<SupabaseAuthConfig>,
  ): Promise<SupabaseAuthConfig> {
    const token = await this.oauth.getAccessToken(supabase, userId, orgId)
    return this.apiPatch<SupabaseAuthConfig>(
      token,
      `/v1/projects/${projectRef}/config/auth`,
      config as Record<string, unknown>,
    )
  }

  // ── Internal helpers ──

  private async apiGet<T>(token: string, path: string): Promise<T> {
    const response = await fetch(`${SUPABASE_API_BASE}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new BadRequestException(`Supabase Management API error (${response.status}): ${text}`)
    }

    return (await response.json()) as T
  }

  private async apiPost<T>(token: string, path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${SUPABASE_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new BadRequestException(`Supabase Management API error (${response.status}): ${text}`)
    }

    return (await response.json()) as T
  }

  private async apiPut<T>(token: string, path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${SUPABASE_API_BASE}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new BadRequestException(`Supabase Management API error (${response.status}): ${text}`)
    }

    return (await response.json()) as T
  }

  private async apiPatch<T>(
    token: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${SUPABASE_API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new BadRequestException(`Supabase Management API error (${response.status}): ${text}`)
    }

    return (await response.json()) as T
  }

  private async apiDelete(token: string, path: string): Promise<void> {
    const response = await fetch(`${SUPABASE_API_BASE}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new BadRequestException(`Supabase Management API error (${response.status}): ${text}`)
    }
  }
}
