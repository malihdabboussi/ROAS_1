import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTION_CONTRACT_PROTOCOL_HEADING } from '@vibey/agent-policy'
import { OpenClawGatewayService } from './services/openclaw-gateway.service'

describe('OpenClawGatewayService runtime inspection', () => {
  const originalConfigPath = process.env.OPENCLAW_CONFIG_PATH
  let tmpDir = ''
  let cwdSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibey-gateway-'))
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
    process.env.OPENCLAW_CONFIG_PATH = path.join(tmpDir, 'openclaw.json')
    await fs.mkdir(path.join(tmpDir, '.local', 'agents'), { recursive: true })
  })

  afterEach(async () => {
    cwdSpy.mockRestore()
    process.env.OPENCLAW_CONFIG_PATH = originalConfigPath
    delete process.env.AGENTS_BASE_DIR
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('repairs stale flat org workspace before runtime inspection', async () => {
    const service = new OpenClawGatewayService()
    const agentId = 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-atlas'
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: '${AGENTS_BASE_DIR}/org-19847dc5-a29a-4684-87d0-4cf6560baa10-atlas',
              promptMode: 'vibey',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)
    const repaired = JSON.parse(await fs.readFile(process.env.OPENCLAW_CONFIG_PATH!, 'utf-8')) as {
      agents: { list: Array<{ workspace: string }> }
    }

    expect(inspection.ready).toBe(false)
    expect(inspection.workspaceValid).toBe(true)
    expect(inspection.reasons).not.toContain('workspace_path_mismatch')
    expect(inspection.reasons).toContain('missing_SOUL.md')
    expect(repaired.agents.list[0]?.workspace).toBe(
      '${AGENTS_BASE_DIR}/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/atlas',
    )
  })

  it('repairs persisted macOS workspaces before they can reach Fly runtime', async () => {
    const service = new OpenClawGatewayService()
    const agentId = 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-vibey'
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: '/Users/dev/.local/agents/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/vibey',
              promptMode: 'vibey',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)
    const repaired = JSON.parse(await fs.readFile(process.env.OPENCLAW_CONFIG_PATH!, 'utf-8')) as {
      agents: { list: Array<{ workspace: string }> }
    }

    expect(inspection.workspaceValid).toBe(true)
    expect(inspection.workspace).toBe(
      path.join(
        tmpDir,
        '.local',
        'agents',
        'orgs',
        '19847dc5-a29a-4684-87d0-4cf6560baa10',
        'vibey',
      ),
    )
    expect(repaired.agents.list[0]?.workspace).toBe(
      '${AGENTS_BASE_DIR}/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/vibey',
    )
  })

  it('reports canonical org workspace with identity and vibey-api skill as ready', async () => {
    const service = new OpenClawGatewayService()
    const agentId = 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-atlas'
    const workspace = path.join(
      tmpDir,
      '.local',
      'agents',
      'orgs',
      '19847dc5-a29a-4684-87d0-4cf6560baa10',
      'atlas',
    )
    await fs.mkdir(path.join(workspace, 'skills', 'vibey-api'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(workspace, 'SOUL.md'), '# Soul', 'utf-8'),
      fs.writeFile(path.join(workspace, 'ROLE.md'), '# Role', 'utf-8'),
      fs.writeFile(path.join(workspace, 'IDENTITY.md'), '# Identity', 'utf-8'),
      fs.writeFile(path.join(workspace, 'skills', 'vibey-api', 'SKILL.md'), '# Skill', 'utf-8'),
      fs.writeFile(
        path.join(workspace, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json'),
        JSON.stringify({ agent_key: 'atlas', allowed_actions: ['save_user_memory'] }),
        'utf-8',
      ),
    ])
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: '${AGENTS_BASE_DIR}/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/atlas',
              promptMode: 'vibey',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)

    expect(inspection.ready).toBe(true)
    expect(inspection.vibeyApiSkillReady).toBe(true)
    expect(inspection.vibeyApiSkillFiles).toEqual({
      'SKILL.md': true,
      'ALLOWED_ACTIONS.json': true,
    })
    expect(inspection.reasons).toEqual([])
  })

  it('reports missing vibey-api action allowlist as runtime not ready', async () => {
    const service = new OpenClawGatewayService()
    const agentId = 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-atlas'
    const workspace = path.join(
      tmpDir,
      '.local',
      'agents',
      'orgs',
      '19847dc5-a29a-4684-87d0-4cf6560baa10',
      'atlas',
    )
    await fs.mkdir(path.join(workspace, 'skills', 'vibey-api'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(workspace, 'SOUL.md'), '# Soul', 'utf-8'),
      fs.writeFile(path.join(workspace, 'ROLE.md'), '# Role', 'utf-8'),
      fs.writeFile(path.join(workspace, 'IDENTITY.md'), '# Identity', 'utf-8'),
      fs.writeFile(path.join(workspace, 'skills', 'vibey-api', 'SKILL.md'), '# Skill', 'utf-8'),
    ])
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: '${AGENTS_BASE_DIR}/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/atlas',
              promptMode: 'vibey',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)

    expect(inspection.ready).toBe(false)
    expect(inspection.vibeyApiSkillReady).toBe(false)
    expect(inspection.vibeyApiSkillFiles).toEqual({
      'SKILL.md': true,
      'ALLOWED_ACTIONS.json': false,
    })
    expect(inspection.reasons).toEqual(['missing_vibey_api_actions'])
  })

  it('uses AGENTS_BASE_DIR for runtime inspection when configured', async () => {
    const configuredAgentsDir = path.join(tmpDir, 'docker', 'agents')
    process.env.AGENTS_BASE_DIR = configuredAgentsDir
    const service = new OpenClawGatewayService()
    const agentId = 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-vibey'
    const workspace = path.join(
      configuredAgentsDir,
      'orgs',
      '19847dc5-a29a-4684-87d0-4cf6560baa10',
      'vibey',
    )
    await fs.mkdir(path.join(workspace, 'skills', 'vibey-api'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(workspace, 'SOUL.md'), '# Soul', 'utf-8'),
      fs.writeFile(path.join(workspace, 'ROLE.md'), '# Role', 'utf-8'),
      fs.writeFile(path.join(workspace, 'IDENTITY.md'), '# Identity', 'utf-8'),
      fs.writeFile(path.join(workspace, 'skills', 'vibey-api', 'SKILL.md'), '# Skill', 'utf-8'),
      fs.writeFile(
        path.join(workspace, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json'),
        JSON.stringify({ agent_key: 'vibey', allowed_actions: ['save_user_memory'] }),
        'utf-8',
      ),
    ])
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: '${AGENTS_BASE_DIR}/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/vibey',
              promptMode: 'vibey',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)

    expect(inspection.ready).toBe(true)
    expect(inspection.workspace).toBe(workspace)
    expect(inspection.expectedWorkspace).toBe(workspace)
  })

  it('maps user-scoped personal agent ids to user workspace paths', async () => {
    const configuredAgentsDir = path.join(tmpDir, 'docker', 'agents')
    process.env.AGENTS_BASE_DIR = configuredAgentsDir
    const service = new OpenClawGatewayService()
    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const agentId = `user-${userId}-vibey`
    const workspace = path.join(configuredAgentsDir, 'users', userId, 'vibey')
    await fs.mkdir(path.join(workspace, 'skills', 'vibey-api'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(workspace, 'SOUL.md'), '# Soul', 'utf-8'),
      fs.writeFile(path.join(workspace, 'ROLE.md'), '# Role', 'utf-8'),
      fs.writeFile(path.join(workspace, 'IDENTITY.md'), '# Identity', 'utf-8'),
      fs.writeFile(path.join(workspace, 'skills', 'vibey-api', 'SKILL.md'), '# Skill', 'utf-8'),
      fs.writeFile(
        path.join(workspace, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json'),
        JSON.stringify({ agent_key: 'vibey', allowed_actions: ['save_user_memory'] }),
        'utf-8',
      ),
    ])
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: `${'${AGENTS_BASE_DIR}'}/users/${userId}/vibey`,
              promptMode: 'vibey',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)

    expect(inspection.ready).toBe(true)
    expect(inspection.workspace).toBe(workspace)
    expect(inspection.expectedWorkspace).toBe(workspace)
  })

  it('serializes concurrent agent config mutations', async () => {
    const configuredAgentsDir = path.join(tmpDir, 'docker', 'agents')
    process.env.AGENTS_BASE_DIR = configuredAgentsDir
    const service = new OpenClawGatewayService()
    const userId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const firstWorkspace = path.join(configuredAgentsDir, 'users', userId, 'atlas')
    const secondWorkspace = path.join(configuredAgentsDir, 'users', userId, 'vibey')

    await Promise.all([
      service.ensureAgent({
        agentKey: `user-${userId}-atlas`,
        name: 'atlas',
        workspace: firstWorkspace,
        definitions: [{ file_name: 'SOUL.md', content: '# Atlas' }],
        skills: ['vibey-api'],
      }),
      service.ensureAgent({
        agentKey: `user-${userId}-vibey`,
        name: 'vibey',
        workspace: secondWorkspace,
        definitions: [{ file_name: 'SOUL.md', content: '# Vibey' }],
        skills: ['vibey-api'],
      }),
    ])

    const config = JSON.parse(await fs.readFile(process.env.OPENCLAW_CONFIG_PATH!, 'utf-8')) as {
      agents: { list: Array<{ id: string; workspace: string }> }
    }
    const ids = config.agents.list.map((entry) => entry.id)

    expect(ids).toContain(`user-${userId}-atlas`)
    expect(ids).toContain(`user-${userId}-vibey`)
    expect(config.agents.list.find((entry) => entry.id === `user-${userId}-atlas`)?.workspace).toBe(
      `${'${AGENTS_BASE_DIR}'}/users/${userId}/atlas`,
    )
    expect(config.agents.list.find((entry) => entry.id === `user-${userId}-vibey`)?.workspace).toBe(
      `${'${AGENTS_BASE_DIR}'}/users/${userId}/vibey`,
    )
  })

  it('reports stale loop vibey-api actions when flow surface is missing', async () => {
    const configuredAgentsDir = path.join(tmpDir, 'docker', 'agents')
    process.env.AGENTS_BASE_DIR = configuredAgentsDir
    const service = new OpenClawGatewayService()
    const orgId = '699e3530-881c-4653-b507-4c4b5993538f'
    const agentId = `org-${orgId}-loop`
    const workspace = path.join(configuredAgentsDir, 'orgs', orgId, 'loop')
    await fs.mkdir(path.join(workspace, 'skills', 'vibey-api'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(workspace, 'SOUL.md'), '# Soul', 'utf-8'),
      fs.writeFile(path.join(workspace, 'ROLE.md'), '# Role', 'utf-8'),
      fs.writeFile(path.join(workspace, 'IDENTITY.md'), '# Identity', 'utf-8'),
      fs.writeFile(path.join(workspace, 'skills', 'vibey-api', 'SKILL.md'), '# Skill', 'utf-8'),
      fs.writeFile(
        path.join(workspace, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json'),
        JSON.stringify({ agent_key: 'loop', allowed_actions: ['save_user_memory', 'list_team'] }),
        'utf-8',
      ),
    ])
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: `${'${AGENTS_BASE_DIR}'}/orgs/${orgId}/loop`,
              promptMode: 'platform',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)

    expect(inspection.ready).toBe(false)
    expect(inspection.reasons).toContain('stale_loop_vibey_api_actions')
  })

  it('reports stale loop vibey-api actions when create_flow_clarification is missing', async () => {
    const configuredAgentsDir = path.join(tmpDir, 'docker', 'agents')
    process.env.AGENTS_BASE_DIR = configuredAgentsDir
    const service = new OpenClawGatewayService()
    const orgId = '699e3530-881c-4653-b507-4c4b5993538f'
    const agentId = `org-${orgId}-loop`
    const workspace = path.join(configuredAgentsDir, 'orgs', orgId, 'loop')
    await fs.mkdir(path.join(workspace, 'skills', 'vibey-api'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(workspace, 'SOUL.md'), '# Soul', 'utf-8'),
      fs.writeFile(path.join(workspace, 'ROLE.md'), '# Role', 'utf-8'),
      fs.writeFile(path.join(workspace, 'IDENTITY.md'), '# Identity', 'utf-8'),
      fs.writeFile(path.join(workspace, 'skills', 'vibey-api', 'SKILL.md'), '# Skill', 'utf-8'),
      fs.writeFile(
        path.join(workspace, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json'),
        JSON.stringify({
          agent_key: 'loop',
          allowed_actions: ['get_flow_build_context', 'create_flow_plan'],
        }),
        'utf-8',
      ),
    ])
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: `${'${AGENTS_BASE_DIR}'}/orgs/${orgId}/loop`,
              promptMode: 'platform',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId)

    expect(inspection.ready).toBe(false)
    expect(inspection.reasons).toContain('stale_loop_vibey_api_actions')
  })

  it('reports missing required slash skill resources', async () => {
    const service = new OpenClawGatewayService()
    const agentId = 'org-19847dc5-a29a-4684-87d0-4cf6560baa10-vibey'
    const workspace = path.join(
      tmpDir,
      '.local',
      'agents',
      'orgs',
      '19847dc5-a29a-4684-87d0-4cf6560baa10',
      'vibey',
    )
    await fs.mkdir(path.join(workspace, 'skills', 'vibey-api'), { recursive: true })
    await fs.mkdir(path.join(workspace, 'skills', 'kt-carousel-producer'), { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(workspace, 'SOUL.md'), '# Soul', 'utf-8'),
      fs.writeFile(path.join(workspace, 'ROLE.md'), '# Role', 'utf-8'),
      fs.writeFile(path.join(workspace, 'IDENTITY.md'), '# Identity', 'utf-8'),
      fs.writeFile(path.join(workspace, 'skills', 'vibey-api', 'SKILL.md'), '# Skill', 'utf-8'),
      fs.writeFile(
        path.join(workspace, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json'),
        JSON.stringify({ agent_key: 'vibey', allowed_actions: ['save_user_memory'] }),
        'utf-8',
      ),
      fs.writeFile(
        path.join(workspace, 'skills', 'kt-carousel-producer', 'SKILL.md'),
        '# KT',
        'utf-8',
      ),
    ])
    await fs.writeFile(
      process.env.OPENCLAW_CONFIG_PATH!,
      JSON.stringify({
        agents: {
          list: [
            {
              id: agentId,
              workspace: '${AGENTS_BASE_DIR}/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/vibey',
              promptMode: 'vibey',
            },
          ],
        },
      }),
      'utf-8',
    )

    const inspection = await service.inspectAgentRuntime(agentId, [
      {
        skillKey: 'kt-carousel-producer',
        kind: 'skill',
        filePath: 'skills/kt-carousel-producer/SKILL.md',
      },
      {
        skillKey: 'kt-carousel-producer',
        kind: 'resource',
        filePath: 'skills/kt-carousel-producer/references/kt-design-system.md',
      },
    ])

    expect(inspection.ready).toBe(false)
    expect(inspection.reasons).toContain(
      'missing_skill_resource:kt-carousel-producer/skills/kt-carousel-producer/references/kt-design-system.md',
    )
  })
})

describe('OpenClawGatewayService.writeIdentityFiles', () => {
  let tmpDir = ''

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibey-gateway-write-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('keeps the TOOLS.md heading first when adding the action contract protocol', async () => {
    const service = new OpenClawGatewayService()
    const workspace = path.join(tmpDir, 'agent')

    const written = await service.writeIdentityFiles(workspace, [
      { file_name: 'TOOLS.md', content: '# TOOLS.md — Original\n\nTool list here.\n' },
      { file_name: 'SOUL.md', content: '# Soul\n' },
    ])

    expect(written).toBe(2)
    const tools = await fs.readFile(path.join(workspace, 'TOOLS.md'), 'utf-8')
    expect(tools.startsWith('# TOOLS.md — Original')).toBe(true)
    expect(tools.indexOf('# TOOLS.md — Original')).toBeLessThan(
      tools.indexOf(ACTION_CONTRACT_PROTOCOL_HEADING),
    )
    expect(tools).toContain('Tool list here.')

    const soul = await fs.readFile(path.join(workspace, 'SOUL.md'), 'utf-8')
    expect(soul).toBe('# Soul\n')
  })

  it('normalizes old protocol-first TOOLS.md content without duplicating the protocol', async () => {
    const service = new OpenClawGatewayService()
    const workspace = path.join(tmpDir, 'agent')
    const original = `${ACTION_CONTRACT_PROTOCOL_HEADING}\n\npreloaded\n\n# TOOLS.md — Original\n`

    await service.writeIdentityFiles(workspace, [{ file_name: 'TOOLS.md', content: original }])

    const tools = await fs.readFile(path.join(workspace, 'TOOLS.md'), 'utf-8')
    const occurrences = tools.split(ACTION_CONTRACT_PROTOCOL_HEADING).length - 1
    expect(tools.startsWith('# TOOLS.md — Original')).toBe(true)
    expect(occurrences).toBe(1)
  })
})
