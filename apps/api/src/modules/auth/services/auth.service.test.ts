import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient,
}))

describe('AuthService', () => {
  beforeEach(() => {
    vi.resetModules()
    createClient.mockReset()
    process.env.SUPABASE_URL = 'https://supabase.example'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.NEXT_PUBLIC_WAITLIST_MODE = 'false'
  })

  it('rejects public registration when waitlist mode is on', async () => {
    process.env.NEXT_PUBLIC_WAITLIST_MODE = 'true'
    createClient.mockReturnValue({
      auth: {
        admin: {
          createUser: vi.fn(),
        },
        signInWithPassword: vi.fn(),
      },
    })
    const { AuthRepository } = await import('../repositories/auth.repository')
    const { AuthService } = await import('./auth.service')
    const service = new AuthService(new AuthRepository())

    await expect(service.register('user@example.com', 'password1')).resolves.toEqual({
      error:
        'Public sign-ups are closed right now. Sign in if you already have an account, or use an invite.',
      status: 403,
    })
  })

  it('maps duplicate registration errors to 409', async () => {
    createClient.mockReturnValue({
      auth: {
        admin: {
          createUser: vi.fn(async () => ({
            data: {},
            error: { message: 'User already registered' },
          })),
        },
        signInWithPassword: vi.fn(),
      },
    })
    const { AuthRepository } = await import('../repositories/auth.repository')
    const { AuthService } = await import('./auth.service')
    const service = new AuthService(new AuthRepository())

    await expect(service.register('user@example.com', 'password1')).resolves.toEqual({
      error: 'An account with this email already exists.',
      status: 409,
    })
  })

  it('does not return raw Supabase registration errors', async () => {
    createClient.mockReturnValue({
      auth: {
        admin: {
          createUser: vi.fn(async () => ({
            data: {},
            error: { message: 'Database error saving new user' },
          })),
        },
        signInWithPassword: vi.fn(),
      },
    })
    const { AuthRepository } = await import('../repositories/auth.repository')
    const { AuthService } = await import('./auth.service')
    const service = new AuthService(new AuthRepository())

    await expect(service.register('user@example.com', 'password1')).resolves.toEqual({
      error: "I couldn't finish creating your account. Try again in a moment.",
      status: 400,
    })
  })

  it('returns login session tokens on successful password sign in', async () => {
    createClient.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn(async () => ({
          data: {
            session: { access_token: 'access-token', refresh_token: 'refresh-token' },
            user: { id: 'user-1', email: 'user@example.com' },
          },
          error: null,
        })),
      },
    })
    const { AuthRepository } = await import('../repositories/auth.repository')
    const { AuthService } = await import('./auth.service')
    const service = new AuthService(new AuthRepository())

    await expect(service.login('user@example.com', 'password1')).resolves.toEqual({
      session: { access_token: 'access-token', refresh_token: 'refresh-token' },
      user: { id: 'user-1', email: 'user@example.com' },
    })
  })
})
