import { Injectable } from '@nestjs/common'
import { ArtifactLegacyStateMetaRepository } from '../repositories/artifact-legacy-state-meta.repository'

@Injectable()
export class ArtifactLegacyAgentStateService {
  constructor(
    private readonly repository: ArtifactLegacyStateMetaRepository = new ArtifactLegacyStateMetaRepository(),
  ) {}

  resolveAgentIdForState(target: Record<string, any>, sessionKey?: string): string {
    return target.parseAgentIdFromSessionKey(sessionKey ?? '') || 'vibey'
  }

  async updateState(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const agentId = this.resolveAgentIdForState(target, sessionKey)
    const stateContent = input.state_content as string
    if (!stateContent) return { success: false, error: 'state_content required' }

    const { data, error } = await this.repository.upsertAgentState(supabase, {
      userId,
      agentId,
      stateContent,
      updatedAt: new Date().toISOString(),
    })

    if (error) throw error
    return { success: true, agent_id: agentId, updated_at: data.updated_at }
  }

  async patchState(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const agentId = this.resolveAgentIdForState(target, sessionKey)

    const op = input.op as string
    if (!op) {
      return {
        success: false,
        error: 'op required (append_line | replace_line | remove_line | append_section)',
      }
    }

    const { data: existing, error: fetchErr } = await this.repository.findAgentState(supabase, {
      userId,
      agentId,
    })
    if (fetchErr) throw fetchErr

    let content = typeof existing?.state_content === 'string' ? existing.state_content : ''

    switch (op) {
      case 'append_line': {
        const line = input.line as string
        if (!line) return { success: false, error: 'line required for append_line' }
        content = content.trimEnd() + '\n' + line + '\n'
        break
      }
      case 'replace_line': {
        const find = input.find as string
        const replace = input.replace as string
        if (!find) return { success: false, error: 'find required for replace_line' }
        if (replace === undefined) {
          return { success: false, error: 'replace required for replace_line' }
        }
        if (!content.includes(find)) {
          return { success: false, error: 'find string not found in state' }
        }
        content = content.replace(find, replace)
        break
      }
      case 'remove_line': {
        const line = input.line as string
        if (!line) return { success: false, error: 'line required for remove_line' }
        const lines = content.split('\n')
        const filtered = lines.filter((l) => l.trim() !== line.trim())
        content = filtered.join('\n')
        break
      }
      case 'append_section': {
        const section = input.section as string
        const text = input.text as string
        if (!section) return { success: false, error: 'section required for append_section' }
        if (!text) return { success: false, error: 'text required for append_section' }
        const sectionIdx = content.indexOf(section)
        if (sectionIdx === -1) {
          content = content.trimEnd() + '\n\n' + section + '\n' + text + '\n'
        } else {
          const afterSection = sectionIdx + section.length
          const nextSectionMatch = content.slice(afterSection).search(/\n## /)
          if (nextSectionMatch === -1) {
            content = content.trimEnd() + '\n' + text + '\n'
          } else {
            const insertAt = afterSection + nextSectionMatch
            content = content.slice(0, insertAt) + '\n' + text + content.slice(insertAt)
          }
        }
        break
      }
      default:
        return {
          success: false,
          error: `Unknown op: ${op}. Use append_line, replace_line, remove_line, or append_section.`,
        }
    }

    const { data, error } = await this.repository.upsertAgentState(supabase, {
      userId,
      agentId,
      stateContent: String(content),
      updatedAt: new Date().toISOString(),
    })

    if (error) throw error
    return { success: true, agent_id: agentId, op, updated_at: data.updated_at }
  }

  async getState(target: Record<string, any>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const agentId = this.resolveAgentIdForState(target, sessionKey)
    const { data, error } = await this.repository.findAgentState(supabase, { userId, agentId })

    if (error) throw error
    return {
      agent_id: agentId,
      state_content: data?.state_content ?? '',
      updated_at: data?.updated_at ?? null,
    }
  }
}
