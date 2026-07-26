import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('model strategy capability migration', () => {
  const migration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260726230500_model_strategy_capabilities.sql',
    ),
    'utf8',
  )

  it('seeds every newly routed model with its supported context tiers', () => {
    expect(migration).toContain("'anthropic', 'claude-opus-5'")
    expect(migration).toContain("'anthropic', 'claude-sonnet-5'")
    expect(migration).toContain("'openai', 'gpt-5.6-sol'")
    expect(migration).toContain("'openai', 'gpt-5.6-terra'")
    expect(migration).toContain('"tokens":300000')
    expect(migration).toContain('"tokens":272000')
  })

  it('keeps model capability upserts safe to rerun', () => {
    expect(migration).toMatch(/on conflict \(provider, model_name\) do update/i)
    expect(migration).toMatch(/capability_profile = excluded\.capability_profile/i)
    expect(migration).toMatch(/raw_openrouter = excluded\.raw_openrouter/i)
  })
})
