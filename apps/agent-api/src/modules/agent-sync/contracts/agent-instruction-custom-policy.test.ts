import { describe, expect, it } from 'vitest'
import { PLATFORM_TOOLS_DEFAULT_MD } from '@vibey/agent-policy'
import { classifyAgentInstructionCustomRow } from './agent-instruction-custom-policy'

describe('agent instruction custom policy', () => {
  it('allows generated placeholder TOOLS.md rows to be repaired', () => {
    const result = classifyAgentInstructionCustomRow({
      content: '# TOOLS.md\n\nUse tools.',
      source: 'custom',
    })

    expect(result.classification).toBe('generated_placeholder')
    expect(result.autoRepairAllowed).toBe(true)
  })

  it('allows platform template copies to be repaired', () => {
    const result = classifyAgentInstructionCustomRow({
      content: PLATFORM_TOOLS_DEFAULT_MD,
      source: 'custom',
    })

    expect(result.classification).toBe('platform_template_copy')
    expect(result.autoRepairAllowed).toBe(true)
  })

  it('preserves user-authored custom rows', () => {
    const result = classifyAgentInstructionCustomRow({
      content: '# TOOLS.md\n\nAlways use my private launch checklist before touching ads.',
      source: 'custom',
      userId: 'user-1',
    })

    expect(result.classification).toBe('user_authored_custom')
    expect(result.autoRepairAllowed).toBe(false)
  })

  it('preserves org overrides', () => {
    const result = classifyAgentInstructionCustomRow({
      content: '# TOOLS.md\n\nOrg publishing rules live in our approval SOP.',
      source: 'custom',
      orgId: 'org-1',
    })

    expect(result.classification).toBe('org_override')
    expect(result.autoRepairAllowed).toBe(false)
  })
})
