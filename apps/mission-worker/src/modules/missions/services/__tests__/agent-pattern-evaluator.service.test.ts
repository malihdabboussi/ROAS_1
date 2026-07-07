import { describe, expect, it, vi } from 'vitest'
import { AgentPatternEvaluator } from '../agent-pattern-evaluator.service'

function createSupabaseWithProfile(lastEvalAt: string | null) {
  const inProgressQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
  }
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: lastEvalAt ? { last_ceo_eval_at: lastEvalAt } : { last_ceo_eval_at: null },
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'agent_awareness_sessions') return inProgressQuery
      if (table === 'profiles') return profileQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

function createDatabaseMock(supabase?: ReturnType<typeof createSupabaseWithProfile>) {
  return {
    getClient: supabase ? vi.fn().mockReturnValue(supabase) : vi.fn(),
    hasPgPool: vi.fn().mockReturnValue(true),
    pgQuery: vi.fn().mockResolvedValue({ rows: [{ remaining: '100' }] }),
  } as any
}

describe('AgentPatternEvaluator', () => {
  it('returns false immediately for users in scheduler skip set', async () => {
    const db = createDatabaseMock()
    const signal = { checkSyntheticSignals: vi.fn(), getAccumulatedWeight: vi.fn() } as any
    const service = new AgentPatternEvaluator(db, signal)

    const result = await service.shouldFireForUser('u1', new Set(['u1']))

    expect(result).toBe(false)
    expect(db.getClient).not.toHaveBeenCalled()
  })

  it('uses profile.last_ceo_eval_at as shared cooldown source', async () => {
    const nowIso = new Date().toISOString()
    const supabase = createSupabaseWithProfile(nowIso)
    const db = createDatabaseMock(supabase)
    const signal = { checkSyntheticSignals: vi.fn(), getAccumulatedWeight: vi.fn() } as any
    const service = new AgentPatternEvaluator(db, signal)

    const result = await service.shouldFireForUser('u1')

    expect(result).toBe(false)
    expect(signal.checkSyntheticSignals).not.toHaveBeenCalled()
  })

  it('fires when cooldown is clear and accumulated weight reaches threshold', async () => {
    const oldIso = new Date(Date.now() - 12 * 60 * 1000).toISOString()
    const supabase = createSupabaseWithProfile(oldIso)
    const db = createDatabaseMock(supabase)
    const signal = {
      checkSyntheticSignals: vi.fn().mockResolvedValue(undefined),
      getAccumulatedWeight: vi.fn().mockResolvedValue(4.2),
    } as any
    const service = new AgentPatternEvaluator(db, signal)

    const result = await service.shouldFireForUser('u1')

    expect(result).toBe(true)
    expect(signal.checkSyntheticSignals).toHaveBeenCalledWith('u1', undefined)
  })
})
