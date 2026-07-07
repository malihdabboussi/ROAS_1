import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentRuntimeSkillScopeService } from '../../agent-sync/services/agent-runtime-skill-scope.service'
import type { RuntimeSkillFileRequirement } from '../../agent-sync/services/agent-runtime-skill-paths'
import { ChatContextRepository } from '../repositories/chat-context.repository'

export interface ResolvedSlashCommand {
  key: string
  type: 'skill' | 'workflow'
  name: string
  markdown_content: string
  requiredSkillFiles?: RuntimeSkillFileRequirement[]
}

@Injectable()
export class ChatSlashCommandService {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly runtimeSkillScope: AgentRuntimeSkillScopeService,
    private readonly chatContextRepository: ChatContextRepository,
  ) {}

  parseSlashTokens(content: string): string[] {
    const matches = content.match(/(?:^|\s)\/([\w][\w-]*)/g)
    if (!matches) return []
    return [...new Set(matches.map((match) => match.trim().slice(1)))]
  }

  async resolveSlashCommands(
    userId: string,
    agentKey: string,
    keys: string[],
    orgId?: string,
  ): Promise<ResolvedSlashCommand[]> {
    if (keys.length === 0) return []
    const [skillsResult, workflowsResult] = await Promise.all([
      this.runtimeSkillScope.resolveRuntimeSkillScope({
        agentKey,
        userId,
        orgId: orgId ?? null,
        skillKeys: keys,
      }),
      this.chatContextRepository.listAgentWorkflows(this.svc.client, {
        userId,
        agentKey,
        keys,
        orgId,
      }),
    ])
    const resolved: ResolvedSlashCommand[] = []

    if (skillsResult.skills.length > 0) {
      for (const row of skillsResult.skills) {
        const markdown = row.markdown_content as string
        if (!markdown?.trim()) continue
        resolved.push({
          key: row.skill_key as string,
          type: 'skill',
          name: (row.name as string) ?? row.skill_key,
          markdown_content: markdown,
          requiredSkillFiles: skillsResult.requiredSkillFiles.filter(
            (file) => file.skillKey === row.skill_key,
          ),
        })
      }
    }

    if (workflowsResult.data) {
      for (const row of workflowsResult.data) {
        if (row.is_enabled === false) continue
        const markdown = row.markdown_content as string
        if (!markdown?.trim()) continue
        resolved.push({
          key: row.workflow_key as string,
          type: 'workflow',
          name: (row.name as string) ?? row.workflow_key,
          markdown_content: markdown,
        })
      }
    }

    return resolved
  }

  buildSlashCommandContext(
    commands: Array<{
      key: string
      type: 'skill' | 'workflow'
      name: string
      markdown_content: string
    }>,
  ): string {
    if (commands.length === 0) return ''
    const blocks: string[] = []
    for (const command of commands) {
      const typeLabel = command.type === 'skill' ? 'SKILL' : 'WORKFLOW'
      blocks.push(
        `---\n**REFERENCED ${typeLabel}: ${command.name}** (key: ${command.key})\nThe user invoked this ${command.type} via /${command.key}. Follow the instructions below:\n\n${command.markdown_content}\n\n---`,
      )
    }
    return blocks.join('\n\n')
  }

  stripResolvedSlashTokens(content: string, resolvedKeys: string[]): string {
    if (resolvedKeys.length === 0) return content
    let result = content
    for (const key of resolvedKeys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(`\\/${escaped}(?=\\s|$)\\s*`, 'g'), '')
    }
    return result.trim()
  }
}
