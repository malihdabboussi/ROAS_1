import { describe, expect, it } from 'vitest'
import {
  ACTION_CONTRACT_PROTOCOL_HEADING,
  PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING,
} from '@vibey/agent-policy'
import { MissionAgentTemplateService } from './mission-agent-template.service'

function makeService(): MissionAgentTemplateService {
  return new MissionAgentTemplateService({} as never)
}

describe('MissionAgentTemplateService.ensureDynamicAgentDefinitionPack', () => {
  it('injects the protocol when TOOLS.md is missing (uses DEFAULT_TOOLS_MD)', async () => {
    const service = makeService()

    const result = await service.ensureDynamicAgentDefinitionPack(
      [],
      'TestAgent',
      'marketing',
      'mid',
    )

    const tools = result.find((d) => d.file_name === 'TOOLS.md')
    expect(tools).toBeDefined()
    expect(tools!.content.startsWith('# TOOLS.md')).toBe(true)
    expect(tools!.content).toContain(ACTION_CONTRACT_PROTOCOL_HEADING)
    expect(tools!.content.indexOf(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)).toBeLessThan(
      tools!.content.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING),
    )
  })

  it('injects runtime guidance and protocol when TOOLS.md is provided without them', async () => {
    const service = makeService()
    const provided = '# TOOLS.md — Custom\n\nSome custom tools content.\n'

    const result = await service.ensureDynamicAgentDefinitionPack(
      [{ file_name: 'TOOLS.md', content: provided }],
      'TestAgent',
      'marketing',
      'mid',
    )

    const tools = result.find((d) => d.file_name === 'TOOLS.md')
    expect(tools).toBeDefined()
    expect(tools!.content.startsWith('# TOOLS.md — Custom')).toBe(true)
    expect(tools!.content).toContain(ACTION_CONTRACT_PROTOCOL_HEADING)
    expect(tools!.content).toContain('Some custom tools content.')
    expect(tools!.content.indexOf(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)).toBeLessThan(
      tools!.content.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING),
    )
  })

  it('normalizes old protocol-first TOOLS.md content without duplicating the protocol', async () => {
    const service = makeService()
    const provided = `${ACTION_CONTRACT_PROTOCOL_HEADING}\n\nalready here\n\n# TOOLS.md — Custom\n`

    const result = await service.ensureDynamicAgentDefinitionPack(
      [{ file_name: 'TOOLS.md', content: provided }],
      'TestAgent',
      'marketing',
      'mid',
    )

    const tools = result.find((d) => d.file_name === 'TOOLS.md')
    expect(tools).toBeDefined()
    const occurrences = tools!.content.split(ACTION_CONTRACT_PROTOCOL_HEADING).length - 1
    expect(tools!.content.startsWith('# TOOLS.md — Custom')).toBe(true)
    expect(occurrences).toBe(1)
  })
})
