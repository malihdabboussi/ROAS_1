import type { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActiveCampaignApiService } from '../../activecampaign/services/activecampaign-api.service'
import { CalendlyOAuthService } from '../../calendly/services/calendly-oauth.service'
import { DropboxOAuthService } from '../../dropbox/services/dropbox-oauth.service'
import { FanbasisApiService } from '../../fanbasis/services/fanbasis-api.service'
import { GitHubOAuthService } from '../../github/services/github-oauth.service'
import { GoHighLevelApiService } from '../../gohighlevel/services/gohighlevel-api.service'
import { MetaOAuthService } from '../../meta/services/meta-oauth.service'
import { PaypalOAuthService } from '../../paypal/services/paypal-oauth.service'
import { StripeOAuthService } from '../../stripe/services/stripe-oauth.service'
import { SupabaseOAuthService } from '../../supabase/services/supabase-oauth.service'

const supabaseMock = vi.hoisted(() => {
  const rowsByTable = new Map<string, unknown[]>()
  const makeChain = (table: string) => {
    const chain: Record<string, any> = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(async () => ({
        data: rowsByTable.get(table)?.[0] ?? null,
        error: rowsByTable.get(table)?.[0] ? null : { message: 'not found' },
      })),
      maybeSingle: vi.fn(async () => ({
        data: rowsByTable.get(table)?.[0] ?? null,
        error: null,
      })),
      update: vi.fn(() => chain),
      insert: vi.fn(() => ({ error: null })),
      upsert: vi.fn(() => ({ error: null })),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: rowsByTable.get(table) ?? [], error: null }).then(resolve),
    }
    return chain
  }
  return {
    rowsByTable,
    client: { from: (table: string) => makeChain(table) },
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => supabaseMock.client,
}))

const config = {
  get: vi.fn((key: string) => {
    const values: Record<string, string> = {
      APP_URL: 'https://app.vibey.test',
      SUPABASE_URL: 'https://supabase.vibey.test',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      STRIPE_CONNECT_STATE_SECRET: 'state-secret',
      PAYPAL_STATE_SECRET: 'state-secret',
      CALENDLY_OAUTH_STATE_SECRET: 'state-secret',
      GITHUB_OAUTH_STATE_SECRET: 'state-secret',
      META_OAUTH_STATE_SECRET: 'state-secret',
      PUBLIC_API_URL: 'https://api.vibey.test',
      SUPABASE_OAUTH_CLIENT_ID: 'supabase-client-id',
      SUPABASE_OAUTH_CLIENT_SECRET: 'supabase-client-secret',
      SUPABASE_OAUTH_REDIRECT_URI: 'https://api.vibey.test/integrations/supabase/callback',
      SUPABASE_OAUTH_STATE_SECRET: 'state-secret',
      DROPBOX_OAUTH_STATE_SECRET: 'state-secret',
    }
    return values[key]
  }),
} as unknown as ConfigService

const makeRow = (overrides: Record<string, unknown>) => ({
  id: 'integration-1',
  user_id: 'user-1',
  status: 'connected',
  connected_at: '2026-06-16T09:00:00.000Z',
  scope_mode: 'personal',
  is_default: false,
  updated_at: '2026-06-16T09:00:00.000Z',
  metadata: {},
  ...overrides,
})

describe('Type C integration OAuth service behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.rowsByTable.clear()
  })

  it('keeps Supabase status scoped to the connected org row', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        integration_id: 'supabase',
        org_id: 'org-1',
        connected_at: '2026-06-16T09:30:00.000Z',
      }),
    ])
    const repo = {
      getStatus: vi.fn().mockResolvedValue({
        status: 'connected',
        connected_at: '2026-06-16T09:30:00.000Z',
        metadata: {},
      }),
    }
    const service = new (SupabaseOAuthService as any)(config, repo)

    await expect(
      service.getStatus(supabaseMock.client as never, 'user-1', 'org-1'),
    ).resolves.toEqual({
      connected: true,
      status: 'connected',
      connectedAt: '2026-06-16T09:30:00.000Z',
    })
  })

  it('refreshes Supabase access tokens through the stored refresh token', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        integration_id: 'supabase',
        access_token: 'old-supabase-access',
        refresh_token: 'supabase-refresh',
        token_expires_at: '2000-01-01T00:00:00.000Z',
      }),
    ])
    const repo = {
      getConnectedIntegration: vi.fn().mockResolvedValue({
        id: 'integration-1',
        access_token: 'old-supabase-access',
        refresh_token: 'supabase-refresh',
        token_expires_at: '2000-01-01T00:00:00.000Z',
      }),
      updateTokens: vi.fn().mockResolvedValue(undefined),
    }
    const service = new (SupabaseOAuthService as any)(config, repo)
    vi.spyOn(service as any, 'refreshAccessToken').mockResolvedValue({
      access_token: 'new-supabase-access',
      refresh_token: 'new-supabase-refresh',
      expires_in: 3600,
      token_type: 'bearer',
    })

    await expect(
      service.getAccessToken(supabaseMock.client as never, 'user-1', null),
    ).resolves.toBe('new-supabase-access')
  })

  it('keeps Dropbox status metadata from the connected personal row', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        integration_id: 'dropbox',
        metadata: {
          email: 'creator@example.com',
          display_name: 'Creator Example',
          account_id: 'dbx-1',
        },
      }),
    ])
    const dropbox = { isConfigured: () => true }
    const repo = {
      getStatus: vi.fn().mockResolvedValue({
        status: 'connected',
        connected_at: '2026-06-16T09:00:00.000Z',
        metadata: {
          email: 'creator@example.com',
          display_name: 'Creator Example',
          account_id: 'dbx-1',
        },
      }),
    }
    const service = new (DropboxOAuthService as any)(config, dropbox, repo)

    await expect(service.getStatus(supabaseMock.client as never, 'user-1', null)).resolves.toEqual({
      connected: true,
      status: 'connected',
      email: 'creator@example.com',
      displayName: 'Creator Example',
      connectedAt: '2026-06-16T09:00:00.000Z',
    })
  })

  it('refreshes Dropbox access tokens when the stored token is near expiry', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        integration_id: 'dropbox',
        access_token: 'old-dropbox-access',
        refresh_token: 'dropbox-refresh',
        token_expires_at: '2000-01-01T00:00:00.000Z',
      }),
    ])
    const dropbox = {
      isConfigured: () => true,
      refreshAccessToken: vi.fn().mockResolvedValue({
        access_token: 'new-dropbox-access',
        refresh_token: 'new-dropbox-refresh',
        expires_in: 3600,
      }),
    }
    const repo = {
      getConnectedIntegration: vi.fn().mockResolvedValue({
        id: 'integration-1',
        access_token: 'old-dropbox-access',
        refresh_token: 'dropbox-refresh',
        token_expires_at: '2000-01-01T00:00:00.000Z',
      }),
      updatePersonalTokens: vi.fn().mockResolvedValue(undefined),
      updateTokens: vi.fn().mockResolvedValue(undefined),
    }
    const service = new (DropboxOAuthService as any)(config, dropbox, repo)

    await expect(service.getAccessToken(supabaseMock.client as never, 'user-1')).resolves.toBe(
      'new-dropbox-access',
    )
    expect(dropbox.refreshAccessToken).toHaveBeenCalledWith('dropbox-refresh')
  })

  it('keeps GitHub status on the preferred personal row and includes active repos', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        id: 'shared',
        user_id: 'owner-2',
        org_id: 'org-1',
        scope_mode: 'org_shared',
        is_default: true,
        metadata: { installation_id: 111 },
      }),
      makeRow({
        id: 'personal',
        user_id: 'user-1',
        org_id: 'org-1',
        metadata: { installation_id: 222 },
      }),
    ])
    supabaseMock.rowsByTable.set('github_repos', [
      { repo_full_name: 'vibey/app', repo_id: 44, default_branch: 'main' },
    ])
    const repo = {
      getStatus: vi.fn().mockResolvedValue({
        id: 'personal',
        user_id: 'user-1',
        status: 'connected',
        connected_at: '2026-06-16T09:00:00.000Z',
        metadata: { installation_id: 222 },
      }),
    }
    const githubRepos = {
      listActiveRepos: vi
        .fn()
        .mockResolvedValue([{ repo_full_name: 'vibey/app', repo_id: 44, default_branch: 'main' }]),
    }
    const service = new (GitHubOAuthService as any)(
      config,
      { isConfigured: () => true },
      repo,
      githubRepos,
    )

    await expect(
      service.getStatus(supabaseMock.client as never, 'user-1', 'org-1'),
    ).resolves.toEqual({
      connected: true,
      status: 'connected',
      installationId: 222,
      connectedAt: '2026-06-16T09:00:00.000Z',
      repos: [{ repo_full_name: 'vibey/app', repo_id: 44, default_branch: 'main' }],
    })
  })

  it('keeps Meta org status on the connected personal row before shared defaults', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        id: 'shared',
        user_id: 'owner-2',
        org_id: 'org-1',
        scope_mode: 'org_shared',
        is_default: true,
        metadata: { ad_accounts: [{ id: 'act_shared', name: 'Shared' }], pages: [] },
      }),
      makeRow({
        id: 'personal',
        user_id: 'user-1',
        org_id: 'org-1',
        metadata: { ad_accounts: [{ id: 'act_personal', name: 'Personal' }], pages: [] },
      }),
    ])
    const repo = {
      getStatus: vi.fn().mockResolvedValue({
        id: 'personal',
        user_id: 'user-1',
        status: 'connected',
        connected_at: '2026-06-16T09:00:00.000Z',
        metadata: { ad_accounts: [{ id: 'act_personal', name: 'Personal' }], pages: [] },
      }),
    }
    const service = new (MetaOAuthService as any)(config, { isConfigured: () => true }, repo)

    await expect(
      service.getStatus(supabaseMock.client as never, 'user-1', 'org-1'),
    ).resolves.toMatchObject({
      connected: true,
      adAccounts: [{ id: 'act_personal', name: 'Personal' }],
    })
  })

  it('keeps Stripe org status on the connected personal row before shared defaults', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        id: 'shared',
        user_id: 'owner-2',
        org_id: 'org-1',
        scope_mode: 'org_shared',
        is_default: true,
        metadata: { stripe_user_id: 'acct_shared', livemode: false },
      }),
      makeRow({
        id: 'personal',
        user_id: 'user-1',
        org_id: 'org-1',
        metadata: { stripe_user_id: 'acct_personal', livemode: true },
      }),
    ])
    const repo = {
      getStatus: vi.fn().mockResolvedValue({
        id: 'personal',
        user_id: 'user-1',
        status: 'connected',
        connected_at: '2026-06-16T09:00:00.000Z',
        metadata: { stripe_user_id: 'acct_personal', livemode: true },
      }),
    }
    const service = new (StripeOAuthService as any)(config, { isConfigured: () => true }, repo)

    await expect(
      service.getStatus(supabaseMock.client as never, 'user-1', 'org-1'),
    ).resolves.toMatchObject({
      connected: true,
      stripeUserId: 'acct_personal',
      livemode: true,
    })
  })

  it('refreshes PayPal tokens and keeps using the stored refresh token when PayPal omits one', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        access_token: 'old-access',
        refresh_token: 'old-refresh',
        token_expires_at: '2026-06-16T08:00:00.000Z',
        metadata: { payer_id: 'payer-1' },
      }),
    ])
    const paypal = {
      isConfigured: () => true,
      refreshAccessToken: vi
        .fn()
        .mockResolvedValue({ access_token: 'new-access', expires_in: 3600 }),
    }
    const repo = {
      getConnectedIntegration: vi.fn().mockResolvedValue({
        id: 'integration-1',
        access_token: 'old-access',
        refresh_token: 'old-refresh',
        token_expires_at: '2026-06-16T08:00:00.000Z',
        metadata: { payer_id: 'payer-1' },
      }),
      updateTokens: vi.fn().mockResolvedValue(undefined),
      updateServiceTokensById: vi.fn().mockResolvedValue(undefined),
    }
    const service = new (PaypalOAuthService as any)(config, paypal, repo)

    await expect(service.getValidAccessToken(supabaseMock.client as never, 'user-1')).resolves.toBe(
      'new-access',
    )
    expect(paypal.refreshAccessToken).toHaveBeenCalledWith('old-refresh')
  })

  it('refreshes Calendly access tokens when the stored token is near expiry', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      makeRow({
        access_token: 'old-access',
        refresh_token: 'cal-refresh',
        token_expires_at: '2026-06-16T08:00:00.000Z',
        metadata: {},
      }),
    ])
    const calendly = {
      isConfigured: () => true,
      refreshAccessToken: vi.fn().mockResolvedValue({
        access_token: 'new-cal-access',
        refresh_token: 'new-cal-refresh',
        expires_in: 3600,
      }),
    }
    const repo = {
      getConnectedIntegration: vi.fn().mockResolvedValue({
        id: 'integration-1',
        access_token: 'old-access',
        refresh_token: 'cal-refresh',
        token_expires_at: '2026-06-16T08:00:00.000Z',
        metadata: {},
      }),
      updateTokens: vi.fn().mockResolvedValue(undefined),
      updatePersonalTokens: vi.fn().mockResolvedValue(undefined),
    }
    const service = new (CalendlyOAuthService as any)(config, calendly, repo)

    await expect(service.getAccessToken(supabaseMock.client as never, 'user-1')).resolves.toBe(
      'new-cal-access',
    )
    expect(calendly.refreshAccessToken).toHaveBeenCalledWith('cal-refresh')
  })

  it('connects GoHighLevel after validating the Private Integration Token', async () => {
    const ghl = {
      getLocation: vi.fn().mockResolvedValue({
        id: 'loc-1',
        name: 'Main Location',
        companyId: 'co-1',
      }),
    }
    const vault = { storeSecret: vi.fn() }
    const repo = {
      upsertConnection: vi.fn().mockResolvedValue(undefined),
    }
    const service = new (GoHighLevelApiService as any)(ghl, vault, repo)

    await expect(service.connect('user-1', 'Bearer pit_test', 'loc-1')).resolves.toEqual({
      connected: true,
      locationId: 'loc-1',
      locationName: 'Main Location',
    })
    expect(ghl.getLocation).toHaveBeenCalledWith('pit_test', 'loc-1')
    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user-1',
      'gohighlevel',
      'pit',
      'pit_test',
      'api_key',
      { locationId: 'loc-1' },
    )
  })

  it('connects FanBasis after validating the API key and storing the vault secret', async () => {
    const fanbasis = { listProducts: vi.fn().mockResolvedValue({ data: [] }) }
    const vault = { storeSecret: vi.fn() }
    const repo = {
      ensureAvailable: vi.fn().mockResolvedValue(undefined),
      upsertConnection: vi.fn().mockResolvedValue(undefined),
    }
    const service = new (FanbasisApiService as any)(fanbasis, vault, repo)

    await expect(service.connect('user-1', 'fanbasis-key')).resolves.toEqual({ connected: true })
    expect(fanbasis.listProducts).toHaveBeenCalledWith('fanbasis-key')
    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user-1',
      'fanbasis',
      'api_key',
      'fanbasis-key',
      'api_key',
      {},
    )
  })

  it('returns ActiveCampaign status only when both stored secrets exist', async () => {
    supabaseMock.rowsByTable.set('user_integrations', [
      { status: 'connected', connected_at: '2026-06-16T09:00:00.000Z' },
    ])
    const vault = {
      hasSecret: vi.fn().mockResolvedValue(true),
    }
    const repo = {
      getSimpleStatus: vi.fn().mockResolvedValue({
        connected: true,
        status: 'connected',
        connected_at: '2026-06-16T09:00:00.000Z',
      }),
    }
    const service = new (ActiveCampaignApiService as any)({}, vault, repo)

    await expect(service.getStatus('user-1')).resolves.toEqual({
      connected: true,
      status: 'connected',
      connectedAt: '2026-06-16T09:00:00.000Z',
    })
    expect(vault.hasSecret).toHaveBeenCalledTimes(2)
  })
})
