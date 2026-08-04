import { describe, expect, it } from 'vitest'
import { ACTION_CONTRACT_PROTOCOL_HEADING } from './action-contract-protocol.js'
import {
  ensurePlatformToolsRuntimeGuidance,
  hasPlatformToolsRuntimeGuidance,
  PLATFORM_TOOLS_CHANNEL_FORMATTING_HEADING,
  PLATFORM_TOOLS_DEFAULT_MD,
  PLATFORM_TOOLS_DELEGATION_GUIDANCE_HEADING,
  PLATFORM_TOOLS_MEDIA_ROUTING_HEADING,
  PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING,
} from './platform-tools-template.js'

describe('platform tools template', () => {
  it('explains the runtime layers with user benefit', () => {
    expect(PLATFORM_TOOLS_DEFAULT_MD.startsWith('# TOOLS.md')).toBe(true)
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Runtime Operating Layers')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('help the user get faster, more accurate work')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Do not guess when the platform can know')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Vibey is data-driven')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('skills/vibey-api/SKILL.md')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('skills/{skill-key}/SKILL.md')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('call, meeting, recording, or transcript retrieval')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('meeting transcript Fathom Zoom Fireflies')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Do not ask the user to paste a transcript')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('checked call transcripts')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Human teammate →')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Managed AI agent →')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('A bare person name defaults to a human')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Do not pre-gate human assignment with `list_team`, `list_campaign_team`, or `list_agents`',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'A named client or campaign overrides ambient campaign context',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'campaign Brain, Page Grader, and relevant Slack channel',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Treat an explicit Slack channel mention or channel ID as authoritative',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Never infer a different client from message content',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'A partial search with zero matches is not evidence that the message is absent',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'retry with a narrower channel query or broader terms',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Connected MCP service such as Page Grader →')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'A funnel, landing page, campaign page, or related fulfillment deliverable',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'routes to the Page Grader MCP even when the user names the human owner',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Put that person in the Page Grader request')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'do not replace Page Grader fulfillment with `create_task`, `list_team`, `list_campaign_team`',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Resolve the client and assignee through Page Grader',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Do not require the user to know or say "Page Grader"',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'resolve or confirm the client and campaign before creating Page Grader work',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'ask only for missing details that block a safe draft',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Do not route an MCP service through')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('until the tool result confirms the effect')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'In user-facing replies, call Page Grader "The ROAS Portal"',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('call the AI platform the "ROAS platform"')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Never expose the internal name "Page Grader", MCP, tool names, schemas',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Do not narrate tool selection or execution between tool calls',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('return one concise result after the work finishes')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(PLATFORM_TOOLS_CHANNEL_FORMATTING_HEADING)
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Slack does not reliably render Markdown tables')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Date — Spend: $328')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(PLATFORM_TOOLS_MEDIA_ROUTING_HEADING)
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'call `generate_image` with that attachment URL as `input_image_url`',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Do not invent a separate consent requirement')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'Do not search for or require an external OpenAI or ChatGPT integration',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain(
      'When a video skill explicitly routes the work to Higgsfield',
    )
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('`list_mcp_tools` and `use_mcp_tool`')
    expect(PLATFORM_TOOLS_DEFAULT_MD).not.toContain('**State**')
    expect(PLATFORM_TOOLS_DEFAULT_MD.indexOf(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)).toBeLessThan(
      PLATFORM_TOOLS_DEFAULT_MD.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING),
    )
  })

  it('adds runtime guidance to existing tools content once', () => {
    const first = ensurePlatformToolsRuntimeGuidance('# TOOLS.md\n\nUse tools.')
    const second = ensurePlatformToolsRuntimeGuidance(first)

    expect(first.startsWith('# TOOLS.md')).toBe(true)
    expect(first).toContain('Backend Action Contract Protocol')
    expect(first).toContain('Runtime Operating Layers')
    expect(first.indexOf(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)).toBeLessThan(
      first.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING),
    )
    expect(hasPlatformToolsRuntimeGuidance(first)).toBe(true)
    expect(second).toBe(first)
  })

  it('normalizes old protocol-first content without dropping custom sections', () => {
    const oldContent = `${ACTION_CONTRACT_PROTOCOL_HEADING}\n\nOld protocol text.\n\n# TOOLS.md — Custom\n\n## Runtime Operating Layers\n\nUse \`skills/vibey-api/SKILL.md\` and \`skills/{skill-key}/SKILL.md\`.\n\n## Custom Rules\n\nKeep this section.`

    const repaired = ensurePlatformToolsRuntimeGuidance(oldContent)

    expect(repaired.startsWith('# TOOLS.md — Custom')).toBe(true)
    expect(repaired).toContain('## Custom Rules')
    expect(repaired).toContain('Keep this section.')
    expect(repaired.indexOf(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)).toBeLessThan(
      repaired.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING),
    )
    expect(repaired.split(ACTION_CONTRACT_PROTOCOL_HEADING)).toHaveLength(2)
  })

  it('upgrades existing runtime guidance with the data-grounding principle', () => {
    const oldContent = `# TOOLS.md

## Runtime Operating Layers

These layers exist to help the user get faster, more accurate work without repeating context or watching you stumble through avoidable tool errors.

Use them in this order:

1. **Platform context** — Use Space and Brain knowledge.
2. **Skills** — Use skills.
3. **Vibey API** — Use \`skills/vibey-api/SKILL.md\` and \`skills/{skill-key}/SKILL.md\`.`

    const repaired = ensurePlatformToolsRuntimeGuidance(oldContent)
    const second = ensurePlatformToolsRuntimeGuidance(repaired)

    expect(repaired).toContain('Do not guess when the platform can know')
    expect(repaired).toContain('Vibey is data-driven')
    expect(second).toBe(repaired)
  })

  it('adds current delegation guidance to an existing runtime policy', () => {
    const oldContent = `# TOOLS.md

## Runtime Operating Layers

These layers exist to help the user get faster, more accurate work without repeating context or watching you stumble through avoidable tool errors.

For multi-step work:
- Make a short plan.

For unclear, destructive, publish/send, or expensive actions:
- Ask a focused clarification.`

    const repaired = ensurePlatformToolsRuntimeGuidance(oldContent)
    const second = ensurePlatformToolsRuntimeGuidance(repaired)

    expect(repaired).toContain(PLATFORM_TOOLS_DELEGATION_GUIDANCE_HEADING)
    expect(repaired).toContain('A bare person name defaults to a human')
    expect(repaired).toContain('A named client or campaign overrides ambient campaign context')
    expect(repaired).toContain('campaign Brain, Page Grader, and relevant Slack channel')
    expect(repaired).toContain(
      'Treat an explicit Slack channel mention or channel ID as authoritative',
    )
    expect(repaired).toContain('call Page Grader "The ROAS Portal"')
    expect(repaired).toContain('Do not narrate tool selection or execution between tool calls')
    expect(repaired).toContain(PLATFORM_TOOLS_CHANNEL_FORMATTING_HEADING)
    expect(repaired).toContain('Slack does not reliably render Markdown tables')
    expect(repaired).toContain(PLATFORM_TOOLS_MEDIA_ROUTING_HEADING)
    expect(repaired).toContain('call `generate_image`')
    expect(repaired).toContain('Higgsfield')
    expect(repaired.split(PLATFORM_TOOLS_DELEGATION_GUIDANCE_HEADING)).toHaveLength(2)
    expect(repaired.split(PLATFORM_TOOLS_CHANNEL_FORMATTING_HEADING)).toHaveLength(2)
    expect(repaired.split(PLATFORM_TOOLS_MEDIA_ROUTING_HEADING)).toHaveLength(2)
    expect(second).toBe(repaired)
  })

  it('replaces stale delegation guidance without dropping adjacent custom content', () => {
    const oldContent = `# TOOLS.md

## Runtime Operating Layers

These layers exist to help the user get faster, more accurate work without repeating context or watching you stumble through avoidable tool errors.

For delegation and assignment:
- Search only the current campaign team.
- Substitute an available agent when the named person is missing.

For unclear, destructive, publish/send, or expensive actions:
- Ask a focused clarification.

## Custom Rules

Keep this.`

    const repaired = ensurePlatformToolsRuntimeGuidance(oldContent)

    expect(repaired).not.toContain('Search only the current campaign team')
    expect(repaired).not.toContain('Substitute an available agent')
    expect(repaired).toContain('A bare person name defaults to a human')
    expect(repaired).toContain('## Custom Rules')
    expect(repaired).toContain('Keep this.')
    expect(repaired.split(PLATFORM_TOOLS_DELEGATION_GUIDANCE_HEADING)).toHaveLength(2)
  })
})
