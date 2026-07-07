import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentSyncMaterializationRepository } from '../repositories/agent-sync-materialization.repository'

type AgentSyncBrainManifestEntry = {
  agentKey: string
  filePath: string
  content?: string
  category: string
  status: 'ok' | 'failed'
  error?: string
}

export interface SyncBrainLibraryInput {
  agentBaseDir: string
  agentDirOverride?: string
  agentKey: string
  logger: Logger
  manifest: AgentSyncBrainManifestEntry[]
  userId: string
}

@Injectable()
export class AgentSyncBrainLibraryService {
  private readonly supabase: SupabaseClient

  constructor(
    svc: SupabaseServiceClient,
    private readonly materializationRepository: AgentSyncMaterializationRepository = new AgentSyncMaterializationRepository(),
  ) {
    this.supabase = svc.client
  }

  async syncBrainLibrary(input: SyncBrainLibraryInput): Promise<number> {
    let synced = 0
    try {
      const { data: brainRows } = await this.materializationRepository.listBrainLibraryBrains(
        this.supabase,
        input.userId,
      )
      const brains = (brainRows ?? []) as Array<{
        id: string
        agent_id?: string | null
        campaign_id?: string | null
        is_default?: boolean | null
      }>
      if (!brains?.length) return 0

      for (const brain of brains) {
        const dirSuffix = brain.campaign_id
          ? `brain-campaign-${String(brain.campaign_id).slice(0, 8)}`
          : brain.agent_id
            ? `brain-${brain.agent_id}`
            : 'brain'
        const brainDir = path.join(
          input.agentDirOverride ?? path.join(input.agentBaseDir, input.agentKey),
          dirSuffix,
        )
        await fs.mkdir(brainDir, { recursive: true })

        const { data: pageRows } = await this.materializationRepository.listBrainNarrativePages(
          this.supabase,
          brain.id,
        )
        const pages = (pageRows ?? []) as Array<{
          slug: string
          content_md?: string | null
          page_type?: string | null
        }>

        const existingFiles = await this.listExistingMarkdownFiles(brainDir)
        const writtenSlugs = new Set<string>()
        for (const page of pages ?? []) {
          const fileName = this.resolvePageFileName(page.slug)
          const filePath = path.join(brainDir, fileName)
          try {
            await fs.writeFile(filePath, page.content_md ?? '', 'utf-8')
            writtenSlugs.add(fileName)
            synced++
            input.manifest.push({
              agentKey: input.agentKey,
              filePath,
              content: page.content_md ?? '',
              category: 'brain-page',
              status: 'ok',
            })
          } catch (err) {
            input.manifest.push({
              agentKey: input.agentKey,
              filePath,
              content: page.content_md ?? '',
              category: 'brain-page',
              status: 'failed',
              error: (err as Error).message,
            })
          }
        }

        const logWritten = await this.writeBrainLog(brainDir, brain.id)
        if (logWritten) {
          writtenSlugs.add('LOG.md')
          synced++
        }

        await this.cleanupStaleMarkdownFiles(brainDir, existingFiles, writtenSlugs)
      }

      input.logger.log(
        `[brain-library] Synced ${synced} pages across ${brains.length} brain(s) for ${input.agentKey}`,
      )
    } catch (err) {
      input.logger.warn(
        `[brain-library] Sync failed for ${input.agentKey}: ${(err as Error).message}`,
      )
    }
    return synced
  }

  private async listExistingMarkdownFiles(brainDir: string): Promise<Set<string>> {
    const existingFiles = new Set<string>()
    try {
      const entries = await fs.readdir(brainDir)
      for (const entry of entries) {
        if (entry.endsWith('.md')) existingFiles.add(entry)
      }
    } catch {
      // directory may not exist yet
    }
    return existingFiles
  }

  private resolvePageFileName(slug: string): string {
    if (slug === 'capsule') return 'CAPSULE.md'
    if (slug === 'index') return 'INDEX.md'
    return `${slug}.md`
  }

  private async writeBrainLog(brainDir: string, brainId: string): Promise<boolean> {
    const { data: logRows } = await this.materializationRepository.listBrainLogEntries(
      this.supabase,
      brainId,
    )
    const logEntries = (logRows ?? []) as Array<{
      event_type?: string | null
      summary?: string | null
      affected_pages?: unknown
      created_at?: string | null
    }>

    if (!logEntries?.length) return false
    const logMd = logEntries
      .map((entry) => {
        const date = typeof entry.created_at === 'string' ? entry.created_at.slice(0, 16) : ''
        const pages = Array.isArray(entry.affected_pages) ? entry.affected_pages.join(', ') : ''
        return `- [${date}] ${entry.event_type}: ${entry.summary}${pages ? ` (${pages})` : ''}`
      })
      .join('\n')
    const logPath = path.join(brainDir, 'LOG.md')
    await fs.writeFile(logPath, `# Brain Log\n\n${logMd}\n`, 'utf-8')
    return true
  }

  private async cleanupStaleMarkdownFiles(
    brainDir: string,
    existingFiles: Set<string>,
    writtenSlugs: Set<string>,
  ): Promise<void> {
    for (const existing of existingFiles) {
      if (writtenSlugs.has(existing)) continue
      try {
        await fs.unlink(path.join(brainDir, existing))
      } catch {
        // best-effort cleanup
      }
    }
  }
}
