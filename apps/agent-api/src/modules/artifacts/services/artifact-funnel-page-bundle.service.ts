import { Injectable, Logger } from '@nestjs/common'
import { ArtifactFunnelsRepository } from '../repositories/artifact-funnels.repository'
import {
  lintFunnelBundle,
  validateBundleFileContent,
  validateFunnelBundleFiles,
} from '../utils/html-bundle.util'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'
import { ArtifactFunnelFileSupportService } from './artifact-funnel-file-support.service'

@Injectable()
export class ArtifactFunnelPageBundleService {
  private readonly logger = new Logger(ArtifactFunnelPageBundleService.name)

  constructor(
    private readonly fileSupportService: ArtifactFunnelFileSupportService = new ArtifactFunnelFileSupportService(),
    private readonly funnelsRepository: ArtifactFunnelsRepository = new ArtifactFunnelsRepository(),
  ) {}

  async addFunnelPageBundle(
    target: Record<string, any>,
    input: Record<string, unknown>,
    files: Array<{ path: string; content: string; role: string }>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    const startedAt = Date.now()
    const trace = this.fileSupportService.buildTrace(
      target,
      sessionKey,
      input,
      'add_funnel_page_bundle',
    )
    this.logger.log(`[FunnelBundleSave] start ${trace} fileCount=${files.length}`)

    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const { supabase, funnel, userId } = resolved

    const entryFile = files.find((file) => file.path === 'index.html')
    if (!entryFile) {
      return {
        success: false,
        error:
          'BUNDLE_INVALID: The page was NOT saved — files must include an index.html entry (complete HTML document).',
      }
    }
    const entryError = validateBundleFileContent('index.html', entryFile.content)
    if (entryError) {
      this.logger.warn(`[FunnelBundleSave] abort ${trace} reason=entry_invalid error=${entryError}`)
      return {
        success: false,
        error: `BUNDLE_INVALID: The page was NOT saved — fix index.html and retry: ${entryError}`,
      }
    }
    const rejectedFiles: Array<{ path: string; error: string }> = []
    const validFiles = files.filter((file) => {
      if (file.path === 'index.html') return true
      const fileError = validateBundleFileContent(file.path, file.content)
      if (fileError) {
        rejectedFiles.push({ path: file.path, error: fileError })
        return false
      }
      return true
    })

    await target.emitProgress(onProgress, 'Building your page')
    const pagePath = typeof input.path === 'string' ? input.path : null
    const { data, error } = await this.funnelsRepository.createFunnelPage(supabase, {
      funnel_id: resolved.funnelId,
      name: (input.name as string) ?? 'Untitled Page',
      slug: (input.slug as string) ?? 'untitled',
      page_type: (input.page_type as string) ?? 'opt-in',
      generated_html: '',
      generated_css: '',
      order_index: (input.order_index as number) ?? 0,
      generation_mode: (input.generation_mode as string) ?? 'generated',
      source_mode: 'html_bundle',
      ...(pagePath != null ? { path: pagePath } : {}),
    })
    if (error) throw error
    const row = data as Record<string, unknown>

    await target.emitProgress(onProgress, 'Saving your page files')
    await this.fileSupportService.writeFunnelFileRows(supabase, funnel, validFiles, String(row.id))

    const knownPaths = await this.fileSupportService.getFunnelKnownPaths(supabase, resolved.funnelId)
    const lint = lintFunnelBundle({ files: validFiles, knownPaths })

    const spaceId =
      getActiveSpaceId(input) ??
      (typeof funnel.space_id === 'string' && funnel.space_id.trim() ? funnel.space_id : null)
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId: funnel.campaign_id as string | null | undefined,
      viewType: funnel.funnel_type === 'website' ? 'websites' : 'funnels',
      logger: this.logger,
    })

    await target.emitProgress(onProgress, 'Connecting your page settings')
    const entry = files.find((file) => file.path === 'index.html')
    await this.fileSupportService.syncEmailCaptureFromBundleEntry({
      supabase,
      userId,
      funnelId: resolved.funnelId,
      funnelPageId: String(row.id),
      entryContent: entry?.content ?? '',
    })
    await target.emitProgress(onProgress, 'Page is ready')
    this.logger.log(`[FunnelBundleSave] success ${trace} durationMs=${Date.now() - startedAt}`)
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-funnel-page-${row.id}`,
          artifactType: 'funnel',
          artifactId: resolved.funnelId,
          name: String(row.name ?? 'Untitled Page'),
          funnelPageId: String(row.id),
          spaceId: spaceId ?? undefined,
        },
      ],
      ...row,
      source_mode: 'html_bundle',
      file_count: validFiles.length,
      ...(rejectedFiles.length > 0
        ? {
            rejected_files: rejectedFiles,
            next_step:
              'Some files were NOT saved (see rejected_files). Fix each one and save it with write_funnel_file, then confirm bundle_errors is empty before finishing.',
          }
        : {}),
      ...(lint.errors.length > 0 ? { bundle_errors: lint.errors } : {}),
      ...(lint.warnings.length > 0 ? { bundle_warnings: lint.warnings } : {}),
    }
  }

  async updateFunnelPageBundle(
    target: Record<string, any>,
    input: Record<string, unknown>,
    files: Array<{ path: string; content: string; role: string }>,
    sessionKey?: string,
  ) {
    const funnelPageId = String(input.funnel_page_id ?? '').trim()
    if (!funnelPageId) return { success: false, error: 'funnel_page_id required' }
    const startedAt = Date.now()
    const trace = this.fileSupportService.buildTrace(
      target,
      sessionKey,
      input,
      'update_funnel_page_bundle',
    )
    this.logger.log(`[FunnelBundleUpdate] start ${trace} fileCount=${files.length}`)

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data: page, error: pageError } = await this.funnelsRepository.findFunnelPageFunnelId(
      supabase,
      funnelPageId,
    )
    if (pageError) throw pageError
    if (!page) return { success: false, error: 'Funnel page not found' }

    const resolved = await this.fileSupportService.getOwnedFunnel(
      target,
      { funnel_id: (page as any).funnel_id },
      sessionKey,
    )
    if ('error' in resolved) return { success: false, error: resolved.error }

    const knownPaths = await this.fileSupportService.getFunnelKnownPaths(
      supabase,
      resolved.funnelId,
    )
    const validation = validateFunnelBundleFiles({ files, knownPaths })
    if (validation.errors.length > 0) {
      this.logger.warn(
        `[FunnelBundleUpdate] abort ${trace} reason=bundle_invalid errors=${validation.errors.join(' | ')}`,
      )
      return {
        success: false,
        error: `BUNDLE_INVALID: The existing page was NOT overwritten. Fix these problems and retry: ${validation.errors.join(' ')}`,
      }
    }

    const updates: Record<string, unknown> = {
      source_mode: 'html_bundle',
      generated_html: '',
      generated_css: '',
    }
    for (const key of ['name', 'slug', 'page_type', 'order_index', 'generation_mode', 'path']) {
      if (input[key] !== undefined) updates[key] = input[key]
    }
    const { data, error } = await this.funnelsRepository.updateFunnelPage(supabase, {
      funnelPageId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Funnel page not found' }

    await this.fileSupportService.replaceFunnelPageFiles(
      supabase,
      resolved.funnel,
      funnelPageId,
      files,
    )

    const entry = files.find((file) => file.path === 'index.html')
    await this.fileSupportService.syncEmailCaptureFromBundleEntry({
      supabase,
      userId,
      funnelId: resolved.funnelId,
      funnelPageId,
      entryContent: entry?.content ?? '',
    })
    this.logger.log(`[FunnelBundleUpdate] success ${trace} durationMs=${Date.now() - startedAt}`)
    return {
      ...(data as Record<string, unknown>),
      source_mode: 'html_bundle',
      file_count: files.length,
      ...(validation.warnings.length > 0 ? { bundle_warnings: validation.warnings } : {}),
    }
  }
}
