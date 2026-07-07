import { describe, expect, it, vi } from 'vitest'

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

describe('Supabase Browser Client', () => {
  it('createClient function is exported', async () => {
    // We mock the @supabase/ssr module to avoid actual Supabase initialization
    vi.mock('@supabase/ssr', () => ({
      createBrowserClient: vi.fn(() => ({
        auth: { getUser: vi.fn() },
        from: vi.fn(),
      })),
      createServerClient: vi.fn(() => ({
        auth: { getUser: vi.fn() },
        from: vi.fn(),
      })),
    }))

    const { createClient } = await import('../src/lib/supabase/client')
    expect(typeof createClient).toBe('function')

    const client = createClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })
})

describe('Supabase barrel export', () => {
  it('re-exports createBrowserClient', async () => {
    vi.mock('@supabase/ssr', () => ({
      createBrowserClient: vi.fn(() => ({
        auth: { getUser: vi.fn() },
        from: vi.fn(),
      })),
      createServerClient: vi.fn(() => ({
        auth: { getUser: vi.fn() },
        from: vi.fn(),
      })),
    }))

    const mod = await import('../src/lib/supabase/index')
    expect(typeof mod.createBrowserClient).toBe('function')
  })
})
