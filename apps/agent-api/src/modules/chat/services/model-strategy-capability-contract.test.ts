import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  resolveChatStageModel,
  resolveModelForStrategy,
  type ModelStrategy,
  type TaskType,
} from '@vibey/api-shared'

describe('model strategy capability migration', () => {
  const seedMigration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260726230500_model_strategy_capabilities.sql',
    ),
    'utf8',
  )
  const tierMigration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260728204000_align_model_strategy_context_tiers.sql',
    ),
    'utf8',
  )
  const costRoutingTierMigration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260729133500_align_cost_routing_context_tiers.sql',
    ),
    'utf8',
  )
  const supportedTiers: Record<string, number[]> = {
    'anthropic/claude-opus-5': [64_000, 128_000, 300_000, 1_000_000],
    'anthropic/claude-fable-5': [64_000, 128_000, 300_000, 1_000_000],
    'anthropic/claude-sonnet-4.6': [64_000, 300_000, 1_000_000],
    'openai/gpt-5.6-terra': [128_000, 272_000, 1_050_000],
  }
  const strategies: ModelStrategy[] = ['auto', 'auto:economy', 'auto:power']
  const tasks: TaskType[] = [
    'chat',
    'mission_plan',
    'mission_execute',
    'mission_review',
    'mission_awareness',
    'mission_quality_eval',
  ]

  it('seeds every newly routed model with its supported context tiers', () => {
    expect(seedMigration).toContain("'anthropic', 'claude-opus-5'")
    expect(seedMigration).toContain("'anthropic', 'claude-sonnet-5'")
    expect(seedMigration).toContain("'openai', 'gpt-5.6-sol'")
    expect(seedMigration).toContain("'openai', 'gpt-5.6-terra'")
    expect(tierMigration).toContain(
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]',
    )
    expect(tierMigration).toContain(
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":128000,"label":"128K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]',
    )
    expect(tierMigration).toContain(
      '[{"tokens":128000,"label":"128K","pricingProfile":"standard"},{"tokens":272000,"label":"272K","pricingProfile":"standard"},{"tokens":1050000,"label":"1.05M","pricingProfile":"extended"}]',
    )
    expect(costRoutingTierMigration).toContain("'claude-sonnet-4.6'")
    expect(costRoutingTierMigration).toContain(
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]',
    )
    expect(costRoutingTierMigration).toContain(
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":128000,"label":"128K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]',
    )
  })

  it('keeps model capability upserts safe to rerun', () => {
    expect(seedMigration).toMatch(/on conflict \(provider, model_name\) do update/i)
    expect(seedMigration).toMatch(/capability_profile = excluded\.capability_profile/i)
    expect(seedMigration).toMatch(/raw_openrouter = excluded\.raw_openrouter/i)
    expect(tierMigration).toMatch(/update public\.llm_model_capabilities/i)
    expect(tierMigration).toMatch(/jsonb_set\(/i)
    expect(costRoutingTierMigration).toMatch(/update public\.llm_model_capabilities/i)
    expect(costRoutingTierMigration).toMatch(/jsonb_set\(/i)
  })

  it('accepts every context tier emitted by full-task and staged chat routing', () => {
    const routes = strategies.flatMap((strategy) => [
      ...tasks.map((task) => resolveModelForStrategy(strategy, task)),
      resolveChatStageModel(strategy, 'research'),
      resolveChatStageModel(strategy, 'write'),
    ])

    for (const route of routes) {
      const requestedTier = route.modelSettings?.context_window_tokens
      if (requestedTier === undefined) continue
      expect(
        supportedTiers[route.modelId],
        `${route.modelId} is missing a capability tier contract`,
      ).toBeDefined()
      expect(
        supportedTiers[route.modelId],
        `${route.modelId} does not allow routed context tier ${requestedTier}`,
      ).toContain(requestedTier)
    }
  })
})
