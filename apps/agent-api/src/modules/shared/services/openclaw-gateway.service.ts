import { existsSync, readFileSync } from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import { prependActionContractProtocol } from '@vibey/agent-policy'

interface OpenClawAgentEntry {
  id: string
  workspace: string
  promptMode?: 'full' | 'embedded' | 'platform' | 'vibey'
  skills?: string[]
  tools?: Record<string, unknown>
}

interface OpenClawConfig {
  agents?: {
    defaults?: Record<string, unknown>
    list?: OpenClawAgentEntry[]
  }
  [key: string]: unknown
}

export interface OpenClawAgentRuntimeInspection {
  agentId: string
  exists: boolean
  workspace: string
  expectedWorkspace: string
  workspaceValid: boolean
  identityFiles: Record<'SOUL.md' | 'ROLE.md' | 'IDENTITY.md', boolean>
  vibeyApiSkillFiles: Record<'SKILL.md' | 'ALLOWED_ACTIONS.json', boolean>
  vibeyApiSkillReady: boolean
  requiredSkillFiles: Record<string, boolean>
  ready: boolean
  reasons: string[]
}

export interface OpenClawRequiredSkillFile {
  skillKey: string
  filePath: string
  kind: 'skill' | 'resource'
}

@Injectable()
export class OpenClawGatewayService {
  private readonly logger = new Logger(OpenClawGatewayService.name)
  private batchConfig: OpenClawConfig | null = null
  private configMutationQueue = Promise.resolve()
  private static readonly DEFAULT_PROMPT_MODE: OpenClawAgentEntry['promptMode'] = 'vibey'
  private static readonly WEB_RESEARCH_TOOLS = new Set(['web_search', 'web_fetch'])
  private static readonly CORE_DENY_TOOLS = [
    'write',
    'edit',
    'apply_patch',
    'exec',
    'grep',
    'find',
    'ls',
    'process',
    'canvas',
    'nodes',
    'cron',
    'message',
    'gateway',
    'agents_list',
    'sessions_list',
    'sessions_history',
    'sessions_send',
    'sessions_spawn',
    'subagents',
    'image',
    'tts',
  ] as const
  // `pixel` is the library designer key. The Pixel the user chats with is `vibey`.
  private static readonly VISUAL_REVIEW_AGENT_KEYS = new Set([
    'designer',
    'lux',
    'pixel',
    'vibey',
  ])

  private isVisualReviewAgent(agentId: string, role?: string, skills?: string[]): boolean {
    const agentKey = this.parseScopedAgentId(agentId)?.agentKey ?? agentId
    if (OpenClawGatewayService.VISUAL_REVIEW_AGENT_KEYS.has(agentKey)) return true
    return (
      role?.toLowerCase().includes('designer') === true &&
      skills?.includes('funnel-site-design') === true
    )
  }

  private getEnforcedDenyTools(
    agentId: string,
    role?: string,
    skills?: string[],
  ): readonly string[] {
    return this.isVisualReviewAgent(agentId, role, skills)
      ? OpenClawGatewayService.CORE_DENY_TOOLS
      : [...OpenClawGatewayService.CORE_DENY_TOOLS, 'browser']
  }

  private get configPath(): string {
    const configured = process.env.OPENCLAW_CONFIG_PATH?.trim()
    if (configured) return configured
    throw new Error('OPENCLAW_CONFIG_PATH is required for OpenClawGatewayService')
  }

  private get agentsBaseDir(): string {
    const configured = process.env.AGENTS_BASE_DIR?.trim()
    if (configured) return configured

    const dockerPath = '/app/agents'
    if (existsSync(dockerPath)) return dockerPath
    const localPath = path.join(process.cwd(), '.local', 'agents')
    if (existsSync(localPath)) return localPath
    return localPath
  }

  private parseScopedAgentId(
    agentId: string,
  ): { scope: 'org' | 'user'; ownerId: string; agentKey: string } | null {
    const scopedMatch = agentId.match(
      /^(org|user)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(.+)$/i,
    )
    if (!scopedMatch?.[1] || !scopedMatch[2] || !scopedMatch[3]) return null
    return {
      scope: scopedMatch[1].toLowerCase() === 'user' ? 'user' : 'org',
      ownerId: scopedMatch[2],
      agentKey: scopedMatch[3],
    }
  }

  private expectedWorkspaceTokenForAgent(agentId: string): string {
    const scoped = this.parseScopedAgentId(agentId)
    if (scoped?.scope === 'org') {
      return `${'${AGENTS_BASE_DIR}'}/orgs/${scoped.ownerId}/${scoped.agentKey}`
    }
    if (scoped?.scope === 'user') {
      return `${'${AGENTS_BASE_DIR}'}/users/${scoped.ownerId}/${scoped.agentKey}`
    }
    return `${'${AGENTS_BASE_DIR}'}/${agentId}`
  }

  async beginBatch(): Promise<void> {
    this.batchConfig = await this.readConfigFromDisk()
  }

  async commitBatch(): Promise<void> {
    if (this.batchConfig) {
      const tokenized = this.tokenizeWorkspacePaths(this.batchConfig)
      await fs.writeFile(this.configPath, JSON.stringify(tokenized, null, 2), 'utf-8')
      this.batchConfig = null
    }
  }

  /**
   * Rewrite absolute workspace paths back to the `${AGENTS_BASE_DIR}` token before persisting.
   *
   * The file on disk is the portable template baked into the Fly image; any local-dev runtime
   * that resolves `agentsBaseDir` to a machine-specific absolute path (e.g. `/Users/…` on macOS,
   * `/app/agents` on Fly) must re-tokenize before writing. Otherwise a dev `git add` drags a
   * macOS path into the repo, then Fly containers try to `mkdir '/Users'` and explode with
   * EACCES on first workspace touch.
   */
  private tokenizeWorkspacePaths(config: OpenClawConfig): OpenClawConfig {
    const base = this.agentsBaseDir
    const list = config.agents?.list
    if (!Array.isArray(list) || list.length === 0) return config
    for (const entry of list) {
      if (typeof entry?.workspace !== 'string') continue
      const ws = entry.workspace
      if (ws.startsWith('${AGENTS_BASE_DIR}')) continue
      if (ws === base) {
        entry.workspace = '${AGENTS_BASE_DIR}'
      } else if (ws.startsWith(base + '/')) {
        entry.workspace = '${AGENTS_BASE_DIR}' + ws.slice(base.length)
      }
    }
    return config
  }

  private repairWorkspacePathsOnRead(config: OpenClawConfig): {
    config: OpenClawConfig
    changed: boolean
  } {
    const list = config.agents?.list
    if (!Array.isArray(list) || list.length === 0) return { config, changed: false }

    let changed = false
    for (const entry of list) {
      if (typeof entry?.id !== 'string' || !entry.id.trim()) continue
      if (this.isWorkspaceValidForAgent(entry.workspace, entry.id)) continue

      entry.workspace = this.expectedWorkspaceTokenForAgent(entry.id)
      changed = true
    }

    return { config, changed }
  }

  private async readConfigFromDisk(): Promise<OpenClawConfig> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw) as OpenClawConfig
      const repaired = this.repairWorkspacePathsOnRead(parsed)
      if (repaired.changed) {
        const tokenized = this.tokenizeWorkspacePaths(repaired.config)
        await fs.writeFile(this.configPath, JSON.stringify(tokenized, null, 2), 'utf-8')
        this.logger.warn('Repaired invalid OpenClaw workspace paths in config')
      }
      return repaired.config
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        const emptyConfig: OpenClawConfig = { agents: { list: [] } }
        await fs.mkdir(path.dirname(this.configPath), { recursive: true })
        await fs.writeFile(this.configPath, JSON.stringify(emptyConfig, null, 2), 'utf-8')
        this.logger.log(`Created empty OpenClaw config at ${this.configPath}`)
        return emptyConfig
      }
      throw err
    }
  }

  private async readConfig(): Promise<OpenClawConfig> {
    if (this.batchConfig) return this.batchConfig
    return this.readConfigFromDisk()
  }

  private async writeConfig(config: OpenClawConfig): Promise<void> {
    if (this.batchConfig) {
      this.batchConfig = config
      return
    }
    const tokenized = this.tokenizeWorkspacePaths(config)
    await fs.writeFile(this.configPath, JSON.stringify(tokenized, null, 2), 'utf-8')
  }

  private normalizeDenyTools(
    input: unknown,
    agentId: string,
    role?: string,
    skills?: string[],
  ): string[] {
    const configured = Array.isArray(input)
      ? input.filter((tool): tool is string => typeof tool === 'string')
      : []
    const allowedConfigured = this.isVisualReviewAgent(agentId, role, skills)
      ? configured.filter((tool) => tool !== 'browser')
      : configured
    const enforced = this.getEnforcedDenyTools(agentId, role, skills)
    const merged = new Set<string>([...allowedConfigured, ...enforced])
    return Array.from(merged)
  }

  expectedWorkspaceForAgent(agentId: string): string {
    const scoped = this.parseScopedAgentId(agentId)
    if (scoped?.scope === 'org') {
      return path.join(this.agentsBaseDir, 'orgs', scoped.ownerId, scoped.agentKey)
    }
    if (scoped?.scope === 'user') {
      return path.join(this.agentsBaseDir, 'users', scoped.ownerId, scoped.agentKey)
    }
    return path.join(this.agentsBaseDir, agentId)
  }

  private async runConfigMutation<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.configMutationQueue.then(operation, operation)
    this.configMutationQueue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private isWorkspaceValidForAgent(workspace: unknown, agentId: string): boolean {
    if (typeof workspace !== 'string') return false
    const trimmed = workspace.trim()
    if (!trimmed) return false
    if (trimmed === this.expectedWorkspaceForAgent(agentId)) return true
    if (trimmed === this.expectedWorkspaceTokenForAgent(agentId)) return true
    return false
  }

  private async reconcileAgentConfig(opts: {
    agentKey: string
    workspace: string
    role?: string | undefined
    skills?: string[] | undefined
  }): Promise<boolean> {
    const config = await this.readConfig()
    const list = config.agents?.list ?? []
    const existing = list.find((entry) => entry.id === opts.agentKey)
    if (!existing) return false

    const tools = (existing.tools ?? {}) as Record<string, unknown>
    const existingDeny = Array.isArray(tools.deny)
      ? tools.deny.filter((tool): tool is string => typeof tool === 'string')
      : []
    const nextDeny = this.normalizeDenyTools(tools.deny, opts.agentKey, opts.role, opts.skills)

    let changed = false
    if (existing.promptMode !== OpenClawGatewayService.DEFAULT_PROMPT_MODE) {
      existing.promptMode = OpenClawGatewayService.DEFAULT_PROMPT_MODE
      changed = true
    }
    if (!this.isWorkspaceValidForAgent(existing.workspace, opts.agentKey)) {
      existing.workspace = this.expectedWorkspaceForAgent(opts.agentKey)
      changed = true
    }
    if (
      !Array.isArray(tools.deny) ||
      nextDeny.length !== existingDeny.length ||
      nextDeny.some((tool) => !existingDeny.includes(tool))
    ) {
      existing.tools = { ...tools, deny: nextDeny }
      changed = true
    }
    if (Array.isArray(opts.skills)) {
      const prev = JSON.stringify([...(existing.skills ?? [])].sort())
      const next = JSON.stringify([...opts.skills].sort())
      if (prev !== next) {
        existing.skills = [...opts.skills]
        changed = true
      }
    }

    if (!changed) return true

    await this.writeConfig(config)
    this.logger.log(`Agent "${opts.agentKey}" reconciled in OpenClaw config`)
    return true
  }

  async agentExists(agentId: string): Promise<boolean> {
    try {
      const config = await this.readConfig()
      const list = config.agents?.list ?? []
      return list.some((a) => a.id === agentId)
    } catch {
      return false
    }
  }

  private resolveWorkspacePath(workspace: string): string {
    if (workspace === '${AGENTS_BASE_DIR}') return this.agentsBaseDir
    if (workspace.startsWith('${AGENTS_BASE_DIR}/')) {
      return path.join(this.agentsBaseDir, workspace.slice('${AGENTS_BASE_DIR}/'.length))
    }
    return workspace
  }

  private isLoopAgentId(agentId: string): boolean {
    if (agentId === 'loop') return true
    const scoped = this.parseScopedAgentId(agentId)
    return scoped?.agentKey === 'loop'
  }

  private static readonly LOOP_FLOW_SURFACE_ACTIONS = [
    'get_flow_build_context',
    'create_flow_clarification',
  ] as const
  private static readonly VIBEY_API_RUNTIME_FILES = ['SKILL.md', 'ALLOWED_ACTIONS.json'] as const

  private loopAllowedActionsIncludeFlowSurface(allowedActionsPath: string): boolean {
    if (!existsSync(allowedActionsPath)) return false
    try {
      const parsed = JSON.parse(readFileSync(allowedActionsPath, 'utf-8')) as {
        allowed_actions?: unknown
      }
      const allowed = Array.isArray(parsed.allowed_actions) ? parsed.allowed_actions : []
      const missing = OpenClawGatewayService.LOOP_FLOW_SURFACE_ACTIONS.filter(
        (action) => !allowed.includes(action),
      )
      return missing.length === 0
    } catch {
      return false
    }
  }

  async inspectAgentRuntime(
    agentId: string,
    requiredSkillFiles: OpenClawRequiredSkillFile[] = [],
  ): Promise<OpenClawAgentRuntimeInspection> {
    const config = await this.readConfig()
    const list = config.agents?.list ?? []
    const entry = list.find((agent) => agent.id === agentId)
    const expectedWorkspace = this.expectedWorkspaceForAgent(agentId)
    const workspace = entry?.workspace
      ? this.resolveWorkspacePath(entry.workspace)
      : expectedWorkspace
    const workspaceValid = entry ? this.isWorkspaceValidForAgent(entry.workspace, agentId) : false

    const identityFiles = {
      'SOUL.md': false,
      'ROLE.md': false,
      'IDENTITY.md': false,
    }
    for (const fileName of Object.keys(identityFiles) as Array<keyof typeof identityFiles>) {
      identityFiles[fileName] = existsSync(path.join(workspace, fileName))
    }

    const vibeyApiSkillFiles = {
      'SKILL.md': false,
      'ALLOWED_ACTIONS.json': false,
    }
    for (const fileName of OpenClawGatewayService.VIBEY_API_RUNTIME_FILES) {
      vibeyApiSkillFiles[fileName] = existsSync(
        path.join(workspace, 'skills', 'vibey-api', fileName),
      )
    }
    const vibeyApiSkillReady = OpenClawGatewayService.VIBEY_API_RUNTIME_FILES.every(
      (fileName) => vibeyApiSkillFiles[fileName],
    )
    const requiredSkillFileState: Record<string, boolean> = {}
    const reasons: string[] = []
    if (!entry) reasons.push('agent_missing_from_openclaw_config')
    if (entry && !workspaceValid) reasons.push('workspace_path_mismatch')
    for (const [fileName, present] of Object.entries(identityFiles)) {
      if (!present) reasons.push(`missing_${fileName}`)
    }
    if (!vibeyApiSkillFiles['SKILL.md']) reasons.push('missing_vibey_api_skill')
    if (!vibeyApiSkillFiles['ALLOWED_ACTIONS.json']) reasons.push('missing_vibey_api_actions')
    if (vibeyApiSkillFiles['ALLOWED_ACTIONS.json'] && this.isLoopAgentId(agentId)) {
      const allowedActionsPath = path.join(workspace, 'skills', 'vibey-api', 'ALLOWED_ACTIONS.json')
      if (!this.loopAllowedActionsIncludeFlowSurface(allowedActionsPath)) {
        reasons.push('stale_loop_vibey_api_actions')
      }
    }
    for (const required of requiredSkillFiles) {
      const normalized = path.normalize(required.filePath)
      if (path.isAbsolute(normalized) || normalized.startsWith('..')) continue
      const present = existsSync(path.join(workspace, normalized))
      const key = `${required.skillKey}:${normalized}`
      requiredSkillFileState[key] = present
      if (!present) {
        reasons.push(
          required.kind === 'skill'
            ? `missing_skill:${required.skillKey}`
            : `missing_skill_resource:${required.skillKey}/${normalized}`,
        )
      }
    }

    return {
      agentId,
      exists: !!entry,
      workspace,
      expectedWorkspace,
      workspaceValid,
      identityFiles,
      vibeyApiSkillFiles,
      vibeyApiSkillReady,
      requiredSkillFiles: requiredSkillFileState,
      ready: reasons.length === 0,
      reasons,
    }
  }

  async createAgent(opts: {
    agentKey: string
    workspace: string
    role?: string | undefined
    skills?: string[] | undefined
  }): Promise<{ ok: boolean }> {
    const config = await this.readConfig()
    if (!config.agents) config.agents = {}
    if (!config.agents.list) config.agents.list = []

    if (config.agents.list.some((a) => a.id === opts.agentKey)) {
      return { ok: true }
    }

    const entry: OpenClawAgentEntry = {
      id: opts.agentKey,
      workspace: opts.workspace,
      promptMode: OpenClawGatewayService.DEFAULT_PROMPT_MODE,
      tools: {
        deny: [...this.getEnforcedDenyTools(opts.agentKey, opts.role, opts.skills)],
      },
    }

    if (Array.isArray(opts.skills) && opts.skills.length > 0) {
      entry.skills = opts.skills
    }

    config.agents.list.push(entry)

    await this.writeConfig(config)
    this.logger.log(`Agent "${opts.agentKey}" added to OpenClaw config`)
    return { ok: true }
  }

  private withoutWebResearchFromDeny(deny: unknown): string[] {
    const denyList = Array.isArray(deny)
      ? deny.filter((tool): tool is string => typeof tool === 'string')
      : []
    return denyList.filter((tool) => !OpenClawGatewayService.WEB_RESEARCH_TOOLS.has(tool))
  }

  private async enableWebResearchToolsForAgent(agentKey: string): Promise<boolean> {
    const config = await this.readConfig()
    const list = config.agents?.list ?? []
    const agent = list.find((entry) => entry.id === agentKey)
    if (!agent) return false

    const tools = (agent.tools ?? {}) as Record<string, unknown>
    const currentDeny = Array.isArray(tools.deny) ? tools.deny : []
    const nextDeny = this.withoutWebResearchFromDeny(currentDeny)

    if (currentDeny.length === nextDeny.length) return false

    agent.tools = { ...tools, deny: nextDeny }
    await this.writeConfig(config)
    this.logger.log(`Agent "${agentKey}" tool policy updated: web research enabled`)
    return true
  }

  async writeIdentityFiles(
    workspace: string,
    definitions: Array<{ file_name: string; content: string }>,
  ): Promise<number> {
    const IDENTITY_FILES = new Set(['AGENTS.md', 'IDENTITY.md', 'SOUL.md', 'ROLE.md', 'TOOLS.md'])

    await fs.mkdir(workspace, { recursive: true })
    let written = 0
    for (const def of definitions) {
      if (!IDENTITY_FILES.has(def.file_name)) continue
      if (!def.content?.trim()) continue
      const content =
        def.file_name === 'TOOLS.md' ? prependActionContractProtocol(def.content) : def.content
      await fs.writeFile(path.join(workspace, def.file_name), content, 'utf-8')
      written++
    }
    return written
  }

  async ensureAgent(opts: {
    agentKey: string
    name: string
    workspace: string
    definitions: Array<{ file_name: string; content: string }>
    role?: string | undefined
    skills?: string[] | undefined
  }): Promise<{ ok: boolean; created: boolean; filesWritten: number }> {
    const operation = async (): Promise<{
      ok: boolean
      created: boolean
      filesWritten: number
    }> => {
      const exists = await this.agentExists(opts.agentKey)

      if (!exists) {
        const result = await this.createAgent({
          agentKey: opts.agentKey,
          workspace: opts.workspace,
          role: opts.role,
          skills: opts.skills,
        })
        if (!result.ok) {
          return { ok: false, created: false, filesWritten: 0 }
        }
      }

      await this.reconcileAgentConfig({
        agentKey: opts.agentKey,
        workspace: opts.workspace,
        role: opts.role,
        skills: opts.skills,
      })

      await this.enableWebResearchToolsForAgent(opts.agentKey)

      const filesWritten = await this.writeIdentityFiles(opts.workspace, opts.definitions)
      this.logger.log(
        `Agent "${opts.agentKey}" ${exists ? 'updated' : 'registered'} in gateway (${filesWritten} identity files)`,
      )
      return { ok: true, created: !exists, filesWritten }
    }

    if (this.batchConfig) return operation()
    return this.runConfigMutation(operation)
  }
}
