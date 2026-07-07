import { Injectable } from '@nestjs/common'
import { AgentRuntimeSkillScopeService } from '../../agent-sync/services/agent-runtime-skill-scope.service'
import type { RuntimeSkillFileRequirement } from '../../agent-sync/services/agent-runtime-skill-paths'
import { TaskAgentRepository } from '../repositories/task-agent.repository'

export interface ResolvedTaskSlashSkill {
  key: string
  name: string
  markdown_content: string
  requiredSkillFiles: RuntimeSkillFileRequirement[]
}

function parseActivityAssigneeRef(entry: Record<string, unknown>): string | null {
  const type = entry.type
  const id = entry.id
  if (type !== 'human' && type !== 'agent') return null
  if (typeof id !== 'string' || id.trim().length === 0) return null
  return `${type}:${id.trim()}`
}

function formatAssigneeActivitySide(value: unknown): string {
  if (typeof value === 'string') {
    const label = value.trim()
    return label.length > 0 ? label : 'unassigned'
  }
  if (value == null) return 'unassigned'

  if (Array.isArray(value)) {
    const refs = value
      .filter(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === 'object' && !Array.isArray(entry),
      )
      .map(parseActivityAssigneeRef)
      .filter((ref): ref is string => ref != null)
    return refs.length > 0 ? refs.join(', ') : 'unassigned'
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (obj.primary && typeof obj.primary === 'object' && !Array.isArray(obj.primary)) {
      const ref = parseActivityAssigneeRef(obj.primary as Record<string, unknown>)
      if (ref) return ref
    }
    if (Array.isArray(obj.assignees)) {
      const refs = obj.assignees
        .filter(
          (entry): entry is Record<string, unknown> =>
            !!entry && typeof entry === 'object' && !Array.isArray(entry),
        )
        .map(parseActivityAssigneeRef)
        .filter((ref): ref is string => ref != null)
      if (refs.length > 0) return refs.join(', ')
    }
    const flat = parseActivityAssigneeRef(obj)
    if (flat) return flat
  }

  return 'unassigned'
}

@Injectable()
export class TaskAgentInputService {
  constructor(
    private readonly repository: TaskAgentRepository,
    private readonly runtimeSkillScope?: AgentRuntimeSkillScopeService,
  ) {}

  requestedSkillKeys(payload: { prompt: string; skill_keys?: string[] }): string[] {
    const explicit = Array.isArray(payload.skill_keys) ? payload.skill_keys : []
    return [
      ...new Set(
        [...explicit, ...this.parseSlashTokens(payload.prompt)]
          .map((key) => key.trim())
          .filter((key) => /^[\w][\w-]*$/.test(key)),
      ),
    ]
  }

  async resolveTaskSlashSkills(input: {
    userId: string
    agentKey: string
    keys: string[]
    orgId: string | null
  }): Promise<ResolvedTaskSlashSkill[]> {
    if (input.keys.length === 0 || !this.runtimeSkillScope) return []
    const scope = await this.runtimeSkillScope.resolveRuntimeSkillScope({
      agentKey: input.agentKey,
      userId: input.userId,
      orgId: input.orgId,
      skillKeys: input.keys,
    })
    return scope.skills
      .map((row) => {
        const markdown = row.markdown_content
        if (!markdown?.trim()) return null
        return {
          key: row.skill_key,
          name: row.name || row.skill_key,
          markdown_content: markdown,
          requiredSkillFiles: scope.requiredSkillFiles.filter(
            (file) => file.skillKey === row.skill_key,
          ),
        }
      })
      .filter((row): row is ResolvedTaskSlashSkill => row !== null)
  }

  buildSlashSkillContext(skills: ResolvedTaskSlashSkill[]): string {
    if (skills.length === 0) return ''
    return skills
      .map((skill) =>
        [
          `---\n**REFERENCED SKILL: ${skill.name}** (key: ${skill.key})`,
          `The user invoked this skill via /${skill.key}. Follow the instructions below:`,
          '',
          skill.markdown_content,
          '',
          '---',
        ].join('\n'),
      )
      .join('\n\n')
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

  buildActivityHistory(rows: Array<Record<string, unknown>> | null): string | null {
    if (!rows?.length) return null
    const lines: string[] = []
    for (const row of rows) {
      const eventType = String(row.event_type ?? '')
      const payload = (row.payload ?? {}) as Record<string, unknown>
      if (eventType === 'comment' || eventType === 'user.comment') {
        const msg = String(payload.message ?? '')
          .replace(/<[^>]+>/g, '')
          .trim()
        if (msg) lines.push(`[User]: ${msg}`)
      } else if (eventType === 'automation_comment') {
        const msg = String(payload.message ?? '')
          .replace(/<[^>]+>/g, '')
          .trim()
        if (msg) lines.push(`[Automation]: ${msg}`)
      } else if (eventType === 'agent_task_execution') {
        const status = String(payload.status ?? '')
        const agentKey = String(payload.agent_key ?? 'Agent')
        const content = String(payload.content ?? '').trim()
        if (status === 'done' && content) {
          lines.push(`[${agentKey}]: ${content.slice(0, 2000)}`)
        } else if (status === 'failed') {
          lines.push(`[${agentKey}]: (execution failed)`)
        }
      } else if (eventType === 'status_change') {
        lines.push(`[System]: Status changed from "${payload.from ?? ''}" to "${payload.to ?? ''}"`)
      } else if (eventType === 'assignee_change') {
        lines.push(
          `[System]: Assignee changed from ${formatAssigneeActivitySide(payload.from)} to ${formatAssigneeActivitySide(payload.to)}`,
        )
      } else if (eventType === 'field_change') {
        const field = String(payload.field ?? 'field')
        lines.push(`[System]: ${field} updated`)
      }
    }
    return lines.length > 0 ? lines.join('\n\n') : null
  }

  async buildConversationRefsContext(
    refs: Array<{ id: string; label?: string }>,
    userId: string,
    orgId: string | null,
  ): Promise<string | null> {
    const MAX_REFS = 10
    const unique = refs.filter(
      (ref, index, all) => ref.id && all.findIndex((row) => row.id === ref.id) === index,
    )
    if (unique.length === 0) return null

    const ids = unique.slice(0, MAX_REFS).map((ref) => ref.id)
    const { data: rows } = await this.repository.listConversationRefs(ids, userId, orgId, MAX_REFS)
    const rowMap = new Map(
      (rows ?? []).map((row: Record<string, unknown>) => [String(row.id), row]),
    )

    const lines: string[] = [
      '\n\n---\n**USER @@ REFERENCES (the user tagged these conversations in the task comment — metadata only, no transcript yet)**\n',
    ]
    for (const ref of unique.slice(0, MAX_REFS)) {
      const row = rowMap.get(ref.id) as Record<string, unknown> | undefined
      const label = ref.label?.trim() || String(row?.title ?? 'Conversation')
      if (row) {
        lines.push(
          `- [Conversation] ${label} (id: ${ref.id}, agent: ${row.agent_id ?? 'unknown'}, status: ${row.status ?? 'unknown'}, campaign_id: ${row.campaign_id ?? 'none'}, updated_at: ${row.updated_at ?? 'unknown'})`,
        )
      } else {
        lines.push(`- [Conversation] ${label} (id: ${ref.id})`)
      }
    }
    return lines.join('\n')
  }

  buildTaskContext(
    item: Record<string, unknown>,
    spaceTitle: string,
    include?: Record<string, boolean>,
  ): string {
    const hasInclude = include != null && Object.keys(include).length > 0
    const inc = (key: string) => !hasInclude || include![key] === true

    const lines: string[] = []
    lines.push(`Space: ${spaceTitle}`)
    if (inc('title') && item.title) lines.push(`Title: ${item.title}`)
    if (inc('status') && item.status) lines.push(`Status: ${item.status}`)
    if (inc('priority') && item.priority) lines.push(`Priority: ${item.priority}`)
    if (inc('due_date')) {
      if (item.due_date) lines.push(`Due date: ${item.due_date}`)
      if (item.start_date) lines.push(`Start date: ${item.start_date}`)
    }

    const custom = (item.custom_data ?? {}) as Record<string, unknown>
    const body = custom._view_type === 'doc' ? item.doc_body : item.notes
    if (inc('notes') && body) lines.push(`Description:\n${body}`)

    if (inc('tags')) {
      const tags = custom.tags
      if (Array.isArray(tags) && tags.length > 0) {
        lines.push(`Tags: ${tags.map(String).join(', ')}`)
      }
    }

    if (inc('custom_fields')) {
      for (const [key, val] of Object.entries(custom)) {
        if (key === 'tags' || key === '_view_type') continue
        if (val != null && val !== '') {
          lines.push(`${key}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
        }
      }
    } else if (!hasInclude) {
      for (const [key, val] of Object.entries(custom)) {
        if (val != null && val !== '') {
          lines.push(`${key}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
        }
      }
    }

    return lines.join('\n')
  }

  private parseSlashTokens(content: string): string[] {
    const matches = content.match(/(?:^|\s)\/([\w][\w-]*)/g)
    if (!matches) return []
    return [...new Set(matches.map((match) => match.trim().slice(1)))]
  }
}
