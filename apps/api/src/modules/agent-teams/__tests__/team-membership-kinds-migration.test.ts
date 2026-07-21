import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  '../../supabase/migrations/20260721010000_team_membership_kinds.sql',
)

function migrationSql(): string {
  return readFileSync(migrationPath, 'utf8')
}

describe('team membership kinds migration', () => {
  it('creates the three canonical organization teams', () => {
    const sql = migrationSql()

    expect(sql).toMatch(/'Internal'[\s\S]*'internal'/)
    expect(sql).toMatch(/'External'[\s\S]*'external'/)
    expect(sql).toMatch(/'Agency Agents'[\s\S]*'agent'/)
  })

  it('assigns the complete agency agent roster', () => {
    const sql = migrationSql()

    for (const agentKey of ['vibey', 'atlas', 'reed', 'blaze', 'ivy', 'lux', 'jaime']) {
      expect(sql).toContain(`'${agentKey}'`)
    }
    expect(sql).toMatch(/trg_assign_required_agency_agent_team/i)
  })

  it('keeps internal and external membership synchronized', () => {
    const sql = migrationSql()

    expect(sql).toMatch(/trg_sync_canonical_internal_team_member/i)
    expect(sql).toMatch(/trg_sync_canonical_external_team_member/i)
    expect(sql).toMatch(/agent_team_external_members/i)
  })
})
