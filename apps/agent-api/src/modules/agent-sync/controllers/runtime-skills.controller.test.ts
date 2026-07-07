import { BadRequestException, NotFoundException } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { InternalAuthGuard } from '../../artifacts/guards/internal-auth.guard'
import { RuntimeSkillsController } from './runtime-skills.controller'

const USER_ID = '19847dc5-a29a-4684-87d0-4cf6560baa10'
const CONVERSATION_ID = '53f109e1-f8f8-4f3a-b9e2-b01fb4859f25'
const ORG_ID = '6b6812f5-2379-407d-98be-52adce99c554'

function makeController(result: unknown = { content: '# skill' }) {
  const skillScope = {
    resolveAgentArchetype: vi.fn().mockResolvedValue('creator'),
    readRuntimeSkill: vi.fn().mockResolvedValue(result),
  }
  return {
    controller: new RuntimeSkillsController(skillScope as never),
    skillScope,
  }
}

describe('RuntimeSkillsController', () => {
  it('requires internal auth guard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, RuntimeSkillsController) ?? []

    expect(guards).toEqual(expect.arrayContaining([InternalAuthGuard]))
  })

  it('rejects missing or invalid session keys', async () => {
    const { controller, skillScope } = makeController()

    await expect(
      controller.read(undefined, { skill_key: 'bug-checking-and-report' }),
    ).rejects.toThrow(BadRequestException)
    await expect(
      controller.read('agent:vibey:not-a-runtime-session', {
        skill_key: 'bug-checking-and-report',
      }),
    ).rejects.toThrow(BadRequestException)
    expect(skillScope.readRuntimeSkill).not.toHaveBeenCalled()
  })

  it('derives scope from session key before reading DB skills', async () => {
    const result = {
      skill_key: 'bug-checking-and-report',
      content: '# skill',
      content_type: 'text/markdown',
      source: 'skill',
    }
    const { controller, skillScope } = makeController(result)

    await expect(
      controller.read(`agent:vibey:vibey-${USER_ID}-${CONVERSATION_ID}::org:${ORG_ID}`, {
        skill_key: 'bug-checking-and-report',
        path: 'references/guide.md',
      }),
    ).resolves.toEqual(result)

    expect(skillScope.resolveAgentArchetype).toHaveBeenCalledWith({
      agentKey: 'vibey',
      userId: USER_ID,
      orgId: ORG_ID,
    })
    expect(skillScope.readRuntimeSkill).toHaveBeenCalledWith({
      agentKey: 'vibey',
      userId: USER_ID,
      orgId: ORG_ID,
      archetype: 'creator',
      skillKey: 'bug-checking-and-report',
      path: 'references/guide.md',
    })
  })

  it('returns not found when the scoped DB skill is unavailable', async () => {
    const { controller } = makeController(null)

    await expect(
      controller.read(`agent:vibey:vibey-${USER_ID}-${CONVERSATION_ID}`, {
        skill_key: 'missing-skill',
      }),
    ).rejects.toThrow(NotFoundException)
  })
})
