import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK } from '../../../../../../packages/agent-policy/src/platform-tools-template.js'

const repoRoot = resolve(__dirname, '../../../../../..')
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260726233000_roas_portal_public_language.sql'),
  'utf8',
)
const vibeySkill = readFileSync(
  resolve(repoRoot, 'docker/agents/vibey/skills/page-grader-operator/SKILL.md'),
  'utf8',
)
const atlasSkill = readFileSync(
  resolve(repoRoot, 'docker/agents/atlas/skills/page-grader-operator/SKILL.md'),
  'utf8',
)

describe('Pixel user-facing tool language', () => {
  it('keeps execution mechanics out of chat and uses product-facing names', () => {
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain('call Page Grader "The ROAS Portal"')
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'call the AI platform the "ROAS platform"',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Never expose the internal name "Page Grader", MCP, tool names, schemas',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Do not narrate tool selection or execution between tool calls',
    )
  })

  it('keeps Vibey and Atlas fulfillment output rules aligned', () => {
    for (const skill of [vibeySkill, atlasSkill]) {
      expect(skill).toContain('## User-facing response')
      expect(skill).toContain('call Page Grader "The ROAS Portal"')
      expect(skill).toContain('call the AI')
      expect(skill).toContain('platform the "ROAS platform"')
      expect(skill).toContain('one concise result')
      expect(skill).toContain('one plain-language blocker')
    }
  })

  it('persists the global policy and both system skills', () => {
    expect(migration).toContain("agent_key = 'vibey'")
    expect(migration).toContain("agent_key IN ('vibey', 'atlas')")
    expect(migration).toContain('call Page Grader "The ROAS Portal"')
    expect(migration).toContain(
      "RAISE EXCEPTION 'The ROAS Portal user-facing policy was not persisted'",
    )
    expect(migration).toContain(
      "RAISE EXCEPTION 'The ROAS Portal skill vocabulary was not persisted'",
    )
  })
})
