import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ALL_CAPABILITY_KINDS, isCapabilityKind } from '../types'

const EXPECTED_KINDS = [
  'integration',
  'brain_domain',
  'brain_access',
  'campaign_context',
  'space_context',
  'channel',
  'mission_type',
  'skill',
  'action_domain',
] as const

describe('AgentCapabilityKind action_domain support', () => {
  it('accepts action_domain alongside existing capability kinds', () => {
    expect(ALL_CAPABILITY_KINDS).toEqual(EXPECTED_KINDS)
    expect(isCapabilityKind('action_domain')).toBe(true)
  })

  it('keeps invalid capability kinds rejected', () => {
    expect(isCapabilityKind('not_a_kind')).toBe(false)
  })

  it('has a migration that extends both capability_kind constraints', () => {
    const candidates = [
      fileURLToPath(new URL('../../../../../../supabase/migrations/', import.meta.url)),
      resolve(process.cwd(), 'supabase/migrations'),
      resolve(process.cwd(), '../../supabase/migrations'),
    ].filter((candidate) => existsSync(candidate))

    const sql = candidates
      .flatMap((migrationsDir) =>
        readdirSync(migrationsDir)
          .filter((name) => name.endsWith('_capability_kind_space_context.sql'))
          .map((name) => readFileSync(resolve(migrationsDir, name), 'utf8')),
      )
      .find((migrationSql) => migrationSql.includes('space_context'))

    expect(sql).toBeDefined()
    expect(sql!).toContain('agent_team_grants_capability_kind_check')
    expect(sql!).toContain('agent_overrides_capability_kind_check')

    for (const kind of EXPECTED_KINDS) {
      expect(sql!).toContain(`'${kind}'::text`)
    }
  })
})
