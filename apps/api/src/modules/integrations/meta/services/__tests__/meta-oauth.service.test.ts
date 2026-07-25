import { createHmac } from 'crypto'
import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { META_ERRORS } from '../../config/meta-errors.config'
import { MetaOAuthService } from '../meta-oauth.service'

const STATE_SECRET = 'test-state-secret'
const APP_URL = 'https://app.roas.io'

function signState(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', STATE_SECRET).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

describe('MetaOAuthService', () => {
  const config = {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        META_OAUTH_STATE_SECRET: STATE_SECRET,
        APP_URL,
        SUPABASE_URL: 'https://supabase.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      }
      return values[key]
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects connect when Meta OAuth env is missing with an admin-facing message', () => {
    const meta = { isConfigured: () => false }
    const service = new MetaOAuthService(config as never, meta as never, {} as never)

    expect(() => service.getAuthorizationUrl('user-1', `${APP_URL}/settings`)).toThrow(
      BadRequestException,
    )
    try {
      service.getAuthorizationUrl('user-1', `${APP_URL}/settings`)
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException)
      expect((error as BadRequestException).message).toBe(META_ERRORS.MISSING_OAUTH_CONFIG)
      expect((error as BadRequestException).message).not.toMatch(/META_APP_/)
    }
  })

  it('builds an authorize URL after signing OAuth state', () => {
    const meta = {
      isConfigured: () => true,
      buildAuthorizationUrl: vi.fn().mockReturnValue('https://facebook.example/oauth'),
    }
    const service = new MetaOAuthService(config as never, meta as never, {} as never)

    const url = service.getAuthorizationUrl(
      'user-1',
      `${APP_URL}/settings/integrations`,
      'org-1',
      'org_shared',
    )

    expect(url).toBe('https://facebook.example/oauth')
    expect(meta.buildAuthorizationUrl).toHaveBeenCalledWith(expect.any(String))
    const state = String(meta.buildAuthorizationUrl.mock.calls[0][0])
    const [encoded, sig] = state.split('.')
    const expectedSig = createHmac('sha256', STATE_SECRET).update(encoded).digest('base64url')
    expect(sig).toBe(expectedSig)
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      userId: string
      orgId: string
      scopeMode: string
    }
    expect(payload).toMatchObject({
      userId: 'user-1',
      orgId: 'org-1',
      scopeMode: 'org_shared',
    })
  })

  it('stores the ROAS Meta connection with ad accounts and pages on callback', async () => {
    const connections = {
      upsertConnection: vi.fn().mockResolvedValue(undefined),
    }
    const meta = {
      isConfigured: () => true,
      exchangeCodeForTokens: vi.fn().mockResolvedValue({ access_token: 'short' }),
      exchangeForLongLivedToken: vi.fn().mockResolvedValue({
        access_token: 'long-lived',
        expires_in: 3600,
      }),
      getMetaUserProfile: vi.fn().mockResolvedValue({ id: 'meta-user-1', name: 'Dylan Vanas' }),
      getAdAccounts: vi.fn().mockResolvedValue([
        { id: 'act_1', name: 'Acme Ads', currency: 'USD' },
        { id: 'act_2', name: 'Other', currency: 'EUR' },
      ]),
      getPages: vi.fn().mockResolvedValue([
        {
          id: 'page_1',
          name: 'Acme Page',
          instagram_business_account: { id: 'ig_1', username: 'acme' },
        },
      ]),
    }
    const service = new MetaOAuthService(config as never, meta as never, connections as never)
    const state = signState({
      userId: 'user-1',
      redirectTo: `${APP_URL}/settings/integrations`,
      ts: Date.now(),
      orgId: 'org-1',
      scopeMode: 'personal',
    })

    const redirectTo = await service.handleCallback('auth-code', state)

    expect(meta.exchangeCodeForTokens).toHaveBeenCalledWith('auth-code')
    expect(meta.exchangeForLongLivedToken).toHaveBeenCalledWith('short')
    expect(connections.upsertConnection).toHaveBeenCalledWith(
      'meta',
      'user-1',
      expect.objectContaining({
        provider: 'meta',
        status: 'connected',
        access_token: 'long-lived',
        org_id: 'org-1',
        scope_mode: 'personal',
        connection_label: 'Dylan Vanas',
        metadata: {
          meta_user_id: 'meta-user-1',
          meta_user_name: 'Dylan Vanas',
          ad_accounts: [
            { id: 'act_1', name: 'Acme Ads', currency: 'USD' },
            { id: 'act_2', name: 'Other', currency: 'EUR' },
          ],
          pages: [
            {
              id: 'page_1',
              name: 'Acme Page',
              instagram_business_account: { id: 'ig_1', username: 'acme' },
            },
          ],
        },
      }),
      'org-1',
      'personal',
      'Failed to save Meta connection',
    )
    expect(redirectTo).toContain('meta_connected=1')
    expect(redirectTo.startsWith(`${APP_URL}/settings/integrations`)).toBe(true)
  })
})
