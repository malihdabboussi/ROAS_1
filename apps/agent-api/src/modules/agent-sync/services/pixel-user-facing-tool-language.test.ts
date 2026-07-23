import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK } from '../../../../../../packages/agent-policy/src/platform-tools-template.js'

const repoRoot = resolve(__dirname, '../../../../../..')
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260723160000_hide_pixel_tool_execution_language.sql'),
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
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain('call Page Grader the "ROAS portal"')
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'call the AI platform the "ROAS platform"',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Never expose MCP, tool names, schemas, idempotency keys, routing, retries',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Do not narrate tool selection or execution between tool calls',
    )
  })

  it('keeps Vibey and Atlas fulfillment output rules aligned', () => {
    for (const skill of [vibeySkill, atlasSkill]) {
      expect(skill).toContain('## User-facing response')
      expect(skill).toContain('call Page Grader the "ROAS portal"')
      expect(skill).toContain('call the AI')
      expect(skill).toContain('platform the "ROAS platform"')
      expect(skill).toContain('one concise result')
      expect(skill).toContain('one plain-language blocker')
    }
  })

  it('persists the global policy and both system skills', () => {
    expect(migration).toContain("agent_key = 'vibey'")
    expect(migration).toContain("agent_key IN ('vibey', 'atlas')")
    expect(migration).toContain('call Page Grader the "ROAS portal"')
    expect(migration).toContain('Do not narrate tool selection or execution between tool calls')
    expect(migration).toContain(
      "RAISE EXCEPTION 'Pixel user-facing response policy was not persisted'",
    )
    expect(migration).toContain(
      "RAISE EXCEPTION 'ROAS portal user-facing vocabulary was not persisted'",
    )
  })
})
