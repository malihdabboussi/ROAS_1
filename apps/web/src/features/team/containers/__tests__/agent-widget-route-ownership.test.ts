import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../../../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('agent widget route ownership', () => {
  it('uses /api/agents for widget get/update callers', () => {
    const agentWidgetSection = read('src/features/team/containers/AgentWidgetSection.tsx')
    const widgetBuilderModal = read('src/features/team/containers/WidgetBuilderModal.tsx')

    expect(agentWidgetSection).toContain('/api/agents/${agent.agent_key}/widget')
    expect(widgetBuilderModal).toContain('/api/agents/${agent.agent_key}/widget')
    expect(agentWidgetSection).not.toContain('/api/missions/agents/${agent.agent_key}/widget')
    expect(widgetBuilderModal).not.toContain('/api/missions/agents/${agent.agent_key}/widget')
  })

  it('uses /api/agents for public-page toggles', () => {
    const teamContainer = read('src/features/team-2/containers/Team2Container.tsx')

    expect(teamContainer).toContain('/api/agents/${agentKey}/public-page')
    expect(teamContainer).not.toContain('/api/missions/agents/${agentKey}/public-page')
  })
})
