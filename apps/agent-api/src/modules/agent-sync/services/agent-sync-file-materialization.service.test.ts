import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { AgentSyncFileMaterializationService } from './agent-sync-file-materialization.service'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  )
})

describe('AgentSyncFileMaterializationService', () => {
  it('adds a requested cross-agent skill without removing the active agent skills', async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'required-skill-sync-'))
    temporaryDirectories.push(agentDir)
    await fs.mkdir(path.join(agentDir, 'skills', 'existing-skill'), { recursive: true })
    await fs.writeFile(
      path.join(agentDir, 'skills', 'existing-skill', 'SKILL.md'),
      '# Existing skill',
      'utf8',
    )
    await fs.writeFile(path.join(agentDir, 'SKILLS.md'), '# Existing index', 'utf8')

    const service = new AgentSyncFileMaterializationService()
    await service.syncAgentSkills({
      agentsBaseDir: path.dirname(agentDir),
      agentKey: agentDir,
      useKeyAsDir: true,
      replaceExisting: false,
      writeIndex: false,
      rows: [
        {
          id: 'skill-1',
          agent_key: 'specialist',
          skill_key: 'research',
          name: 'Research',
          description: 'Research a subject',
          markdown_content: '# Research',
          is_enabled: true,
          archetype_filter: null,
        },
      ],
      resources: [],
    })

    await expect(
      fs.readFile(path.join(agentDir, 'skills', 'existing-skill', 'SKILL.md'), 'utf8'),
    ).resolves.toBe('# Existing skill')
    await expect(
      fs.readFile(path.join(agentDir, 'skills', 'research', 'SKILL.md'), 'utf8'),
    ).resolves.toContain('# Research')
    await expect(fs.readFile(path.join(agentDir, 'SKILLS.md'), 'utf8')).resolves.toBe(
      '# Existing index',
    )
  })
})
