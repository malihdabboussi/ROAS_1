import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenClawGatewayService } from './services/openclaw-gateway.service'

describe('OpenClawGatewayService visual review policy', () => {
  const originalConfigPath = process.env.OPENCLAW_CONFIG_PATH
  let tmpDir = ''
  let configuredAgentsDir = ''
  let cwdSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibey-visual-review-'))
    configuredAgentsDir = path.join(tmpDir, 'docker', 'agents')
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
    process.env.OPENCLAW_CONFIG_PATH = path.join(tmpDir, 'openclaw.json')
    process.env.AGENTS_BASE_DIR = configuredAgentsDir
    await fs.mkdir(configuredAgentsDir, { recursive: true })
  })

  afterEach(async () => {
    cwdSpy.mockRestore()
    process.env.OPENCLAW_CONFIG_PATH = originalConfigPath
    delete process.env.AGENTS_BASE_DIR
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  async function readDenyTools(agentId: string): Promise<string[]> {
    const config = JSON.parse(await fs.readFile(process.env.OPENCLAW_CONFIG_PATH!, 'utf-8')) as {
      agents: { list: Array<{ id: string; tools: { deny: string[] } }> }
    }
    return config.agents.list.find((entry) => entry.id === agentId)?.tools.deny ?? []
  }

  async function ensureScopedAgent(input: {
    agentKey: string
    name: string
    role?: string
    skills: string[]
  }): Promise<string[]> {
    const orgId = '19847dc5-a29a-4684-87d0-4cf6560baa10'
    const agentId = `org-${orgId}-${input.agentKey}`
    const service = new OpenClawGatewayService()
    await service.ensureAgent({
      agentKey: agentId,
      name: input.name,
      role: input.role,
      workspace: path.join(configuredAgentsDir, 'orgs', orgId, input.agentKey),
      definitions: [{ file_name: 'SOUL.md', content: `# ${input.name}` }],
      skills: input.skills,
    })
    return readDenyTools(agentId)
  }

  it.each([
    { agentKey: 'designer', name: 'Designer' },
    { agentKey: 'lux', name: 'Lux' },
    { agentKey: 'pixel', name: 'Pixel' },
  ])('enables browser review for canonical $name runtimes', async (input) => {
    const deny = await ensureScopedAgent({ ...input, skills: ['funnel-site-design', 'vibey-api'] })

    expect(deny).not.toContain('browser')
    expect(deny).toContain('exec')
  })

  it('enables browser review for a trained custom designer role', async () => {
    const deny = await ensureScopedAgent({
      agentKey: 'creative-director',
      name: 'Creative Director',
      role: 'Funnel and Website Designer',
      skills: ['funnel-site-design', 'vibey-api'],
    })

    expect(deny).not.toContain('browser')
    expect(deny).toContain('exec')
  })

  it('keeps browser denied for a designer role without the visual-review skill', async () => {
    const deny = await ensureScopedAgent({
      agentKey: 'creative-director',
      name: 'Creative Director',
      role: 'Funnel and Website Designer',
      skills: ['vibey-api'],
    })

    expect(deny).toContain('browser')
  })

  it('keeps browser denied for non-designer runtimes with the design skill', async () => {
    const deny = await ensureScopedAgent({
      agentKey: 'vibey',
      name: 'Vibey',
      skills: ['funnel-site-design', 'vibey-api'],
    })

    expect(deny).toContain('browser')
  })
})
