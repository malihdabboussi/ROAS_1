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
  it('routes multi-task Slack fulfillment through one Portal confirm link', () => {
    for (const skill of [vibeySkill, atlasSkill]) {
      expect(skill).toContain('page_grader_create_delegation_preview')
      expect(skill).toContain('confirm_url')
      expect(skill).toMatch(/[Dd]o \*\*not\*\* loop `page_grader_create_fulfillment_request`/)
    }
  })

  it('keeps named funnel owners inside Page Grader fulfillment', () => {
    expect(vibeySkill).toMatch(/use\s+Page Grader MCP even when the user names the human owner/)
    expect(vibeySkill).toContain('pass the canonical name in `assignee_name`')
    expect(vibeySkill).toContain('Do not use `list_team`, `list_campaign_team`')
    expect(vibeySkill).toContain('page_grader_create_fulfillment_request')
    expect(vibeySkill).toContain('assignee_name:"Rafay"')
  })

  it('routes all Service Request types through Portal draft intake', () => {
    for (const skill of [vibeySkill, atlasSkill]) {
      expect(skill).toContain('design, copy, funnel')
      expect(skill).toContain('task_type')
      expect(skill).toContain('video')
      expect(skill).toContain('Never use native `create_task`')
      expect(skill).toContain('resolved client name')
      expect(skill).toContain('review_url')
      expect(skill).toContain('openable')
      expect(skill).toContain('Created:')
      expect(skill).toContain('page_grader_create_campaign_draft')
      expect(skill).toContain('create_campaign')
      expect(skill).toMatch(/Missing VSL[\s\S]*not create-blockers/)
    }
  })

  it('gives Atlas the same specialized fulfillment boundary', () => {
    expect(atlasSkill).toContain('when the user says "task" or names a human owner')
    expect(atlasSkill).toContain('Page Grader assignee')
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

  it('persists portal campaign create fallback on both agents', () => {
    const campaignMigration = readFileSync(
      resolve(repoRoot, 'supabase/migrations/20260818173000_portal_campaign_create_fallback.sql'),
      'utf8',
    )
    expect(campaignMigration).toContain('## Portal campaign create')
    expect(campaignMigration).toContain('Missing VSL, landing page, or creative assets')
    expect(campaignMigration).toContain('native `create_campaign`')
    expect(campaignMigration).toContain("file_name = 'TOOLS.md'")
    expect(campaignMigration).toContain(
      "RAISE EXCEPTION 'Portal campaign create fallback was not persisted for both agents'",
    )
  })

  it('persists all-types Service Request intake on both agents', () => {
    const allTypesMigration = readFileSync(
      resolve(repoRoot, 'supabase/migrations/20260816224000_service_request_all_types_intake.sql'),
      'utf8',
    )
    expect(allTypesMigration).toContain('## Service Request intake (all types)')
    expect(allTypesMigration).toContain('design, copy, funnel')
    expect(allTypesMigration).toContain('Never reply with a bare "Created:')
    expect(allTypesMigration).toContain("file_name = 'TOOLS.md'")
    expect(allTypesMigration).toContain(
      "RAISE EXCEPTION 'Service Request all-types intake was not persisted for both agents'",
    )
  })

  it('persists campaign batch delegation preview on both agents', () => {
    const previewMigration = readFileSync(
      resolve(repoRoot, 'supabase/migrations/20260819020000_campaign_delegation_preview.sql'),
      'utf8',
    )
    expect(previewMigration).toContain('## Campaign batch delegation preview')
    expect(previewMigration).toContain('page_grader_create_delegation_preview')
    expect(previewMigration).toContain('confirm_url')
    expect(previewMigration).toContain("file_name = 'TOOLS.md'")
    expect(previewMigration).toContain(
      "RAISE EXCEPTION 'Campaign batch delegation preview was not persisted for both agents'",
    )
  })
})
