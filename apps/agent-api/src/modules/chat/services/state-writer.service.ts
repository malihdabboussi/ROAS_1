import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'

const DEFAULT_STATE = `# STATE.md — Current Working State

## Active Work
_No active work._

## Campaign Status
_No campaigns tracked yet._

## Recent Actions
_No recent actions._

## Pending / Blocked
_Nothing pending.
`

@Injectable()
export class StateWriterService {
  private readonly logger = new Logger(StateWriterService.name)
  private readonly supabase: SupabaseClient
  private readonly defaultWorkspacePath: string

  private readonly hashCache = new Map<string, string>()

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: ChatRuntimeRepository = new ChatRuntimeRepository(),
  ) {
    this.supabase = svc.client
    this.defaultWorkspacePath =
      process.env.AGENT_WORKSPACE_PATH ??
      process.env.OPENCLAW_AGENT_WORKSPACE ??
      '/app/agents/vibey'
  }

  async readStateReminder(userId: string, agentId: string): Promise<string> {
    try {
      const data = await this.repository.findAgentState(this.supabase, { userId, agentId })
      if (!data?.state_content) return ''

      const content = String(data.state_content).trim()
      if (!content || content === DEFAULT_STATE.trim()) return ''

      const lines = content.split('\n').filter((l) => l.trim().length > 0)
      if (lines.length <= 2) return ''

      const truncated = lines.slice(0, 20).join('\n')
      return `CURRENT_STATE:\n${truncated}`
    } catch {
      return ''
    }
  }

  async ensureState(userId: string, agentId: string): Promise<void> {
    try {
      const data = await this.repository.findAgentState(this.supabase, { userId, agentId })
      const content = data?.state_content || DEFAULT_STATE
      const hash = this.simpleHash(content)
      const workspacePath = this.resolveWorkspacePath(agentId)
      const targetKey = `${userId}:${agentId}:${workspacePath}`

      if (hash === this.hashCache.get(targetKey)) {
        return
      }

      const filePath = join(workspacePath, 'STATE.md')
      await writeFile(filePath, content, 'utf-8')
      this.hashCache.set(targetKey, hash)

      this.logger.log(`STATE.md written for user ${userId} agent ${agentId}`)
    } catch (err) {
      this.logger.warn(`Failed to write STATE.md: ${err instanceof Error ? err.message : err}`)
    }
  }

  private resolveWorkspacePath(agentId: string): string {
    const trimmedAgentId = agentId.trim()
    const agentsBaseDir = process.env.AGENTS_BASE_DIR?.trim()
    if (agentsBaseDir) {
      return join(agentsBaseDir, trimmedAgentId)
    }
    const stateDir = process.env.OPENCLAW_STATE_DIR?.trim()
    if (stateDir) {
      return join(stateDir, `workspace-${trimmedAgentId}`)
    }

    const localAgentsDir = join(process.cwd(), 'docker', 'agents')
    if (existsSync(localAgentsDir)) {
      return join(localAgentsDir, trimmedAgentId)
    }

    const parentDir = this.defaultWorkspacePath.endsWith('/vibey')
      ? this.defaultWorkspacePath.slice(0, -'/vibey'.length)
      : this.defaultWorkspacePath
    return join(parentDir, trimmedAgentId)
  }

  private simpleHash(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const chr = content.charCodeAt(i)
      hash = ((hash << 5) - hash + chr) | 0
    }
    return hash.toString(36)
  }
}
