import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CursorIntegration } from '../integrations/cursor.integration'
import { CursorRepository } from '../repositories/cursor.repository'
import type { CreateAgentResponse, CursorConnection } from '../types/cursor.types'

type ConnectionLookup = {
  userId: string
  orgId: string | null
  connectionId?: string
}

@Injectable()
export class CursorApiService {
  constructor(
    private readonly cursor: CursorIntegration,
    private readonly repo: CursorRepository,
  ) {}

  async validateAndConnect(apiKey: string): Promise<void> {
    await this.cursor.validateApiKey(apiKey)
  }

  async getActiveConnection(
    supabase: SupabaseClient,
    params: ConnectionLookup,
  ): Promise<CursorConnection> {
    if (params.connectionId) {
      const row = await this.repo.findConnectionById(supabase, params.connectionId)
      if (!row) throw new BadRequestException('Cursor connection not found')
      return this.mapConnection(row)
    }

    if (params.orgId) {
      const orgDefault = await this.repo.findOrgDefault(supabase, params.orgId)
      if (orgDefault?.access_token) return this.mapConnection(orgDefault)

      const orgAny = await this.repo.findLatestOrgShared(supabase, params.orgId)
      if (orgAny?.access_token) return this.mapConnection(orgAny)
    }

    const personalDefault = await this.repo.findPersonalDefault(supabase, params.userId)
    if (personalDefault?.access_token) return this.mapConnection(personalDefault)

    const personalAny = await this.repo.findLatestPersonal(supabase, params.userId, params.orgId)
    if (personalAny?.access_token) return this.mapConnection(personalAny)

    throw new BadRequestException('No active Cursor integration for this scope')
  }

  async listConnections(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<Array<{ id: string; label: string; scope_mode: string; is_default: boolean }>> {
    const rows = await this.repo.listConnections(supabase, userId, orgId)
    return rows.map((row) => ({
      id: String(row.id),
      label: String(row.connection_label ?? 'Cursor'),
      scope_mode: String(row.scope_mode ?? 'personal'),
      is_default: Boolean(row.is_default),
    }))
  }

  async disconnectConnection(
    supabase: SupabaseClient,
    userId: string,
    connectionId?: string,
  ): Promise<void> {
    await this.repo.disconnectConnections(supabase, userId, connectionId)
  }

  async launchAgent(input: {
    connection: CursorConnection
    prompt: string
    repoUrl: string
    startingRef: string
    modelId: string
    branchName?: string
    autoCreatePR?: boolean
  }): Promise<CreateAgentResponse> {
    return this.cursor.createAgent(input.connection.apiKey, {
      prompt: { text: input.prompt },
      model: { id: input.modelId },
      repos: [{ url: input.repoUrl, startingRef: input.startingRef }],
      branchName: input.branchName,
      autoCreatePR: input.autoCreatePR ?? true,
      autoGenerateBranch: !input.branchName,
    })
  }

  private mapConnection(row: Record<string, unknown>): CursorConnection {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>
    const apiKey = typeof row.access_token === 'string' ? row.access_token : ''
    if (!apiKey) throw new BadRequestException('Cursor connection missing API key')
    return {
      integrationRowId: String(row.id),
      userId: String(row.user_id),
      orgId: row.org_id != null ? String(row.org_id) : null,
      apiKey,
      webhookSecret:
        typeof metadata.webhook_secret === 'string' && metadata.webhook_secret.length > 0
          ? metadata.webhook_secret
          : null,
    }
  }
}
