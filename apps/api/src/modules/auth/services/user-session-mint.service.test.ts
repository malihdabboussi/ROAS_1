import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient,
}))

// UserSessionMintService lives in @vibey/api-shared, which has no test runner;
// the test runs here, next to its primary consumers (channels, AuthGuard).
describe('UserSessionMintService', () => {
  beforeEach(() => {
    vi.resetModules()
    createClient.mockReset()
    process.env.SUPABASE_URL = 'https://supabase.example'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
  })

  function buildClients() {
    const serviceClient = {
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { email: 'user@example.com' } },
            error: null,
          })),
          generateLink: vi.fn(async () => ({
            data: { properties: { email_otp: 'otp-token' } },
            error: null,
          })),
        },
      },
    }
    const anonClient = {
      auth: {
        refreshSession: vi.fn(async () => ({ data: {}, error: null })),
        verifyOtp: vi.fn(async () => ({
          data: {
            session: {
              access_token: 'access-token',
              refresh_token: 'refresh-token',
              expires_at: 123456,
            },
          },
          error: null,
        })),
      },
    }
    return { serviceClient, anonClient }
  }

  async function buildService(serviceClient: unknown, anonClient: unknown) {
    createClient.mockReturnValueOnce(serviceClient).mockReturnValueOnce(anonClient)
    const { SupabaseServiceClient, UserSessionMintService } = await import('@vibey/api-shared')
    return new UserSessionMintService(new SupabaseServiceClient())
  }

  it('mints a token through GoTrue magic link exchange', async () => {
    const { serviceClient, anonClient } = buildClients()
    const service = await buildService(serviceClient, anonClient)

    await expect(service.mintAccessToken('user-1')).resolves.toBe('access-token')
    expect(serviceClient.auth.admin.getUserById).toHaveBeenCalledWith('user-1')
    expect(serviceClient.auth.admin.generateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'user@example.com',
    })
    expect(anonClient.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: 'otp-token',
      type: 'magiclink',
    })
  })

  it('skips the admin user lookup when an email hint is provided', async () => {
    const { serviceClient, anonClient } = buildClients()
    const service = await buildService(serviceClient, anonClient)

    await expect(service.mintAccessToken('user-1', 'hint@example.com')).resolves.toBe(
      'access-token',
    )
    expect(serviceClient.auth.admin.getUserById).not.toHaveBeenCalled()
    expect(serviceClient.auth.admin.generateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'hint@example.com',
    })
  })
})
