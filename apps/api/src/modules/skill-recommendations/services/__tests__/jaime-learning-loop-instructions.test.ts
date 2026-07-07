import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readHrArtifact(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), '../../docker/agents/hr', relativePath), 'utf8')
}

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), '../..', relativePath), 'utf8')
}

describe('Jaime learning-loop instructions', () => {
  it('keeps Jaime responsible only for skills and agent files', () => {
    const role = readHrArtifact('ROLE.md')

    expect(role).toContain('Agent Learning Loop')
    expect(role).toContain('Jaime can propose improvements only for skills and agent files')
    expect(role).toContain('System-owned agents and official skills route to internal Vibey review')
    expect(role).toContain('Platform-owned tool schemas route to product fix proposals')
  })

  it('requires context-engineered skill proposals before Jaime suggests skill changes', () => {
    const migration = readWorkspaceFile(
      'supabase/migrations/20260624160952_hr_agent_learning_loop_readiness.sql',
    )

    expect(migration).toContain('Learning-Loop Skill Proposals')
    expect(migration).toContain('Explain why the current skill is failing or missing')
    expect(migration).toContain('Include 2-3 concrete examples from the stable pattern')
    expect(migration).toContain('Patch one pending proposal for the same agent and skill')
  })

  it('requires scoped agent-file proposals for ROLE, IDENTITY, and SOUL updates', () => {
    const migration = readWorkspaceFile(
      'supabase/migrations/20260624160952_hr_agent_learning_loop_readiness.sql',
    )

    expect(migration).toContain('Learning-Loop Agent File Updates')
    expect(migration).toContain(
      'ROLE.md for responsibilities, boundaries, authority, or success metrics',
    )
    expect(migration).toContain(
      'IDENTITY.md for name, role archetype, communication style, or examples',
    )
    expect(migration).toContain('SOUL.md for worldview, values, personality, or behavioral posture')
  })
})
