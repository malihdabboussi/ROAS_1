import { describe, expect, it } from 'vitest'
import { AgentsModule } from '../../agents.module'
import { AgentConfigController } from '../agent-config.controller'
import { AgentSkillsController } from '../agent-skills.controller'
import { AgentsController } from '../agents.controller'

function methodIndex(controller: Function, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('AgentsController route order', () => {
  it('keeps static collection routes before agent-key routes', () => {
    const controllers = Reflect.getMetadata('controllers', AgentsModule) as Function[]
    expect(methodIndex(AgentsController, 'listSkillsForAgents')).toBeGreaterThan(-1)
    expect(methodIndex(AgentsController, 'listReadyEmployeeLibrary')).toBeGreaterThan(-1)
    expect(methodIndex(AgentConfigController, 'updateAgentUserState')).toBeGreaterThan(-1)
    expect(methodIndex(AgentSkillsController, 'listAgentSkills')).toBeGreaterThan(-1)
    expect(controllers.indexOf(AgentsController)).toBeLessThan(
      controllers.indexOf(AgentSkillsController),
    )
    expect(controllers.indexOf(AgentsController)).toBeLessThan(
      controllers.indexOf(AgentConfigController),
    )
  })
})
