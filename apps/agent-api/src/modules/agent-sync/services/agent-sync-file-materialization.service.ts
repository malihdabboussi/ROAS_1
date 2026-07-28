import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import {
  toSafeSkillResourcePath,
  toSkillDirName,
  toSkillImageReferencePath,
} from './agent-runtime-skill-paths'

type AgentSyncManifestEntry = {
  category: string
  agentKey: string
  filePath: string
  content?: string
  status: 'ok' | 'failed'
  error?: string
}

type AgentSkillRow = {
  agent_key: string
  skill_key: string
  description: string
  markdown_content: string
}

type AgentSkillResourceRow = {
  skill_key: string
  file_path: string
  content: string | null
  content_type?: string
  storage_url?: string | null
}

type AgentWorkflowRow = {
  workflow_key: string
  description: string
  markdown_content: string
}

type SkillImageManifestEntry = {
  skill_key: string
  file_path: string
  content_type: string
  description: string
  storage_url: string
}

const SKILL_KEY_VIBEY_API = 'vibey-api'

@Injectable()
export class AgentSyncFileMaterializationService {
  private readonly logger = new Logger(AgentSyncFileMaterializationService.name)

  async syncAgentSkills(params: {
    agentsBaseDir: string
    agentKey: string
    rows: AgentSkillRow[]
    resources: AgentSkillResourceRow[]
    useKeyAsDir?: boolean
    manifest?: AgentSyncManifestEntry[]
    replaceExisting?: boolean
    writeIndex?: boolean
  }): Promise<number> {
    const agentDir = params.useKeyAsDir
      ? params.agentKey
      : path.join(params.agentsBaseDir, params.agentKey)
    const resolvedAgentKey = params.useKeyAsDir ? path.basename(params.agentKey) : params.agentKey
    const skillsRoot = path.join(agentDir, 'skills')
    if (params.replaceExisting !== false) {
      await fs.rm(skillsRoot, { recursive: true, force: true })
    }
    await fs.mkdir(skillsRoot, { recursive: true })

    let synced = 0
    for (const row of params.rows) {
      const dirName = toSkillDirName(row.skill_key)
      const skillDir = path.join(skillsRoot, dirName)
      const skillFilePath = path.join(skillDir, 'SKILL.md')
      const skillContent = this.buildSkillMarkdown(row)
      try {
        await fs.mkdir(skillDir, { recursive: true })
        await fs.writeFile(skillFilePath, skillContent, 'utf-8')
        params.manifest?.push({
          category: 'skill',
          agentKey: resolvedAgentKey,
          filePath: skillFilePath,
          content: skillContent,
          status: 'ok',
        })
        const skillResources = params.resources.filter(
          (resource) => toSkillDirName(resource.skill_key) === dirName,
        )
        const imageManifestEntries: SkillImageManifestEntry[] = []
        for (const resource of skillResources) {
          const isImage = resource.content_type && !resource.content_type.startsWith('text/')
          const shouldWriteImageReference = Boolean(isImage && resource.storage_url)
          if (!shouldWriteImageReference && !resource.content) continue
          const safeResourcePath = toSafeSkillResourcePath(resource.file_path)
          const safeResource =
            safeResourcePath === resource.file_path
              ? resource
              : { ...resource, file_path: safeResourcePath }
          if (shouldWriteImageReference) {
            const refName = toSkillImageReferencePath(safeResourcePath)
            const refPath = this.resolveSkillResourcePath(skillDir, refName)
            await fs.mkdir(path.dirname(refPath), { recursive: true })
            const md = this.buildSkillImageReferenceMarkdown(safeResource)
            await fs.writeFile(refPath, md, 'utf-8')
            params.manifest?.push({
              category: 'skill-resource',
              agentKey: resolvedAgentKey,
              filePath: refPath,
              content: md,
              status: 'ok',
            })
            const imageManifestEntry = this.buildSkillImageManifestEntry(safeResource)
            if (imageManifestEntry) {
              imageManifestEntries.push(imageManifestEntry)
            }
          } else if (resource.content) {
            const resourcePath = this.resolveSkillResourcePath(skillDir, safeResourcePath)
            await fs.mkdir(path.dirname(resourcePath), { recursive: true })
            await fs.writeFile(resourcePath, resource.content, 'utf-8')
            params.manifest?.push({
              category: 'skill-resource',
              agentKey: resolvedAgentKey,
              filePath: resourcePath,
              content: resource.content,
              status: 'ok',
            })
          }
        }
        if (imageManifestEntries.length > 0) {
          imageManifestEntries.sort((a, b) => a.file_path.localeCompare(b.file_path))
          const manifestPath = path.join(skillDir, 'references', 'images.json')
          const manifestContent = `${JSON.stringify(imageManifestEntries, null, 2)}\n`
          await fs.mkdir(path.dirname(manifestPath), { recursive: true })
          await fs.writeFile(manifestPath, manifestContent, 'utf-8')
          params.manifest?.push({
            category: 'skill-resource',
            agentKey: resolvedAgentKey,
            filePath: manifestPath,
            content: manifestContent,
            status: 'ok',
          })
        }
        synced++
      } catch (err) {
        const msg = (err as Error).message
        this.logger.error(`Failed to write ${skillFilePath}: ${msg}`)
        params.manifest?.push({
          category: 'skill',
          agentKey: resolvedAgentKey,
          filePath: skillFilePath,
          content: skillContent,
          status: 'failed',
          error: msg,
        })
      }
    }

    if (params.writeIndex !== false) {
      await this.writeSkillsIndex(agentDir, params.rows)
    }
    return synced
  }

  async syncAgentWorkflows(params: {
    agentsBaseDir: string
    agentKey: string
    rows: AgentWorkflowRow[]
    useKeyAsDir?: boolean
    manifest?: AgentSyncManifestEntry[]
  }): Promise<number> {
    const agentDir = params.useKeyAsDir
      ? params.agentKey
      : path.join(params.agentsBaseDir, params.agentKey)
    const resolvedAgentKey = params.useKeyAsDir ? path.basename(params.agentKey) : params.agentKey
    const workflowsRoot = path.join(agentDir, 'workflows')
    await fs.rm(workflowsRoot, { recursive: true, force: true })
    await fs.mkdir(workflowsRoot, { recursive: true })

    let synced = 0
    for (const row of params.rows) {
      const dirName = toSkillDirName(row.workflow_key)
      const wfDir = path.join(workflowsRoot, dirName)
      const wfFilePath = path.join(wfDir, 'SKILL.md')
      const wfContent = this.buildWorkflowMarkdown(row)
      try {
        await fs.mkdir(wfDir, { recursive: true })
        await fs.writeFile(wfFilePath, wfContent, 'utf-8')
        params.manifest?.push({
          category: 'workflow',
          agentKey: resolvedAgentKey,
          filePath: wfFilePath,
          content: wfContent,
          status: 'ok',
        })
        synced++
      } catch (err) {
        const msg = (err as Error).message
        this.logger.error(`Failed to write ${wfFilePath}: ${msg}`)
        params.manifest?.push({
          category: 'workflow',
          agentKey: resolvedAgentKey,
          filePath: wfFilePath,
          content: wfContent,
          status: 'failed',
          error: msg,
        })
      }
    }

    await this.writeWorkflowsIndex(agentDir, params.rows)
    return synced
  }

  private resolveSkillResourcePath(skillDir: string, resourceFilePath: string): string {
    const safeResourceFilePath = toSafeSkillResourcePath(resourceFilePath)
    const resolvedSkillDir = path.resolve(skillDir)
    const resolvedResourcePath = path.resolve(resolvedSkillDir, safeResourceFilePath)
    if (!resolvedResourcePath.startsWith(resolvedSkillDir + path.sep)) {
      throw new Error(`Unsafe skill resource path: ${resourceFilePath}`)
    }
    return resolvedResourcePath
  }

  private buildSkillMarkdown(row: AgentSkillRow): string {
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

  private buildSkillImageReferenceMarkdown(resource: AgentSkillResourceRow): string {
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
    resource: AgentSkillResourceRow,
  ): SkillImageManifestEntry | null {
    const contentType = resource.content_type?.trim()
    const storageUrl = resource.storage_url?.trim()
    if (!contentType || !storageUrl) return null
    return {
      skill_key: resource.skill_key,
      file_path: resource.file_path,
      content_type: contentType,
      description: resource.content?.trim() || resource.file_path,
      storage_url: storageUrl,
    }
  }

  private async writeSkillsIndex(agentDir: string, rows: AgentSkillRow[]): Promise<void> {
    const indexPath = path.join(agentDir, 'SKILLS.md')
    const seen = new Set<string>()
    const lines = ['# SKILLS.md — Available Skills', '']
    lines.push(
      'Skills are step-by-step workflows that guide you through creating specific assets. Before creating any asset, read the matching skill first — it tells you what context to gather, what order to follow, and what quality gates to hit.',
      '',
      'To use a skill: `read skills/{skill-key}/SKILL.md`',
      '',
      '| Skill | Description |',
      '| ----- | ----------- |',
    )
    for (const row of rows) {
      if (seen.has(row.skill_key)) continue
      seen.add(row.skill_key)
      const desc = row.description.replace(/\|/g, '\\|')
      lines.push(`| \`${row.skill_key}\` | ${desc} |`)
    }
    if (!seen.has(SKILL_KEY_VIBEY_API)) {
      lines.push(
        `| \`vibey-api\` | Everything you can create, update, and manage — offers, funnels, sequences, lead magnets, documents, and more. Read before building anything. |`,
      )
    }
    lines.push('')
    try {
      await fs.writeFile(indexPath, lines.join('\n'), 'utf-8')
    } catch (err) {
      this.logger.error(`Failed to write ${indexPath}: ${(err as Error).message}`)
    }
  }

  private buildWorkflowMarkdown(row: AgentWorkflowRow): string {
    const body = this.stripFrontmatter(row.markdown_content)
    return (
      `---
name: ${row.workflow_key}
description: ${row.description}
---

${body}`.trim() + '\n'
    )
  }

  private async writeWorkflowsIndex(agentDir: string, rows: AgentWorkflowRow[]): Promise<void> {
    const indexPath = path.join(agentDir, 'WORKFLOWS.md')
    if (rows.length === 0) return
    const seen = new Set<string>()
    const lines = ['# WORKFLOWS.md — Available Workflows', '']
    lines.push(
      'Workflows are multi-step flows that chain multiple skills together in a specific order. Use a workflow when you want to run a complete process end-to-end.',
      '',
      'To use a workflow: type `/{workflow-key}` as a slash command, or `read workflows/{workflow-key}/SKILL.md`',
      '',
      '| Workflow | Description |',
      '| -------- | ----------- |',
    )
    for (const row of rows) {
      if (seen.has(row.workflow_key)) continue
      seen.add(row.workflow_key)
      const desc = row.description.replace(/\|/g, '\\|')
      lines.push(`| \`${row.workflow_key}\` | ${desc} |`)
    }
    lines.push('')
    try {
      await fs.writeFile(indexPath, lines.join('\n'), 'utf-8')
    } catch (err) {
      this.logger.error(`Failed to write ${indexPath}: ${(err as Error).message}`)
    }
  }
}
