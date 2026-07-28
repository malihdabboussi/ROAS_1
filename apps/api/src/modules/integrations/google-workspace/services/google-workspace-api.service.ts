import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { VaultService } from '../../../vault/services/vault.service'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { GoogleWorkspaceGoogleClient } from '../integrations/google-workspace-google.client'
import { GoogleWorkspaceRepository } from '../repositories/google-workspace.repository'
import { OrgPersonCalendarIdentitiesRepository } from '../repositories/org-person-calendar-identities.repository'
import { OrgPersonCalendarIdentitiesService } from './org-person-calendar-identities.service'

const PROVIDER = 'google_workspace'
const VAULT_LABEL = 'service_account'

@Injectable()
export class GoogleWorkspaceApiService {
  constructor(
    private readonly client: GoogleWorkspaceGoogleClient,
    private readonly vault: VaultService,
    private readonly connections: IntegrationConnectionsRepository,
    private readonly workspaceRepo: GoogleWorkspaceRepository,
    private readonly identitiesRepo: OrgPersonCalendarIdentitiesRepository,
    private readonly identities: OrgPersonCalendarIdentitiesService,
  ) {}

  private assertAdmin(scope: RequestScope) {
    if (!scope.orgId) throw new BadRequestException('Organization context is required')
    if (scope.orgRole !== 'admin' && scope.orgRole !== 'owner') {
      throw new ForbiddenException('Only org admin/owner can manage Google Workspace')
    }
    return scope.orgId
  }

  async getStatus(orgId: string | null) {
    if (!orgId) return { connected: false, status: null }
    const connection = await this.workspaceRepo.findOrgConnection(orgId)
    if (!connection) return { connected: false, status: null }
    const vaultUserId = String(connection.metadata?.vault_user_id ?? connection.user_id)
    const hasSecret = await this.vault.hasSecret(vaultUserId, PROVIDER, VAULT_LABEL)
    const rowConnected = connection.status === 'connected'
    return {
      // Row status drives "connected" in product UI. Missing vault credentials
      // are exposed separately so Team Agenda does not look uninstalled.
      connected: rowConnected,
      credentialsReady: hasSecret && rowConnected,
      status: connection.status,
      connectedAt: connection.connected_at,
      connectionLabel: connection.connection_label,
      clientEmail: connection.metadata?.client_email ?? null,
      workspaceAdminEmail: connection.metadata?.workspace_admin_email ?? null,
      lastDirectorySyncAt: connection.metadata?.last_directory_sync_at ?? null,
    }
  }

  async connect(
    userId: string,
    scope: RequestScope,
    body: { serviceAccountJson: string; workspaceAdminEmail: string },
  ) {
    const orgId = this.assertAdmin(scope)
    const serviceAccount = this.client.parseServiceAccount(body.serviceAccountJson)
    const adminEmail = body.workspaceAdminEmail.trim().toLowerCase()
    if (!adminEmail.includes('@')) {
      throw new BadRequestException('workspace_admin_email must be a valid email')
    }

    // Validate DWD by minting a directory token for the admin subject.
    await this.client.getAccessToken(serviceAccount, adminEmail, [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
    ])

    await this.vault.storeSecret(
      userId,
      PROVIDER,
      VAULT_LABEL,
      JSON.stringify(serviceAccount),
      'custom',
      { org_id: orgId, client_email: serviceAccount.client_email },
    )

    await this.connections.ensureAvailable({
      id: PROVIDER,
      provider: PROVIDER,
      name: 'Google Workspace',
      description:
        'Connect Google Workspace with domain-wide delegation so admins and agents can resolve teammate calendars by work email.',
      auth_type: 'api_key',
      is_available: true,
      metadata: {
        category: 'productivity',
        website: 'https://workspace.google.com',
      },
    })

    const now = new Date().toISOString()
    const existing = await this.workspaceRepo.findOrgConnection(orgId)
    const row = {
      user_id: userId,
      org_id: orgId,
      integration_id: PROVIDER,
      provider: PROVIDER,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      scope_mode: 'org_shared',
      connection_label: `Workspace (${serviceAccount.client_email})`,
      metadata: {
        vault_user_id: userId,
        client_email: serviceAccount.client_email,
        workspace_admin_email: adminEmail,
        scopes: [
          'https://www.googleapis.com/auth/admin.directory.user.readonly',
          'https://www.googleapis.com/auth/calendar.readonly',
        ],
      },
      updated_at: now,
    }

    if (existing?.id) {
      await this.connections.updateServiceTokensById(
        existing.id,
        row,
        'Failed to update Google Workspace connection',
      )
    } else {
      await this.connections.upsertConnection(PROVIDER, userId, row, orgId, 'org_shared')
    }

    return { connected: true, client_email: serviceAccount.client_email }
  }

  async disconnect(userId: string, scope: RequestScope) {
    const orgId = this.assertAdmin(scope)
    const connection = await this.workspaceRepo.findOrgConnection(orgId)
    if (!connection) return { disconnected: true }
    const vaultUserId = String(connection.metadata?.vault_user_id ?? connection.user_id ?? userId)
    await this.vault.deleteSecret(vaultUserId, PROVIDER, VAULT_LABEL)
    await this.connections.markDisconnectedById(
      this.workspaceRepo.getServiceClient(),
      connection.id,
      'Failed to disconnect Google Workspace',
    )
    return { disconnected: true }
  }

  async loadServiceAccount(orgId: string) {
    const connection = await this.workspaceRepo.findOrgConnection(orgId)
    if (!connection) throw new NotFoundException('Google Workspace is not connected')
    const vaultUserId = String(connection.metadata?.vault_user_id ?? connection.user_id)
    const raw = await this.vault.getSecret(vaultUserId, PROVIDER, VAULT_LABEL)
    if (!raw) throw new NotFoundException('Google Workspace credentials are missing')
    return {
      connection,
      serviceAccount: this.client.parseServiceAccount(raw),
      adminEmail: String(connection.metadata?.workspace_admin_email ?? '').toLowerCase(),
    }
  }

  async syncDirectory(supabase: SupabaseClient, scope: RequestScope) {
    const orgId = this.assertAdmin(scope)
    const { connection, serviceAccount, adminEmail } = await this.loadServiceAccount(orgId)
    if (!adminEmail.includes('@')) {
      throw new BadRequestException('Workspace admin email is missing on the connection')
    }
    const users = await this.client.listDirectoryUsers(serviceAccount, adminEmail)
    const now = new Date().toISOString()
    let upserted = 0
    let matched = 0
    for (const user of users) {
      if (user.suspended) continue
      const existing = await this.identitiesRepo.findByEmail(supabase, orgId, user.primaryEmail)
      // Directory users are Team Agenda–eligible by default. Rejected stays out.
      // Slack/portal person links still attach via seedFromOrgSurfaces below.
      await this.identitiesRepo.upsertByEmail(supabase, {
        orgId,
        calendarEmail: user.primaryEmail,
        displayName: user.fullName,
        googleWorkspaceUserId: user.id,
        source: 'directory_sync',
        lastSyncedAt: now,
        matchStatus: existing?.match_status === 'rejected' ? 'rejected' : 'confirmed',
        matchMethod:
          existing?.match_status === 'rejected'
            ? (existing.match_method ?? 'manual')
            : (existing?.match_method ?? 'directory_sync'),
      })
      const row = await this.identitiesRepo.findByEmail(supabase, orgId, user.primaryEmail)
      if (row?.match_status === 'confirmed') matched += 1
      upserted += 1
    }

    await this.connections.updateServiceTokensById(
      connection.id,
      {
        metadata: {
          ...(connection.metadata ?? {}),
          last_directory_sync_at: now,
          last_directory_user_count: upserted,
          last_directory_matched_count: matched,
        },
        updated_at: now,
      },
      'Failed to update directory sync metadata',
    )

    // Re-link Slack/portal onto Directory emails only; drops external Slack-only rows.
    const linked = await this.identities.seedFromOrgSurfaces(supabase, orgId)

    return {
      success: true,
      upserted,
      matched,
      pruned: linked.pruned ?? 0,
      linked: linked.linked ?? 0,
      total_directory_users: users.length,
    }
  }
}
