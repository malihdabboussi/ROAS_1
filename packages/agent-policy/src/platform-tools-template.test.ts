import { describe, expect, it } from 'vitest'
import { ACTION_CONTRACT_PROTOCOL_HEADING } from './action-contract-protocol.js'
import {
  ensurePlatformToolsRuntimeGuidance,
  hasPlatformToolsRuntimeGuidance,
  PLATFORM_TOOLS_DEFAULT_MD,
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
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Connected MCP service such as Page Grader →')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('Do not route an MCP service through')
    expect(PLATFORM_TOOLS_DEFAULT_MD).toContain('until the tool result confirms the effect')
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
})
