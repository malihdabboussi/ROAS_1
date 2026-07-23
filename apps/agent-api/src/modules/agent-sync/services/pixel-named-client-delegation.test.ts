import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK } from '../../../../../../packages/agent-policy/src/platform-tools-template.js'

const repoRoot = resolve(__dirname, '../../../../../..')
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260723153000_fix_pixel_named_client_delegation.sql'),
  'utf8',
)
const channelIdentityMigration = readFileSync(
  resolve(
    repoRoot,
    'supabase/migrations/20260723163000_fix_pixel_slack_channel_identity_routing.sql',
  ),
  'utf8',
)
const vibeySkill = readFileSync(
  resolve(repoRoot, 'docker/agents/vibey/skills/page-grader-operator/SKILL.md'),
  'utf8',
)

describe('Pixel named-client delegation', () => {
  it('defaults bare names to human assignment without ambient-team preflight', () => {
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'A bare person name defaults to a human',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      '`assignee_type:"human"` and `assignee_name`',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Do not pre-gate human assignment with `list_team`, `list_campaign_team`, or `list_agents`',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain('ask one focused clarification')
  })

  it('resolves a named client beyond the ambient campaign', () => {
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'A named client or campaign overrides ambient campaign context',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'campaign Brain, Page Grader, and relevant Slack channel or Space evidence',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Do not limit the search to the campaign attached to the current chat',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Treat an explicit Slack channel mention or channel ID as authoritative',
    )
    expect(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK).toContain(
      'Never infer a different client from message content',
    )
    expect(vibeySkill).toContain('its own ROAS campaign Brain, Page Grader')
    expect(vibeySkill).toContain('matching Slack channel context Pixel can access')
    expect(vibeySkill).toContain(
      'Do not treat absence from the ambient chat campaign as absence from ROAS',
    )
    expect(vibeySkill).toContain('Do not silently replace it with a')
    expect(vibeySkill).toContain('generic ROAS task, a native funnel')
  })

  it('persists the routing contract into Pixel global tools and fails closed', () => {
    expect(migration).toContain("agent_key = 'vibey'")
    expect(migration).toContain("file_name = 'TOOLS.md'")
    expect(migration).toContain('A bare person name defaults to a human')
    expect(migration).toContain('A named client or campaign overrides ambient campaign context')
    expect(migration).toContain('campaign Brain, Page Grader, and relevant Slack channel')
    expect(migration).toContain('## Named-client context precedence')
    expect(migration).toContain('Page Grader named-client source precedence was not persisted')
    expect(migration).toContain(
      "RAISE EXCEPTION 'Pixel named-client delegation guidance was not persisted'",
    )
    expect(channelIdentityMigration).toContain(
      'Treat an explicit Slack channel mention or channel ID as authoritative',
    )
    expect(channelIdentityMigration).toContain(
      'Never infer a different client from message content',
    )
    expect(channelIdentityMigration).toContain('If ROAS portal fulfillment fails, stop')
    expect(channelIdentityMigration).toContain(
      "RAISE EXCEPTION 'Pixel canonical Slack channel routing policy was not persisted'",
    )
  })
})
