import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../../../../..')
const vibeySkill = readFileSync(
  resolve(repoRoot, 'docker/agents/vibey/skills/page-grader-operator/SKILL.md'),
  'utf8',
)
const atlasSkill = readFileSync(
  resolve(repoRoot, 'docker/agents/atlas/skills/page-grader-operator/SKILL.md'),
  'utf8',
)
const migration = readFileSync(
  resolve(
    repoRoot,
    'supabase/migrations/20260723150500_fix_page_grader_human_fulfillment_routing.sql',
  ),
  'utf8',
)

describe('Page Grader human fulfillment routing', () => {
  it('keeps named funnel owners inside Page Grader fulfillment', () => {
    expect(vibeySkill).toMatch(/use Page\s+Grader MCP even when the user names the human owner/)
    expect(vibeySkill).toContain('pass the canonical name in `assignee_name`')
    expect(vibeySkill).toContain('Do not use `list_team`, `list_campaign_team`')
    expect(vibeySkill).toContain('page_grader_create_fulfillment_request')
    expect(vibeySkill).toContain('assignee_name:"Rafay"')
  })

  it('gives Atlas the same specialized fulfillment boundary', () => {
    expect(atlasSkill).toContain('even when a human owner')
    expect(atlasSkill).toContain('the Page Grader assignee')
    expect(atlasSkill).toContain('page_grader_create_fulfillment_request')
  })

  it('persists both system skills and fails closed if the contract is missing', () => {
    expect(migration).toContain("agent_key = 'vibey'")
    expect(migration).toContain("agent_key = 'atlas'")
    expect(migration).toContain('page_grader_create_fulfillment_request')
    expect(migration).toContain('assignee_name:"Rafay"')
    expect(migration).toContain("RAISE EXCEPTION 'Vibey Page Grader human fulfillment routing")
    expect(migration).toContain("RAISE EXCEPTION 'Atlas Page Grader human fulfillment routing")
  })
})
