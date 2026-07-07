import { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreditsService } from '../credits.service'

// Mock Supabase
const mockSbChain: Record<string, any> = {}
const methods = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'not',
  'in',
  'is',
  'like',
  'ilike',
  'single',
  'maybeSingle',
  'order',
  'limit',
  'gte',
  'lte',
  'lt',
  'range',
  'filter',
  'contains',
  'throwOnError',
  'returns',
]
for (const m of methods) {
  mockSbChain[m] = vi.fn().mockReturnValue(mockSbChain)
}
mockSbChain.single.mockResolvedValue({ data: null, error: null })
mockSbChain.maybeSingle.mockResolvedValue({ data: null, error: null })

const mockFrom = vi.fn().mockReturnValue(mockSbChain)

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(''),
}))

describe('CreditsService', () => {
  let service: CreditsService

  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReset()
    mockFrom.mockReturnValue(mockSbChain)

    const configService = {
      get: vi.fn((key: string) => {
        const map: Record<string, string> = {
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'sb_test',
        }
        return map[key]
      }),
    } as unknown as ConfigService

    service = new CreditsService(configService, { report: vi.fn() } as any)
  })

  describe('calculateTextCredits', () => {
    function mockTierPricing(rows: any[]) {
      const tierChain: Record<string, any> = {}
      for (const m of methods) tierChain[m] = vi.fn().mockReturnValue(tierChain)
      tierChain.order = vi.fn().mockResolvedValue({ data: rows, error: null })

      const flatChain: Record<string, any> = {}
      for (const m of methods) flatChain[m] = vi.fn().mockReturnValue(flatChain)
      flatChain.eq = vi.fn().mockResolvedValue({ data: null, error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'llm_model_pricing_tiers') return tierChain
        if (table === 'token_providers_pricing') return flatChain
        return mockSbChain
      })
    }

    it('should calculate credits from token usage with defaults', async () => {
      // Mock no pricing in DB
      mockFrom.mockReturnValue(mockSbChain)
      mockSbChain.eq.mockReturnValue(mockSbChain)
      mockSbChain.select.mockReturnValue(
        Object.assign(Promise.resolve({ data: null, error: null }), mockSbChain),
      )

      const usage = { input: 1000, output: 500, cacheRead: 200, cacheWrite: 100, totalTokens: 1800 }
      const result = await service.calculateTextCredits(usage)

      expect(result.credits).toBeGreaterThanOrEqual(1)
      expect(result.apiCost).toBeGreaterThan(0)
      expect(result.breakdown).toBeDefined()
      expect(result.breakdown.inputCost).toBeGreaterThan(0)
      expect(result.breakdown.outputCost).toBeGreaterThan(0)
    })

    it('should return minimum 1 credit for tiny usage', async () => {
      mockSbChain.select.mockReturnValue(
        Object.assign(Promise.resolve({ data: null, error: null }), mockSbChain),
      )

      const usage = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2 }
      const result = await service.calculateTextCredits(usage)
      expect(result.credits).toBe(1)
    })

    it('should use the standard GPT-5.5 tier at 272000 input-side tokens', async () => {
      mockTierPricing([
        {
          provider: 'openai',
          model_name: 'gpt-5.5',
          pricing_profile: 'standard',
          token_threshold_min: 0,
          token_threshold_max: 272000,
          input_tokens_1k: '0.005000',
          output_tokens_1k: '0.030000',
          cache_read_1k: '0.000500',
          cache_write_1k: null,
        },
        {
          provider: 'openai',
          model_name: 'gpt-5.5',
          pricing_profile: 'extended',
          token_threshold_min: 272001,
          token_threshold_max: null,
          input_tokens_1k: '0.010000',
          output_tokens_1k: '0.045000',
          cache_read_1k: '0.001000',
          cache_write_1k: null,
        },
      ])

      const usage = {
        input: 271000,
        output: 1000,
        cacheRead: 1000,
        cacheWrite: 0,
        totalTokens: 273000,
      }
      const result = await service.calculateTextCredits(usage, 'openai/gpt-5.5')

      expect(result.pricingTier?.pricingProfile).toBe('standard')
      expect(result.pricingTier?.inputSideTokens).toBe(272000)
      expect(result.breakdown.inputCost).toBeCloseTo(1.355)
      expect(result.breakdown.cacheReadCost).toBeCloseTo(0.0005)
    })

    it('should use the extended GPT-5.5 tier above 272000 input-side tokens', async () => {
      mockTierPricing([
        {
          provider: 'openai',
          model_name: 'gpt-5.5',
          pricing_profile: 'standard',
          token_threshold_min: 0,
          token_threshold_max: 272000,
          input_tokens_1k: '0.005000',
          output_tokens_1k: '0.030000',
          cache_read_1k: '0.000500',
          cache_write_1k: null,
        },
        {
          provider: 'openai',
          model_name: 'gpt-5.5',
          pricing_profile: 'extended',
          token_threshold_min: 272001,
          token_threshold_max: null,
          input_tokens_1k: '0.010000',
          output_tokens_1k: '0.045000',
          cache_read_1k: '0.001000',
          cache_write_1k: null,
        },
      ])

      const usage = {
        input: 271001,
        output: 1000,
        cacheRead: 1000,
        cacheWrite: 0,
        totalTokens: 273001,
      }
      const result = await service.calculateTextCredits(usage, 'openai/gpt-5.5')

      expect(result.pricingTier?.pricingProfile).toBe('extended')
      expect(result.pricingTier?.inputSideTokens).toBe(272001)
      expect(result.breakdown.inputCost).toBeCloseTo(2.71001)
      expect(result.breakdown.outputCost).toBeCloseTo(0.045)
      expect(result.breakdown.cacheReadCost).toBeCloseTo(0.001)
    })

    it('should keep precomputed cost ahead of DB pricing tiers', async () => {
      mockTierPricing([
        {
          provider: 'openai',
          model_name: 'gpt-5.5',
          pricing_profile: 'extended',
          token_threshold_min: 272001,
          token_threshold_max: null,
          input_tokens_1k: '0.010000',
          output_tokens_1k: '0.045000',
          cache_read_1k: '0.001000',
          cache_write_1k: null,
        },
      ])

      const usage = {
        input: 500000,
        output: 1000,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 501000,
      }
      const result = await service.calculateTextCredits(usage, 'openai/gpt-5.5', 0.25)

      expect(result.apiCost).toBe(0.25)
      expect(result.pricingTier?.source).toBe('precomputed')
    })
  })

  describe('calculateImageCredits', () => {
    it('should return credits for image generation', async () => {
      mockSbChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await service.calculateImageCredits()
      expect(result.credits).toBeGreaterThanOrEqual(1)
      expect(result.apiCost).toBeGreaterThan(0)
    })
  })

  describe('calculateTranscribeCredits', () => {
    it('should calculate based on duration', async () => {
      mockSbChain.single.mockResolvedValueOnce({ data: null, error: null })

      const result = await service.calculateTranscribeCredits(5)
      expect(result.credits).toBeGreaterThanOrEqual(1)
      expect(result.apiCost).toBeGreaterThan(0)
    })
  })

  describe('getUsageFromTranscript', () => {
    it('should return null when sessions.json does not exist', async () => {
      const result = await service.getUsageFromTranscript('test-session')
      expect(result).toBeNull()
    })
  })

  describe('stacked base allowance', () => {
    it('returns $10 value for the free base allowance', () => {
      expect((service as any).getStackedBaseAllowance(null)).toBe(2000)
      expect((service as any).getStackedBaseAllowance({ slug: 'free', base_credits: 2000 })).toBe(
        2000,
      )
    })

    it('stacks paid plan credits on top of the $10 free value', () => {
      expect(
        (service as any).getStackedBaseAllowance({
          slug: 'early-access-monthly',
          base_credits: 19400,
        }),
      ).toBe(21400)
    })
  })
})
