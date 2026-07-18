import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

const MIGRATION_NAME = '20260718055800_premium_funnel_site_design_workflow.sql'

function readMigration(): string {
  return fs.readFileSync(
    path.join(process.cwd(), '..', '..', 'supabase', 'migrations', MIGRATION_NAME),
    'utf8',
  )
}

describe('premium funnel and site design skill migration', () => {
  it('seeds one canonical design skill and retires the overlapping legacy skill', () => {
    const migration = readMigration()

    expect(migration).toContain("'funnel-site-design'")
    expect(migration).toContain("VALUES ('designer', 'funnel-site-design', true)")
    expect(migration).toContain("skill_key = 'funnel-page-design'")
    expect(migration).toContain('DELETE FROM public.template_skill_assignments')
  })

  it('trains current builder templates for future hires while preserving user-authored skill copies', () => {
    const migration = readMigration()

    expect(migration).toContain('SELECT DISTINCT assignment.template_key')
    expect(migration).toContain("assignment.skill_key IN ('funnel-builder', 'website-builder')")
    expect(migration).toContain('SELECT DISTINCT org_id, agent_key\n  FROM public.agents_registry')
    expect(migration).toContain('SELECT DISTINCT user_id, agent_key\n  FROM public.agents_registry')
    expect(migration).toContain("existing.source IN ('template', 'system', 'default')")
    expect(migration).toContain("AND source IN ('template', 'system', 'default')")
  })

  it('requires a design contract, mobile and desktop review, and a revision pass', () => {
    const migration = readMigration()

    expect(migration).toContain('Design Contract')
    expect(migration).toContain('1440')
    expect(migration).toContain('390')
    expect(migration).toContain('fresh-context critique')
    expect(migration).toContain('Revise the implementation after critique')
  })

  it('separates approved decisions from proposals and keeps the handoff scannable', () => {
    const migration = readMigration()

    expect(migration).toContain('Confirmed, Proposed, or Missing')
    expect(migration).toContain('fallback font')
    expect(migration).toContain('scan the contract in under five minutes')
    expect(migration).toContain('relational layout guidance')
  })

  it('removes effect-counting and fabricated conversion mechanics from both builders', () => {
    const migration = readMigration()

    expect(migration).toContain("skill_key IN ('funnel-builder', 'website-builder')")
    expect(migration).toContain('Do not invent urgency, scarcity, testimonials, or statistics')
    expect(migration).toContain('No effect count is a quality requirement')
  })

  it('pins designer work to Opus 4.8 without changing the default builder model', () => {
    const migration = readMigration()

    expect(migration).toContain("registry.agent_key IN ('designer', 'lux')")
    expect(migration).toContain('anthropic/claude-opus-4.8')
    expect(migration).not.toContain("'{model_id}', 'auto:power'")
  })
})
