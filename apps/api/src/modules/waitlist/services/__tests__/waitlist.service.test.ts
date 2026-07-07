import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WaitlistRepository } from '../../repositories/waitlist.repository'
import { WaitlistService } from '../waitlist.service'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

function createConfig() {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
      if (key === 'INVITE_CODE_SECRET') return 'secret'
      throw new Error(`Missing config ${key}`)
    }),
    get: vi.fn(() => undefined),
  } as unknown as ConfigService
}

function createMaybeSingleQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  }
  return query
}

describe('WaitlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns alreadyJoined when a normalized email exists', async () => {
    const existingQuery = createMaybeSingleQuery({ data: { id: 'entry-1' }, error: null })
    const supabase = {
      from: vi.fn(() => existingQuery),
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new WaitlistService(config, new WaitlistRepository(config))

    await expect(service.joinWaitlist({ email: ' USER@Example.com ' })).resolves.toEqual({
      success: true,
      alreadyJoined: true,
      message: "You're already on the list.",
    })

    expect(supabase.from).toHaveBeenCalledWith('waitlist_entries')
    expect(existingQuery.eq).toHaveBeenCalledWith('email', 'user@example.com')
  })

  it('inserts a pending waitlist entry when the email is new', async () => {
    const existingQuery = createMaybeSingleQuery({ data: null, error: null })
    const insertQuery = {
      insert: vi.fn(async () => ({ error: null })),
    }
    const supabase = {
      from: vi.fn((table: string) => (table === 'waitlist_entries' ? existingQuery : insertQuery)),
    }
    supabase.from.mockReturnValueOnce(existingQuery).mockReturnValueOnce(insertQuery)
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new WaitlistService(config, new WaitlistRepository(config))

    await expect(
      service.joinWaitlist({ email: ' USER@Example.com ', name: ' User ' }),
    ).resolves.toEqual({
      success: true,
      alreadyJoined: false,
    })

    expect(insertQuery.insert).toHaveBeenCalledWith({
      email: 'user@example.com',
      name: 'User',
      source: null,
      notes: null,
      heard_from: null,
      use_case: null,
      status: 'pending',
    })
  })

  it('does not return raw Supabase errors when invite registration fails', async () => {
    const inviteQuery = createMaybeSingleQuery({ data: { id: 'invite-1' }, error: null })
    const supabase = {
      from: vi.fn(() => inviteQuery),
      auth: {
        admin: {
          createUser: vi.fn(async () => ({
            data: {},
            error: { message: 'Database error saving new user' },
          })),
        },
      },
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new WaitlistService(config, new WaitlistRepository(config))

    await expect(
      service.registerWithInvite(' USER@Example.com ', 'password1', 'CODE'),
    ).resolves.toEqual({
      error: "I couldn't finish creating your account. Try again in a moment.",
      status: 400,
    })
  })
})
