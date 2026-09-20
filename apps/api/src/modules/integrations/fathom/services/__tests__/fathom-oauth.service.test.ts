import { BadRequestException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FathomOAuthService } from '../fathom-oauth.service'

type AnyObj = Record<string, any>

describe('FathomOAuthService', () => {
  let service: FathomOAuthService
  let fathom: AnyObj
  let config: ConfigService
  let repo: AnyObj
  let meetingsPrecallPrep: AnyObj
  let spaceTemplates: AnyObj

  beforeEach(() => {
    fathom = {
      isConfigured: vi.fn().mockReturnValue(true),
      buildAuthorizationUrl: vi.fn(),
      exchangeCodeForTokens: vi.fn(),
      listTeams: vi.fn().mockResolvedValue([]),
      createWebhook: vi.fn(),
      deleteWebhook: vi.fn(),
      refreshAccessToken: vi.fn(),
    }

    config = {
      get: vi.fn((key: string) => {
        const map: Record<string, string> = {
          FATHOM_OAUTH_STATE_SECRET: 'state_secret',
          APP_URL: 'https://app.vibey.test',
          API_URL: 'https://api.vibey.test/',
          SUPABASE_URL: 'https://supabase.vibey.test',
          SUPABASE_SERVICE_ROLE_KEY: 'service_key',
        }
        return map[key]
      }),
    } as unknown as ConfigService

    repo = {
      getIntegrationMetadata: vi.fn().mockResolvedValue({}),
      upsertConnection: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn(),
      getRequestMetadata: vi.fn().mockResolvedValue({}),
      updateRequestMetadata: vi.fn().mockResolvedValue(undefined),
      findActiveOrgMember: vi.fn().mockResolvedValue({ data: null, error: null }),
      getLatestIntegrationId: vi.fn(),
      disconnect: vi.fn(),
      getConnectedIntegration: vi.fn(),
      updateTokens: vi.fn(),
      getServiceClient: vi.fn().mockReturnValue({}),
    }

    meetingsPrecallPrep = {
      resolveMeetingsSpaceId: vi.fn().mockResolvedValue(null),
    }
    spaceTemplates = {
      instantiate: vi
        .fn()
        .mockResolvedValue({ id: 'personal-dashboard', title: 'Personal Dashboard' }),
    }

    service = new FathomOAuthService(
      config,
      fathom as any,
      repo as any,
      undefined,
      meetingsPrecallPrep as any,
      spaceTemplates as any,
    )
  })

  it('creates webhook on callback and persists webhook metadata', async () => {
    fathom.exchangeCodeForTokens.mockResolvedValue({
      access_token: 'access_1',
      refresh_token: 'refresh_1',
    })
    fathom.createWebhook.mockResolvedValue({ id: 'wh_1', secret: 'whsec_1' })
    fathom.listTeams.mockResolvedValue([{ name: 'ROAS Team' }])
    repo.getIntegrationMetadata.mockResolvedValue({ auto_ingest: false })

    const state = (service as any).signState({
      userId: 'user_1',
      redirectTo: 'https://app.vibey.test/settings',
      ts: Date.now(),
    })

    const redirect = await service.handleCallback('code_1', state)

    // Fathom posts to the shared meeting door; the last path segment is the
    // per-connection key that the intake uses to find this connection.
    const sharedDoor =
      /^https:\/\/api\.vibey\.test\/api\/integrations\/meetings\/webhooks\/fathom\/[A-Za-z0-9_-]{16,128}$/
    expect(fathom.createWebhook).toHaveBeenCalledWith('access_1', {
      destinationUrl: expect.stringMatching(sharedDoor),
      triggeredFor: ['my_recordings', 'shared_team_recordings', 'my_shared_with_team_recordings'],
      includeTranscript: true,
      includeSummary: true,
      includeActionItems: true,
    })
    const destinationUrl = fathom.createWebhook.mock.calls[0]![1].destinationUrl as string
    expect(repo.upsertConnection).toHaveBeenCalledWith(
      'user_1',
      { access_token: 'access_1', refresh_token: 'refresh_1' },
      {
        auto_ingest: false,
        team_name: 'ROAS Team',
        webhook_secret: 'whsec_1',
        webhook_id: 'wh_1',
        webhook_key: destinationUrl.split('/').pop(),
        triggered_for: [
          'my_recordings',
          'shared_team_recordings',
          'my_shared_with_team_recordings',
        ],
      },
      { scopeMode: 'personal', orgId: null },
    )
    expect(redirect).toContain('fathom_connected=1')
  })

  it('reactivates only Fathom routes disabled by a prior disconnect after reconnect', async () => {
    fathom.exchangeCodeForTokens.mockResolvedValue({
      access_token: 'access_reconnected',
      refresh_token: 'refresh_reconnected',
    })
    fathom.createWebhook.mockResolvedValue({ id: 'wh_reconnected', secret: 'whsec_reconnected' })
    repo.getLatestIntegrationId.mockResolvedValue('integration_1')
    const admin = { admin: true }
    repo.getServiceClient.mockReturnValue(admin)
    const spaceAutomation = {
      restoreFathomDependentRules: vi.fn().mockResolvedValue({
        restored_automation_ids: ['automation_1'],
      }),
    }
    const reconnectingService = new FathomOAuthService(
      config,
      fathom as any,
      repo as any,
      spaceAutomation as any,
      meetingsPrecallPrep as any,
      spaceTemplates as any,
    )
    const state = (reconnectingService as any).signState({
      userId: 'user_1',
      redirectTo: 'https://app.vibey.test/settings',
      ts: Date.now(),
    })

    await reconnectingService.handleCallback('code_reconnected', state)

    expect(repo.upsertConnection).toHaveBeenCalled()
    expect(repo.getLatestIntegrationId).toHaveBeenCalledWith(admin, 'user_1')
    expect(spaceAutomation.restoreFathomDependentRules).toHaveBeenCalledWith(admin, {
      fathomOwnerUserId: 'user_1',
      userIntegrationId: 'integration_1',
      disabledReason: 'The Fathom account that fed this automation was disconnected.',
    })
  })

  it('saves with scope_mode=org_shared and org_id when state carries org context', async () => {
    fathom.exchangeCodeForTokens.mockResolvedValue({
      access_token: 'access_org',
      refresh_token: 'refresh_org',
    })
    fathom.createWebhook.mockResolvedValue({ id: 'wh_org', secret: 'whsec_org' })
    repo.getIntegrationMetadata.mockResolvedValue({ auto_ingest: true })

    const state = (service as any).signState({
      userId: 'user_org_admin',
      redirectTo: 'https://app.vibey.test/settings',
      ts: Date.now(),
      scopeMode: 'org_shared',
      orgId: 'org_42',
    })

    await service.handleCallback('code_org', state)

    expect(repo.upsertConnection).toHaveBeenCalledWith(
      'user_org_admin',
      { access_token: 'access_org', refresh_token: 'refresh_org' },
      expect.objectContaining({ auto_ingest: true, webhook_secret: 'whsec_org' }),
      { scopeMode: 'org_shared', orgId: 'org_42' },
    )
  })

  it('falls back to scope_mode=personal when org_shared is requested without orgId', async () => {
    fathom.exchangeCodeForTokens.mockResolvedValue({ access_token: 'access_fb' })
    fathom.createWebhook.mockResolvedValue({ id: 'wh_fb', secret: 'whsec_fb' })

    const state = (service as any).signState({
      userId: 'user_fb',
      redirectTo: 'https://app.vibey.test/settings',
      ts: Date.now(),
      scopeMode: 'org_shared',
      orgId: null,
    })

    await service.handleCallback('code_fb', state)

    expect(repo.upsertConnection).toHaveBeenCalledWith(
      'user_fb',
      { access_token: 'access_fb' },
      expect.objectContaining({ webhook_secret: 'whsec_fb' }),
      { scopeMode: 'personal', orgId: null },
    )
  })

  it('does not connect when webhook creation fails', async () => {
    fathom.exchangeCodeForTokens.mockResolvedValue({ access_token: 'access_2' })
    fathom.createWebhook.mockRejectedValue(new Error('webhook failed'))

    const state = (service as any).signState({
      userId: 'user_2',
      redirectTo: 'https://app.vibey.test/settings',
      ts: Date.now(),
    })

    await expect(service.handleCallback('code_2', state)).rejects.toThrow('webhook failed')
    expect(repo.upsertConnection).not.toHaveBeenCalled()
  })

  it('returns needs_reconnect when connected row is missing webhook metadata', async () => {
    repo.getStatus.mockResolvedValue({
      data: {
        status: 'connected',
        connected_at: '2026-05-05T00:00:00Z',
        metadata: {},
      },
      error: null,
    })

    const result = await service.getStatus({} as any, 'user_2')

    expect(result).toEqual({
      connected: false,
      status: 'needs_reconnect',
      connectedAt: '2026-05-05T00:00:00Z',
      autoIngest: true,
      billingScope: 'personal',
      billingOrgId: null,
    })
  })

  it('updates auto-ingest flag in existing metadata', async () => {
    repo.getRequestMetadata.mockResolvedValue({
      webhook_id: 'wh_abc',
      webhook_secret: 'whsec_abc',
    })
    const supabase = {} as any

    await service.updateAutoIngest(supabase, 'user_3', false)

    expect(repo.updateRequestMetadata).toHaveBeenCalledWith(supabase, 'user_3', {
      webhook_id: 'wh_abc',
      webhook_secret: 'whsec_abc',
      auto_ingest: false,
      auto_ingest_billing_scope: 'personal',
      auto_ingest_billing_org_id: null,
    })
  })

  it('updates auto-ingest billing org when user has spending role', async () => {
    repo.getRequestMetadata.mockResolvedValue({
      webhook_id: 'wh_abc',
      webhook_secret: 'whsec_abc',
    })
    repo.findActiveOrgMember.mockResolvedValue({
      data: { role: 'editor', status: 'active' },
      error: null,
    })
    const supabase = {} as any

    const result = await service.updateAutoIngest(supabase, 'user_3', true, {
      billingScope: 'org',
      billingOrgId: 'org_1',
    })

    expect(result).toEqual({
      autoIngest: true,
      billingScope: 'org',
      billingOrgId: 'org_1',
    })
    expect(repo.updateRequestMetadata).toHaveBeenCalledWith(
      supabase,
      'user_3',
      expect.objectContaining({
        auto_ingest: true,
        auto_ingest_billing_scope: 'org',
        auto_ingest_billing_org_id: 'org_1',
      }),
    )
  })

  it('rejects org auto-ingest billing for viewers', async () => {
    repo.findActiveOrgMember.mockResolvedValue({
      data: { role: 'viewer', status: 'active' },
      error: null,
    })

    await expect(
      service.updateAutoIngest({} as any, 'user_4', true, {
        billingScope: 'org',
        billingOrgId: 'org_1',
      }),
    ).rejects.toThrow('Not authorized to charge this organization')
  })

  it('throws when auto-ingest update fails', async () => {
    repo.updateRequestMetadata.mockRejectedValue(new BadRequestException('db write failed'))

    await expect(service.updateAutoIngest({} as any, 'user_4', true)).rejects.toThrow(
      BadRequestException,
    )
  })

  it('reuses the existing Meetings space', async () => {
    meetingsPrecallPrep.resolveMeetingsSpaceId.mockResolvedValue('existing-meetings')
    const supabase = {} as any

    await expect(
      service.ensureMeetingsSpace(supabase, {
        userId: 'user_1',
        orgId: null,
        orgRole: null,
      } as never),
    ).resolves.toEqual({ id: 'existing-meetings', action: 'reuse' })

    expect(spaceTemplates.instantiate).not.toHaveBeenCalled()
  })

  it('instantiates Meetings on the org General campaign when in org context', async () => {
    const supabase = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {}
        for (const method of ['select', 'eq', 'is', 'contains', 'neq']) {
          chain[method] = vi.fn().mockReturnValue(chain)
        }
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'org-general' }, error: null })
        return chain
      }),
    } as any

    await expect(
      service.ensureMeetingsSpace(supabase, {
        userId: 'user_1',
        orgId: 'org_1',
        orgRole: 'admin',
      } as never),
    ).resolves.toEqual({ id: 'personal-dashboard', action: 'create' })

    expect(meetingsPrecallPrep.resolveMeetingsSpaceId).toHaveBeenCalledWith(
      supabase,
      'user_1',
      'org_1',
    )
    expect(spaceTemplates.instantiate).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ userId: 'user_1', orgId: 'org_1' }),
      'personal-dashboard',
      expect.objectContaining({
        title: 'Meetings',
        visibility: 'team',
        include_tasks: true,
        include_docs: true,
        include_channel: false,
        include_automations: true,
        campaign_id: 'org-general',
      }),
    )
  })
})
