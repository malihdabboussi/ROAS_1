import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EnterpriseApplicationRepository } from '../../repositories/enterprise-application.repository'
import { EnterpriseApplicationService } from '../enterprise-application.service'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

function createConfig() {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
      throw new Error(`Missing config ${key}`)
    }),
  } as unknown as ConfigService
}

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    insert: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return query
}

const body = {
  email: ' USER@Example.com ',
  company_name: 'Acme',
  company_size: '11-50',
}

describe('EnterpriseApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns alreadyApplied for existing normalized email applications', async () => {
    const query = createQuery({ data: { id: 'application-1' }, error: null })
    vi.mocked(createClient).mockReturnValue({ from: vi.fn(() => query) } as never)
    const config = createConfig()
    const service = new EnterpriseApplicationService(new EnterpriseApplicationRepository(config))

    await expect(service.apply(body, 'user-1', 'app')).resolves.toEqual({
      success: true,
      alreadyApplied: true,
    })

    expect(query.eq).toHaveBeenCalledWith('email', 'user@example.com')
  })

  it('inserts pending applications for new normalized emails', async () => {
    const existingQuery = createQuery({ data: null, error: null })
    const insertQuery = createQuery({ error: null })
    const supabase = {
      from: vi.fn().mockReturnValueOnce(existingQuery).mockReturnValueOnce(insertQuery),
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)
    const config = createConfig()
    const service = new EnterpriseApplicationService(new EnterpriseApplicationRepository(config))

    await expect(service.apply(body, null, 'website')).resolves.toEqual({
      success: true,
      alreadyApplied: false,
    })

    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        email: 'user@example.com',
        company_name: 'Acme',
        company_size: '11-50',
        source: 'website',
        status: 'pending',
      }),
    )
  })
})
