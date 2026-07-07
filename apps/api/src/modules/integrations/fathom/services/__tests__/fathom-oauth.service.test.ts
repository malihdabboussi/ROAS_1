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

  beforeEach(() => {
    fathom = {
      isConfigured: vi.fn().mockReturnValue(true),
      buildAuthorizationUrl: vi.fn(),
      exchangeCodeForTokens: vi.fn(),
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

    service = new FathomOAuthService(config, fathom as any, repo as any)
  })

  it('creates webhook on callback and persists webhook metadata', async () => {
    fathom.exchangeCodeForTokens.mockResolvedValue({
      access_token: 'access_1',
      refresh_token: 'refresh_1',
    })
    fathom.createWebhook.mockResolvedValue({ id: 'wh_1', secret: 'whsec_1' })
    repo.getIntegrationMetadata.mockResolvedValue({ auto_ingest: false })

    const state = (service as any).signState({
      userId: 'user_1',
      redirectTo: 'https://app.vibey.test/settings',
      ts: Date.now(),
    })

    const redirect = await service.handleCallback('code_1', state)

    expect(fathom.createWebhook).toHaveBeenCalledWith('access_1', {
      destinationUrl: 'https://api.vibey.test/api/integrations/fathom/webhook',
      triggeredFor: ['my_recordings'],
      includeTranscript: true,
      includeSummary: true,
      includeActionItems: true,
    })
    expect(repo.upsertConnection).toHaveBeenCalledWith(
      'user_1',
      { access_token: 'access_1', refresh_token: 'refresh_1' },
      {
        auto_ingest: false,
        webhook_secret: 'whsec_1',
        webhook_id: 'wh_1',
      },
      { scopeMode: 'personal', orgId: null },
    )
    expect(redirect).toContain('fathom_connected=1')
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
    repo.findActiveOrgMember.mockResolvedValue({ data: { role: 'editor', status: 'active' }, error: null })
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
    repo.findActiveOrgMember.mockResolvedValue({ data: { role: 'viewer', status: 'active' }, error: null })

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
})
