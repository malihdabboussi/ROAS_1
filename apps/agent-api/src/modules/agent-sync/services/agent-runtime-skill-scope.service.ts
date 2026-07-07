import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentSyncRepository } from '../repositories/agent-sync.repository'
import {
  buildRuntimeSkillFileRequirements,
  toSafeSkillResourcePath,
  toSkillImageReferencePath,
  type RuntimeSkillFileRequirement,
} from './agent-runtime-skill-paths'

export interface RuntimeSkillRow {
  id: string
  agent_key: string
  skill_key: string
  name: string
  description: string
  markdown_content: string
  is_enabled: boolean
  archetype_filter: string[] | null
  user_id?: string | null
  org_id?: string | null
}

export interface RuntimeSkillResourceRow {
  agent_key: string
  skill_key: string
  file_path: string
  content: string | null
  content_type?: string | null
  storage_url?: string | null
  user_id?: string | null
  org_id?: string | null
}

export interface RuntimeSkillCatalogEntry {
  id: string
  skill_key: string
  name: string
  description: string
}

export interface RuntimeSkillCatalog {
  source: 'vibey_db'
  entries: RuntimeSkillCatalogEntry[]
}

export interface RuntimeSkillScopeInput {
  agentKey: string
  userId: string
  orgId?: string | null
  skillKeys?: string[]
  archetype?: string | null
}

export interface RuntimeSkillScopeResult {
  skills: RuntimeSkillRow[]
  resources: RuntimeSkillResourceRow[]
  requiredSkillFiles: RuntimeSkillFileRequirement[]
}

export interface RuntimeSkillReadResult {
  skill_key: string
  path?: string
  content: string
  content_type: string
  source: 'skill' | 'resource'
}

interface RuntimeSkillMetadataRow {
  id: string
  agent_key: string
  skill_key: string
  name: string
  description: string
  is_enabled: boolean
  archetype_filter: string[] | null
  user_id?: string | null
  org_id?: string | null
}

interface SkillImageManifestEntry {
  skill_key: string
  file_path: string
  content_type: string
  description: string
  storage_url: string
}

interface RuntimeSkillCatalogCacheEntry {
  resolvedAt: number
  catalog: RuntimeSkillCatalog
}

const REMOVED_SKILL_RESOURCE_CONTENT_TYPE = 'application/vnd.vibey.resource-removed'
const RUNTIME_SKILL_CACHE_TTL_MS = 5 * 60_000

@Injectable()
export class AgentRuntimeSkillScopeService {
  private readonly logger = new Logger(AgentRuntimeSkillScopeService.name)
  private readonly supabase: SupabaseClient
  private readonly catalogCache = new Map<string, RuntimeSkillCatalogCacheEntry>()

  constructor(
    svc: SupabaseServiceClient,
    private readonly repository: AgentSyncRepository = new AgentSyncRepository(),
  ) {
    this.supabase = svc.client
  }

  async resolveRuntimeSkillScope(input: RuntimeSkillScopeInput): Promise<RuntimeSkillScopeResult> {
    const skillKeys = [...new Set((input.skillKeys ?? []).filter(Boolean))]
    const [skillsResult, resourcesResult] = await Promise.all([
      this.repository.listRuntimeSkills(this.supabase, { ...input, skillKeys }),
      this.repository.listRuntimeSkillResources(this.supabase, { ...input, skillKeys }),
    ])

    if (skillsResult.errorMessage) {
      this.logger.warn(`Failed to resolve runtime skills: ${skillsResult.errorMessage}`)
      return { skills: [], resources: [], requiredSkillFiles: [] }
    }
    if (resourcesResult.errorMessage) {
      this.logger.warn(
        `Failed to resolve runtime skill resources: ${resourcesResult.errorMessage}`,
      )
      return { skills: [], resources: [], requiredSkillFiles: [] }
    }

    const skills = this.deduplicateSkills(
      (skillsResult.rows as unknown as RuntimeSkillRow[]).filter((row) =>
        this.matchesArchetype(row.archetype_filter, input.archetype),
      ),
      input,
    )
    const enabledSkillKeys = new Set(skills.map((skill) => skill.skill_key))
    const resources = this.deduplicateResources(
      (resourcesResult.rows as unknown as RuntimeSkillResourceRow[]).filter((row) =>
        enabledSkillKeys.has(row.skill_key),
      ),
      input,
    )

    return {
      skills,
      resources,
      requiredSkillFiles: buildRuntimeSkillFileRequirements(skills, resources),
    }
  }

  async resolveRuntimeSkillCatalog(input: RuntimeSkillScopeInput): Promise<RuntimeSkillCatalog> {
    const skillKeys = [...new Set((input.skillKeys ?? []).filter(Boolean))]
    const cacheKey = this.skillCatalogCacheKey({ ...input, skillKeys })
    const cached = this.catalogCache.get(cacheKey)
    if (cached && Date.now() - cached.resolvedAt < RUNTIME_SKILL_CACHE_TTL_MS) {
      return this.cloneCatalog(cached.catalog)
    }

    const { rows: metadataRows, errorMessage } = await this.repository.listRuntimeSkillMetadata(
      this.supabase,
      {
        ...input,
        skillKeys,
      },
    )
    if (errorMessage) {
      this.logger.warn(`Failed to resolve runtime skill catalog: ${errorMessage}`)
      return { source: 'vibey_db', entries: [] }
    }
    const rows = this.deduplicateSkillRows(
      (metadataRows as unknown as RuntimeSkillMetadataRow[]).filter((row) =>
        this.matchesArchetype(row.archetype_filter, input.archetype),
      ),
      input,
    )
    const catalog: RuntimeSkillCatalog = {
      source: 'vibey_db',
      entries: rows.map((row) => ({
        id: `db:${row.skill_key}`,
        skill_key: row.skill_key,
        name: row.skill_key,
        description: row.description ?? '',
      })),
    }
    this.catalogCache.set(cacheKey, { resolvedAt: Date.now(), catalog })
    return this.cloneCatalog(catalog)
  }

  bustRuntimeSkillCatalogCache(input?: {
    agentKey?: string
    userId?: string
    orgId?: string | null
  }): void {
    if (!input) {
      this.catalogCache.clear()
      return
    }
    for (const key of this.catalogCache.keys()) {
      if (input.agentKey && !key.includes(`agent:${input.agentKey}`)) continue
      if (input.orgId !== undefined && !key.includes(`org:${input.orgId ?? ''}`)) continue
      if (input.userId && !key.includes(`user:${input.userId}`)) continue
      this.catalogCache.delete(key)
    }
  }

  async resolveAgentArchetype(input: {
    agentKey: string
    userId: string
    orgId?: string | null
  }): Promise<string | null> {
    const { config, errorMessage } = await this.repository.lookupAgentArchetypeConfig(
      this.supabase,
      input,
    )
    if (errorMessage) {
      this.logger.warn(
        `Failed to resolve agent archetype for ${input.agentKey}: ${errorMessage}`,
      )
      return null
    }
    return typeof config?.archetype === 'string' && config.archetype.trim()
      ? config.archetype.trim()
      : null
  }

  async readRuntimeSkill(
    input: RuntimeSkillScopeInput & { skillKey: string; path?: string },
  ): Promise<RuntimeSkillReadResult | null> {
    const scope = await this.resolveRuntimeSkillScope({
      agentKey: input.agentKey,
      userId: input.userId,
      orgId: input.orgId,
      archetype: input.archetype,
      skillKeys: [input.skillKey],
    })
    const skill = scope.skills.find((row) => row.skill_key === input.skillKey)
    if (!skill) return null
    if (!input.path) {
      return {
        skill_key: skill.skill_key,
        content: this.buildSkillMarkdown(skill),
        content_type: 'text/markdown',
        source: 'skill',
      }
    }

    const safePath = toSafeSkillResourcePath(input.path)
    const libraryResources = await this.fetchLibraryResources([skill.skill_key])
    const resources = this.mergeWithLibraryFallback(scope.resources, libraryResources)
    const resourceContent = this.resolveRuntimeSkillResourceContent(resources, safePath)
    if (!resourceContent) return null
    return {
      skill_key: skill.skill_key,
      path: safePath,
      content: resourceContent.content,
      content_type: resourceContent.contentType,
      source: 'resource',
    }
  }

  private async fetchLibraryResources(skillKeys: string[]): Promise<RuntimeSkillResourceRow[]> {
    if (skillKeys.length === 0) return []
    const { rows, errorMessage } = await this.repository.listSkillLibraryResources(
      this.supabase,
      skillKeys,
    )
    if (errorMessage) {
      this.logger.warn(`Failed to fetch skill library resources: ${errorMessage}`)
      return []
    }
    return rows.map((row) => ({
      agent_key: '__library__',
      skill_key: row.skill_key as string,
      file_path: row.file_path as string,
      content: row.content as string | null,
      content_type: (row.content_type as string) ?? undefined,
      storage_url: (row.storage_url as string) ?? null,
    }))
  }

  private mergeWithLibraryFallback(
    agentResources: RuntimeSkillResourceRow[],
    libraryResources: RuntimeSkillResourceRow[],
  ): RuntimeSkillResourceRow[] {
    const agentSkillKeys = new Set(agentResources.map((row) => row.skill_key))
    return [
      ...agentResources,
      ...libraryResources.filter((row) => !agentSkillKeys.has(row.skill_key)),
    ]
  }

  private resolveRuntimeSkillResourceContent(
    resources: RuntimeSkillResourceRow[],
    safePath: string,
  ): { content: string; contentType: string } | null {
    if (safePath === 'references/images.json') {
      const manifest = resources
        .map((resource) => this.buildSkillImageManifestEntry(resource))
        .filter((entry): entry is SkillImageManifestEntry => Boolean(entry))
        .sort((a, b) => a.file_path.localeCompare(b.file_path))
      if (manifest.length === 0) return null
      return { content: `${JSON.stringify(manifest, null, 2)}\n`, contentType: 'application/json' }
    }

    for (const resource of resources) {
      const isImage = this.isImageResource(resource)
      let resourcePath: string
      try {
        resourcePath = isImage
          ? toSkillImageReferencePath(resource.file_path)
          : toSafeSkillResourcePath(resource.file_path)
      } catch {
        continue
      }
      if (resourcePath !== safePath) continue
      if (isImage) {
        return {
          content: this.buildSkillImageReferenceMarkdown(resource),
          contentType: 'text/markdown',
        }
      }
      if (resource.content) {
        return {
          content: resource.content,
          contentType: resource.content_type?.trim() || 'text/plain',
        }
      }
    }
    return null
  }

  private buildSkillMarkdown(row: RuntimeSkillRow): string {
    const body = this.stripFrontmatter(row.markdown_content)
    return (
      `---
name: ${row.skill_key}
description: ${row.description}
---

${body}`.trim() + '\n'
    )
  }

  private stripFrontmatter(content: string): string {
    const trimmed = content.trim()
    if (!trimmed.startsWith('---')) return trimmed
    const endIdx = trimmed.indexOf('---', 3)
    if (endIdx === -1) return trimmed
    return trimmed.slice(endIdx + 3).trim()
  }

  private isImageResource(resource: RuntimeSkillResourceRow): boolean {
    const contentType = resource.content_type?.trim()
    return Boolean(contentType && !contentType.startsWith('text/') && resource.storage_url?.trim())
  }

  private buildSkillImageReferenceMarkdown(resource: RuntimeSkillResourceRow): string {
    const description = resource.content?.trim() || resource.file_path
    return [
      `# ${resource.file_path}`,
      '',
      description,
      '',
      `Use the \`image\` tool with \`skill://${resource.skill_key}/${resource.file_path}\` to visually inspect this reference.`,
      '',
      `Source: ${resource.storage_url}`,
      '',
    ].join('\n')
  }

  private buildSkillImageManifestEntry(
    resource: RuntimeSkillResourceRow,
  ): SkillImageManifestEntry | null {
    const contentType = resource.content_type?.trim()
    const storageUrl = resource.storage_url?.trim()
    if (!contentType || !storageUrl || contentType.startsWith('text/')) return null
    return {
      skill_key: resource.skill_key,
      file_path: resource.file_path,
      content_type: contentType,
      description: resource.content?.trim() || resource.file_path,
      storage_url: storageUrl,
    }
  }

  private skillCatalogCacheKey(input: RuntimeSkillScopeInput): string {
    const skillKeys = [...new Set((input.skillKeys ?? []).filter(Boolean))].sort()
    return [
      `agent:${input.agentKey}`,
      `user:${input.userId}`,
      `org:${input.orgId ?? ''}`,
      `archetype:${input.archetype ?? ''}`,
      `skills:${skillKeys.join(',')}`,
    ].join('|')
  }

  private cloneCatalog(catalog: RuntimeSkillCatalog): RuntimeSkillCatalog {
    return {
      source: catalog.source,
      entries: catalog.entries.map((entry) => ({ ...entry })),
    }
  }

  private matchesArchetype(archetypeFilter: string[] | null, archetype: string | null | undefined) {
    return (
      !archetypeFilter ||
      archetypeFilter.length === 0 ||
      (typeof archetype === 'string' && archetypeFilter.includes(archetype))
    )
  }

  private scopeRank(
    row: { user_id?: string | null; org_id?: string | null },
    input: RuntimeSkillScopeInput,
  ): number {
    if (input.orgId) return row.org_id === input.orgId ? 2 : 1
    return row.user_id === input.userId ? 2 : 1
  }

  private agentRank(row: { agent_key: string }, input: RuntimeSkillScopeInput): number {
    return row.agent_key === input.agentKey ? 2 : 1
  }

  private compareRows<
    T extends { agent_key: string; user_id?: string | null; org_id?: string | null },
  >(candidate: T, existing: T, input: RuntimeSkillScopeInput): number {
    const candidateScope = this.scopeRank(candidate, input)
    const existingScope = this.scopeRank(existing, input)
    if (candidateScope !== existingScope) return candidateScope - existingScope
    return this.agentRank(candidate, input) - this.agentRank(existing, input)
  }

  private deduplicateSkillRows<
    T extends {
      skill_key: string
      agent_key: string
      user_id?: string | null
      org_id?: string | null
    },
  >(rows: T[], input: RuntimeSkillScopeInput): T[] {
    const seen = new Map<string, T>()
    for (const row of rows) {
      const existing = seen.get(row.skill_key)
      if (!existing || this.compareRows(row, existing, input) > 0) {
        seen.set(row.skill_key, row)
      }
    }
    return [...seen.values()].sort((a, b) => a.skill_key.localeCompare(b.skill_key))
  }

  private deduplicateSkills(
    rows: RuntimeSkillRow[],
    input: RuntimeSkillScopeInput,
  ): RuntimeSkillRow[] {
    return this.deduplicateSkillRows(rows, input)
  }

  private deduplicateResources(
    rows: RuntimeSkillResourceRow[],
    input: RuntimeSkillScopeInput,
  ): RuntimeSkillResourceRow[] {
    const seen = new Map<string, RuntimeSkillResourceRow>()
    for (const row of rows) {
      const key = `${row.skill_key}:${row.file_path}`
      const existing = seen.get(key)
      if (!existing || this.compareRows(row, existing, input) > 0) {
        seen.set(key, row)
      }
    }
    return [...seen.values()]
      .filter((row) => row.content_type !== REMOVED_SKILL_RESOURCE_CONTENT_TYPE)
      .sort((a, b) => {
        const skillOrder = a.skill_key.localeCompare(b.skill_key)
        return skillOrder !== 0 ? skillOrder : a.file_path.localeCompare(b.file_path)
      })
  }
}
