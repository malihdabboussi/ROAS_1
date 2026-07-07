import { Injectable, Logger } from '@nestjs/common'
import { ArtifactFunnelsRepository } from '../repositories/artifact-funnels.repository'
import { ArtifactFunnelFileSupportService } from './artifact-funnel-file-support.service'
import { ArtifactFunnelPageBundleService } from './artifact-funnel-page-bundle.service'

@Injectable()
export class ArtifactFunnelPageService {
  private readonly logger = new Logger(ArtifactFunnelPageService.name)

  constructor(
    private readonly fileSupportService: ArtifactFunnelFileSupportService = new ArtifactFunnelFileSupportService(),
    private readonly pageBundleService: ArtifactFunnelPageBundleService = new ArtifactFunnelPageBundleService(
      fileSupportService,
    ),
    private readonly funnelsRepository: ArtifactFunnelsRepository = new ArtifactFunnelsRepository(),
  ) {}

  async addFunnelPage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    if (!input.funnel_id) return { success: false, error: 'funnel_id required' }
    if (typeof input.__website_page_type_error === 'string') {
      return { success: false, error: input.__website_page_type_error }
    }
    if (input.generated_html !== undefined) {
      return {
        success: false,
        error:
          'TSX_RETIRED: generated_html is no longer accepted. Funnel pages are HTML file bundles — pass files with an index.html entry (plus optional styles.css/page.js). Read skills/funnel-builder/SKILL.md.',
      }
    }
    if (!Array.isArray(input.files) || input.files.length === 0) {
      return {
        success: false,
        error:
          'add_funnel_page requires files (HTML bundle with an index.html entry). Read skills/funnel-builder/SKILL.md.',
      }
    }
    let files: Array<{ path: string; content: string; role: string }>
    try {
      files = this.fileSupportService.normalizeFunnelBundleFiles(input)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
    return this.pageBundleService.addFunnelPageBundle(
      target,
      input,
      files,
      sessionKey,
      onProgress,
    )
  }

  async updateFunnelPage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const funnelPageId = input.funnel_page_id as string
    if (!funnelPageId) return { success: false, error: 'funnel_page_id required' }
    if (typeof input.__website_page_type_error === 'string') {
      return { success: false, error: input.__website_page_type_error }
    }
    if (input.generated_html !== undefined || input.generated_css !== undefined) {
      return {
        success: false,
        error:
          'TSX_RETIRED: generated_html/generated_css are no longer accepted. Pass files to replace the whole HTML bundle, or use patch_funnel_file / write_funnel_file for targeted edits. Read skills/funnel-builder/SKILL.md.',
      }
    }
    if (Array.isArray(input.files) && input.files.length > 0) {
      if (input.replace_entire_page !== true) {
        return {
          success: false,
          error:
            'FULL_REPLACEMENT_REQUIRES_INTENT: update_funnel_page.files replaces the entire page bundle. Pass replace_entire_page: true only for a full redesign. For copy, section, style, or small edits use patch_funnel_file or write_funnel_file instead.',
        }
      }
      let files: Array<{ path: string; content: string; role: string }>
      try {
        files = this.fileSupportService.normalizeFunnelBundleFiles(input)
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
      return this.pageBundleService.updateFunnelPageBundle(target, input, files, sessionKey)
    }
    const trace = this.fileSupportService.buildTrace(target, sessionKey, input, 'update_funnel_page')
    this.logger.log(`[FunnelUpdate] start ${trace}`)
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const updates: Record<string, unknown> = {}
    for (const key of ['name', 'slug', 'page_type', 'order_index', 'generation_mode', 'path']) {
      if (input[key] !== undefined) updates[key] = input[key]
    }
    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No updates provided' }
    }

    const { data, error } = await this.funnelsRepository.updateFunnelPage(supabase, {
      funnelPageId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Funnel page not found' }
    this.logger.log(`[FunnelUpdate] success ${trace}`)
    return data as Record<string, unknown>
  }

  async setWebsiteLayout(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const funnelId = String(input.funnel_id ?? '').trim()
    if (!funnelId) return { success: false, error: 'funnel_id required' }

    const navHtml =
      typeof input.nav_html === 'string' && input.nav_html.trim() ? input.nav_html : null
    const footerHtml =
      typeof input.footer_html === 'string' && input.footer_html.trim() ? input.footer_html : null

    const layout = input.layout
    const hasLayoutObject = Boolean(layout && typeof layout === 'object' && !Array.isArray(layout))
    if (!hasLayoutObject && !navHtml && !footerHtml) {
      return { success: false, error: 'layout must be an object (or pass nav_html/footer_html)' }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data: existing, error: existingError } = await this.funnelsRepository.findFunnel(
      supabase,
      {
        funnelId,
        userId,
        columns: 'id, user_id, org_id, funnel_type',
      },
    )

    if (existingError) throw existingError
    if (!existing) return { success: false, error: 'funnel not found' }

    if (navHtml || footerHtml) {
      const sharedFiles: Array<{ path: string; content: string; role: string }> = []
      if (navHtml) sharedFiles.push({ path: 'shared/nav.html', content: navHtml, role: 'source' })
      if (footerHtml) {
        sharedFiles.push({ path: 'shared/footer.html', content: footerHtml, role: 'source' })
      }
      await this.fileSupportService.writeFunnelFileRows(
        supabase,
        existing as Record<string, unknown>,
        sharedFiles,
        null,
        { action: 'set_website_layout', label: 'Updated website layout' },
      )
      if (!hasLayoutObject) {
        return {
          success: true,
          funnel_id: funnelId,
          shared_files: sharedFiles.map((file) => file.path),
        }
      }
    }

    const layoutObj = layout as Record<string, unknown>
    if (layoutObj.navigation_tsx || layoutObj.footer_tsx) {
      return {
        success: false,
        error:
          'TSX_RETIRED: navigation_tsx/footer_tsx are no longer accepted. Pass nav_html and footer_html (plain HTML fragments saved as shared/nav.html and shared/footer.html).',
      }
    }

    const { data, error } = await this.funnelsRepository.updateFunnel(supabase, {
      funnelId,
      userId,
      updates: {
        layout: layoutObj,
        updated_at: new Date().toISOString(),
      },
      columns: 'id, name, slug, funnel_type, layout, updated_at',
    })

    if (error) throw error
    if (!data) return { success: false, error: 'Funnel not found' }
    return data
  }
}
