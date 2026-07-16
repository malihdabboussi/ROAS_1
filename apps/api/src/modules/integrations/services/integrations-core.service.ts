import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { OrgScopeService } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import {
  CONNECTION_IDENTITY_TOOL_MAP,
  mapComposioToolkitToIntegrationId,
} from './integrations-identity-tools'

export type IntegrationConfigRow = {
  integration_id: string
  toolkit_slug: string
  auth_config_id: string | null
  enabled: boolean
  auth_mode: string
  metadata: Record<string, unknown>
}

export type ConnectionScopeMode = 'personal' | 'org_shared'

export type ReusableComposioConnection = {
  connectionId: string
  userIntegrationId: string | null
  status: 'connected'
  connectionScope: ConnectionScopeMode
}

@Injectable()
export class IntegrationsCoreService {
  private readonly logger = new Logger(IntegrationsCoreService.name)

  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly orgScope: OrgScopeService,
    @Optional() private readonly spaceAutomation?: SpaceAutomationService,
  ) {}

  resolveScopeMode(scope: RequestScope, requestedScope?: string | null): ConnectionScopeMode {
    if (!scope.orgId) return 'personal'
    return requestedScope === 'org_shared' ? 'org_shared' : 'personal'
  }

  isOrgAdminOrOwner(scope: RequestScope): boolean {
    return scope.orgRole === 'owner' || scope.orgRole === 'admin'
  }

  async resolveReusableComposioConnection(
    supabase: SupabaseClient,
    input: {
      userId: string
      scope: RequestScope
      scopeMode: ConnectionScopeMode
      integrationId: string
      toolkitSlug: string
      authConfigId: string
      connectionLabel?: string | null
      accountType?: 'PRIVATE' | 'SHARED'
    },
  ): Promise<ReusableComposioConnection | null> {
    const rows = await this.listScopedConnectionRows(supabase, input)
    for (const row of rows) {
      const active = await this.getActiveStoredComposioAccount(row, input.toolkitSlug)
      if (!active) continue
      const userIntegrationId = await this.activateComposioConnectionRow(supabase, input, {
        row,
        connectionId: active,
      })
      return {
        connectionId: active,
        userIntegrationId,
        status: 'connected',
        connectionScope: input.scopeMode,
      }
    }

    const account = await this.findActiveComposioAccount(input)
    if (!account) return null

    const connectionId = String(account.id ?? account.nanoid ?? '').trim()
    if (!connectionId) return null
    const userIntegrationId = await this.activateComposioConnectionRow(supabase, input, {
      row: this.pickPreferredScopedConnectionRow(rows, input.userId, input.scope.orgId),
      connectionId,
    })
    return {
      connectionId,
      userIntegrationId,
      status: 'connected',
      connectionScope: input.scopeMode,
    }
  }

  pickPreferredScopedConnectionRow(
    rows: Array<Record<string, unknown>>,
    userId: string,
    orgId: string | null,
  ): Record<string, unknown> | null {
    if (rows.length === 0) return null
    if (!orgId) {
      return rows.find((row) => String(row.status ?? '').toLowerCase() === 'connected') ?? rows[0]
    }

    const connectedRows = rows.filter(
      (row) => String(row.status ?? '').toLowerCase() === 'connected',
    )
    const personalConnected = connectedRows.find(
      (row) =>
        String(row.scope_mode ?? 'personal') === 'personal' && String(row.user_id) === userId,
    )
    if (personalConnected) return personalConnected
    const sharedDefaultConnected = connectedRows.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
    )
    if (sharedDefaultConnected) return sharedDefaultConnected
    const sharedConnected = connectedRows.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared',
    )
    if (sharedConnected) return sharedConnected
    const personalAny = rows.find(
      (row) =>
        String(row.scope_mode ?? 'personal') === 'personal' && String(row.user_id) === userId,
    )
    if (personalAny) return personalAny
    const sharedDefaultAny = rows.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
    )
    return sharedDefaultAny ?? rows[0]
  }

  async upsertPersonalScopedIntegration(
    supabase: SupabaseClient,
    scope: RequestScope,
    data: Record<string, unknown>,
  ): Promise<{ id: string | null; error: { message: string } | null }> {
    const integrationId = data.integration_id as string
    const now = new Date().toISOString()
    const baseQuery = this.repository
      .table(supabase, 'user_integrations')
      .select('id')
      .eq('integration_id', integrationId)
      .eq('user_id', scope.userId)
      .eq('scope_mode', 'personal')
      .order('updated_at', { ascending: false })
      .limit(1)

    const query = scope.orgId ? baseQuery.eq('org_id', scope.orgId) : baseQuery.is('org_id', null)
    const { data: existingRows } = await query
    const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows

    if (existing?.id) {
      const { data: updated, error } = await this.repository
        .table(supabase, 'user_integrations')
        .update({ ...data, scope_mode: 'personal', updated_at: now })
        .eq('id', existing.id)
        .select('id')
        .maybeSingle()
      return {
        id: (updated?.id as string | undefined) ?? existing.id,
        error: error ? { message: error.message } : null,
      }
    }

    return this.insertPersonalScopedIntegration(supabase, scope, data)
  }

  async insertPersonalScopedIntegration(
    supabase: SupabaseClient,
    scope: RequestScope,
    data: Record<string, unknown>,
  ): Promise<{ id: string | null; error: { message: string } | null }> {
    const now = new Date().toISOString()
    const insertData = {
      ...data,
      ...this.orgScope.getInsertData(scope),
      scope_mode: 'personal' as const,
      is_default: false,
      updated_at: now,
    }
    const { data: inserted, error } = await this.repository
      .table(supabase, 'user_integrations')
      .insert(insertData)
      .select('id')
      .maybeSingle()
    return {
      id: (inserted?.id as string | undefined) ?? null,
      error: error ? { message: error.message } : null,
    }
  }

  async insertOrgSharedIntegration(
    supabase: SupabaseClient,
    scope: RequestScope,
    data: Record<string, unknown>,
  ): Promise<{ id: string | null; error: { message: string } | null }> {
    if (!scope.orgId) {
      return { id: null, error: { message: 'org context required for org_shared integration' } }
    }
    const integrationId = String(data.integration_id ?? '')
      .trim()
      .toLowerCase()
    const { data: existingDefault } = await this.repository
      .table(supabase, 'user_integrations')
      .select('id')
      .eq('org_id', scope.orgId)
      .eq('integration_id', integrationId)
      .eq('scope_mode', 'org_shared')
      .eq('is_default', true)
      .maybeSingle()

    const now = new Date().toISOString()
    const insertData = {
      ...data,
      ...this.orgScope.getInsertData(scope),
      scope_mode: 'org_shared' as const,
      is_default: !existingDefault?.id,
      updated_at: now,
    }
    const { data: inserted, error } = await this.repository
      .table(supabase, 'user_integrations')
      .insert(insertData)
      .select('id')
      .maybeSingle()
    return {
      id: (inserted?.id as string | undefined) ?? null,
      error: error ? { message: error.message } : null,
    }
  }

  async updateIntegrationById(
    supabase: SupabaseClient,
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ error: { message: string } | null }> {
    const { error } = await this.repository
      .table(supabase, 'user_integrations')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    return { error: error ? { message: error.message } : null }
  }

  async getIntegrationRowForScope(
    supabase: SupabaseClient,
    scope: RequestScope,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    let query = this.repository.table(supabase, 'user_integrations').select('*').eq('id', id)
    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.eq('user_id', scope.userId).is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error || !data) return null
    return data as Record<string, unknown>
  }

  async setOrgSharedDefaultConnection(
    supabase: SupabaseClient,
    scope: RequestScope,
    rowId: string,
  ): Promise<{ success: boolean; error?: string; integration_id?: string }> {
    if (!scope.orgId) return { success: false, error: 'org context required' }
    const row = await this.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }
    const scopeMode = String(row.scope_mode ?? '')
    if (scopeMode !== 'org_shared') {
      return { success: false, error: 'Default can only be set for org shared connections' }
    }
    const integrationId = String(row.integration_id ?? '')
      .trim()
      .toLowerCase()
    const orgId = scope.orgId
    const now = new Date().toISOString()

    const { error: resetError } = await this.repository
      .table(supabase, 'user_integrations')
      .update({ is_default: false, updated_at: now })
      .eq('org_id', orgId)
      .eq('integration_id', integrationId)
      .eq('scope_mode', 'org_shared')
    if (resetError) return { success: false, error: resetError.message }

    const { error: setError } = await this.repository
      .table(supabase, 'user_integrations')
      .update({ is_default: true, updated_at: now })
      .eq('id', rowId)
    if (setError) return { success: false, error: setError.message }

    return { success: true, integration_id: integrationId }
  }

  async setPersonalDefaultConnection(
    supabase: SupabaseClient,
    scope: RequestScope,
    rowId: string,
  ): Promise<{ success: boolean; error?: string; integration_id?: string }> {
    const row = await this.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }
    const scopeMode = String(row.scope_mode ?? '')
    if (scopeMode !== 'personal') {
      return { success: false, error: 'Personal default can only be set for personal connections' }
    }
    if (String(row.user_id ?? '') !== scope.userId) {
      return { success: false, error: 'You can only set default on your own personal connection' }
    }
    const integrationId = String(row.integration_id ?? '')
      .trim()
      .toLowerCase()
    if (!integrationId) return { success: false, error: 'Integration id missing' }
    const now = new Date().toISOString()

    let resetQuery = this.repository
      .table(supabase, 'user_integrations')
      .update({ is_default: false, updated_at: now })
      .eq('user_id', scope.userId)
      .eq('integration_id', integrationId)
      .eq('scope_mode', 'personal')
    resetQuery = scope.orgId ? resetQuery.eq('org_id', scope.orgId) : resetQuery.is('org_id', null)
    const { error: resetError } = await resetQuery
    if (resetError) return { success: false, error: resetError.message }

    const { error: setError } = await this.repository
      .table(supabase, 'user_integrations')
      .update({ is_default: true, updated_at: now })
      .eq('id', rowId)
    if (setError) return { success: false, error: setError.message }

    return { success: true, integration_id: integrationId }
  }

  async changeConnectionScope(
    supabase: SupabaseClient,
    scope: RequestScope,
    rowId: string,
    newScopeMode: 'personal' | 'org_shared',
  ): Promise<{ success: boolean; error?: string }> {
    const row = await this.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }
    const now = new Date().toISOString()

    if (newScopeMode === 'org_shared') {
      if (!scope.orgId) return { success: false, error: 'org context required' }
      const integrationId = String(row.integration_id ?? '')
        .trim()
        .toLowerCase()
      const { data: existingDefaults } = await this.repository
        .table(supabase, 'user_integrations')
        .select('id')
        .eq('org_id', scope.orgId)
        .eq('integration_id', integrationId)
        .eq('scope_mode', 'org_shared')
        .eq('is_default', true)
        .limit(1)
      const hasDefault = existingDefaults && existingDefaults.length > 0
      const { error } = await this.repository
        .table(supabase, 'user_integrations')
        .update({
          scope_mode: 'org_shared',
          org_id: scope.orgId,
          is_default: !hasDefault,
          updated_at: now,
        })
        .eq('id', rowId)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await this.repository
        .table(supabase, 'user_integrations')
        .update({ scope_mode: 'personal', is_default: false, updated_at: now })
        .eq('id', rowId)
      if (error) return { success: false, error: error.message }
    }

    // Phase 4 of fathom-org-sharing: when a Fathom row is taken back to
    // personal, every admin-built rule that pointed at it (user-mode source)
    // must auto-disable + notify the rule creator. Self / team rules are
    // unaffected. Best-effort — a failure here logs but does not roll back
    // the scope change (the user's intent to unshare succeeds).
    const integrationId = String(row.integration_id ?? '').toLowerCase()
    const ownerUserId = row.user_id ? String(row.user_id) : null
    if (
      newScopeMode === 'personal' &&
      integrationId === 'fathom' &&
      ownerUserId &&
      this.spaceAutomation
    ) {
      try {
        await this.spaceAutomation.revokeFathomDependentRules(supabase, {
          fathomOwnerUserId: ownerUserId,
          userIntegrationId: rowId,
          mode: 'unshare',
          reason: 'The Fathom owner stopped sharing this connection with the org.',
        })
      } catch (revokeErr) {
        const message = revokeErr instanceof Error ? revokeErr.message : String(revokeErr)
        this.logger.warn(`Fathom unshare cleanup failed: ${message}`)
      }
    }

    return { success: true }
  }

  async resolveIntegrationConfig(
    supabase: SupabaseClient,
    integrationId: string,
  ): Promise<IntegrationConfigRow | null> {
    const { data, error } = await this.repository
      .table(supabase, 'project_composio_toolkit_config')
      .select('integration_id, toolkit_slug, auth_config_id, enabled, auth_mode, metadata')
      .eq('integration_id', integrationId)
      .maybeSingle()

    if (error || !data) return null

    return {
      integration_id: data.integration_id as string,
      toolkit_slug: data.toolkit_slug as string,
      auth_config_id: (data.auth_config_id as string | null) ?? null,
      enabled: Boolean(data.enabled),
      auth_mode: (data.auth_mode as string) || 'managed',
      metadata: (data.metadata as Record<string, unknown>) || {},
    }
  }

  async resolveLinkedInAuthorUrn(userId: string): Promise<string | null> {
    try {
      const infoRes = (await this.composio.executeTool(
        'LINKEDIN_GET_MY_INFO',
        userId,
        {},
      )) as Record<string, unknown>
      const infoData =
        infoRes?.data && typeof infoRes.data === 'object'
          ? (infoRes.data as Record<string, unknown>)
          : null
      const responseDict =
        infoData?.response_dict && typeof infoData.response_dict === 'object'
          ? (infoData.response_dict as Record<string, unknown>)
          : null
      const authorId = responseDict?.author_id ?? responseDict?.sub ?? infoData?.id
      if (!authorId || typeof authorId !== 'string') return null
      return authorId.startsWith('urn:') ? authorId : `urn:li:person:${authorId}`
    } catch {
      return null
    }
  }

  async resolveConnectionIdentity(
    integrationId: string,
    userId: string,
    connectedAccountId?: string,
  ): Promise<string | null> {
    const entry = CONNECTION_IDENTITY_TOOL_MAP[integrationId.toLowerCase()]
    if (!entry) return null
    try {
      const res = (await this.composio.executeTool(
        entry.tool,
        userId,
        {},
        connectedAccountId,
      )) as Record<string, unknown>
      const data =
        res?.data && typeof res.data === 'object'
          ? (res.data as Record<string, unknown>)
          : (res ?? {})
      return entry.extract(data)
    } catch {
      return null
    }
  }

  mapComposioToolkitToIntegrationId(toolkitSlug: string): string | null {
    return mapComposioToolkitToIntegrationId(toolkitSlug)
  }

  private async listScopedConnectionRows(
    supabase: SupabaseClient,
    input: {
      userId: string
      scope: RequestScope
      scopeMode: ConnectionScopeMode
      integrationId: string
    },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.repository
      .table(supabase, 'user_integrations')
      .select(
        'id, user_id, org_id, integration_id, provider, status, connected_at, metadata, scope_mode, is_default, connection_label, updated_at',
      )
      .eq('integration_id', input.integrationId)

    if (input.scopeMode === 'org_shared') {
      if (!input.scope.orgId) return []
      query = query.eq('org_id', input.scope.orgId)
    } else if (input.scope.orgId) {
      query = query.eq('org_id', input.scope.orgId).eq('user_id', input.userId)
    } else {
      query = query.eq('user_id', input.userId).is('org_id', null)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error || !Array.isArray(data)) return []
    return (data as Array<Record<string, unknown>>).filter((row) => {
      const scopeMode = String(row.scope_mode ?? 'personal')
      if (input.scopeMode === 'org_shared') return scopeMode === 'org_shared'
      return scopeMode === 'personal'
    })
  }

  private async getActiveStoredComposioAccount(
    row: Record<string, unknown>,
    toolkitSlug: string,
  ): Promise<string | null> {
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}
    const connectionId = String(metadata.composio_connected_account_id ?? '').trim()
    if (!connectionId) return null
    try {
      const account = (await this.composio.getConnectedAccount(connectionId)) as Record<
        string,
        unknown
      > | null
      if (!this.isActiveToolkitAccount(account, toolkitSlug)) return null
      return connectionId
    } catch {
      return null
    }
  }

  private async findActiveComposioAccount(input: {
    userId: string
    toolkitSlug: string
    authConfigId: string
  }): Promise<Record<string, unknown> | null> {
    const accounts = (await this.composio.listConnectedAccounts({
      userId: input.userId,
      toolkitSlugs: [input.toolkitSlug],
      statuses: ['ACTIVE'],
      authConfigIds: [input.authConfigId],
    })) as Array<Record<string, unknown>>

    return (
      accounts.find((account) => this.isActiveToolkitAccount(account, input.toolkitSlug)) ?? null
    )
  }

  private isActiveToolkitAccount(
    account: Record<string, unknown> | null | undefined,
    toolkitSlug: string,
  ): boolean {
    const status = String(account?.status ?? '')
      .trim()
      .toUpperCase()
    if (status !== 'ACTIVE') return false
    const accountToolkit = String(
      account?.toolkitSlug ??
        account?.toolkit_slug ??
        (account?.toolkit as Record<string, unknown> | undefined)?.slug ??
        '',
    )
      .trim()
      .toLowerCase()
    return accountToolkit === toolkitSlug.toLowerCase()
  }

  private async activateComposioConnectionRow(
    supabase: SupabaseClient,
    input: {
      userId: string
      scope: RequestScope
      scopeMode: ConnectionScopeMode
      integrationId: string
      toolkitSlug: string
      authConfigId: string
      connectionLabel?: string | null
      accountType?: 'PRIVATE' | 'SHARED'
    },
    selected: { row?: Record<string, unknown> | null; connectionId: string },
  ): Promise<string | null> {
    const now = new Date().toISOString()
    const metadata =
      selected.row?.metadata &&
      typeof selected.row.metadata === 'object' &&
      !Array.isArray(selected.row.metadata)
        ? (selected.row.metadata as Record<string, unknown>)
        : {}
    const payload: Record<string, unknown> = {
      integration_id: input.integrationId,
      provider: input.integrationId,
      status: 'connected',
      connected_at: selected.row?.connected_at ?? now,
      error_message: null,
      metadata: {
        ...metadata,
        composio_connected_account_id: selected.connectionId,
        composio_auth_config_id: input.authConfigId,
        composio_toolkit_slug: input.toolkitSlug,
        ...(input.accountType ? { composio_account_type: input.accountType } : {}),
      },
    }
    if (input.connectionLabel) payload.connection_label = input.connectionLabel

    const rowId = String(selected.row?.id ?? '').trim()
    if (rowId) {
      const { error } = await this.updateIntegrationById(supabase, rowId, payload)
      return error ? null : rowId
    }

    const result =
      input.scopeMode === 'org_shared'
        ? await this.insertOrgSharedIntegration(supabase, input.scope, payload)
        : await this.upsertPersonalScopedIntegration(supabase, input.scope, payload)
    return result.error ? null : result.id
  }
}
