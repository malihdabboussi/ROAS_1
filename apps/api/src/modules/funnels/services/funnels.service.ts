import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { prepareFunnelPageForWrite } from '@vibey/api-shared'
import { FunnelFilesRepository } from '../repositories/funnel-files.repository'
import { FunnelPagesRepository } from '../repositories/funnel-pages.repository'
import { FunnelRuntimeRepository } from '../repositories/funnel-runtime.repository'
import { FunnelsRepository } from '../repositories/funnels.repository'
import { getMimeTypeForFunnelPath, sanitizeFunnelBundlePath } from './funnel-file-inputs'
import { FunnelHistoryService } from './funnel-history.service'
import { signFunnelPreviewToken, verifyFunnelPreviewToken } from './funnel-preview-token'
import { FunnelPublishService } from './funnel-publish.service'

/**
 * Funnels Service (Layer 2)
 *
 * Business logic for funnel + page management.
 * Calls repositories for data access — never touches DB directly.
 */
@Injectable()
export class FunnelsService {
  constructor(
    private readonly funnelsRepo: FunnelsRepository,
    private readonly pagesRepo: FunnelPagesRepository,
    private readonly filesRepo: FunnelFilesRepository,
    private readonly funnelPublishService: FunnelPublishService,
    private readonly funnelHistoryService: FunnelHistoryService,
    private readonly funnelRuntime: FunnelRuntimeRepository = new FunnelRuntimeRepository(),
  ) {}

  // ─── HTML bundle source (funnel_files / funnel_assets) ───

  async getPageBundle(
    supabase: SupabaseClient,
    funnelId: string,
    pageId: string,
    orgId?: string | null,
  ) {
    const page = await this.pagesRepo.findById(supabase, pageId, orgId)
    if (!page || page.funnel_id !== funnelId) {
      throw new NotFoundException('Page not found')
    }
    const [allFiles, rawAssets] = await Promise.all([
      this.filesRepo.listForPage(supabase, funnelId, pageId),
      this.filesRepo.listAssets(supabase, funnelId),
    ])
    const assets = await Promise.all(
      rawAssets.map(async (asset: Record<string, unknown>) => {
        const mediaAsset = asset.media_assets as Record<string, unknown> | null | undefined
        const publicUrl =
          typeof mediaAsset?.public_url === 'string' && mediaAsset.public_url.trim()
            ? mediaAsset.public_url
            : null
        const bucketName =
          typeof mediaAsset?.bucket_name === 'string' && mediaAsset.bucket_name.trim()
            ? mediaAsset.bucket_name
            : null
        const filePath =
          typeof mediaAsset?.file_path === 'string' && mediaAsset.file_path.trim()
            ? mediaAsset.file_path
            : null
        let signedUrl: string | null = null
        if (!publicUrl && bucketName && filePath) {
          signedUrl = await this.funnelRuntime.createSignedUrl(
            supabase,
            bucketName,
            filePath,
            60 * 60,
          )
        }
        return { ...asset, url: publicUrl ?? signedUrl, signed_url: signedUrl }
      }),
    )
    const files = allFiles.filter((file: Record<string, unknown>) => file.funnel_page_id !== null)
    const sharedFiles = allFiles.filter(
      (file: Record<string, unknown>) => file.funnel_page_id === null,
    )
    return {
      page,
      files,
      shared_files: sharedFiles,
      assets,
      entry_file: 'index.html',
      source_mode: (page as Record<string, unknown>).source_mode ?? 'tsx',
      has_entry: files.some((file: { path?: string }) => file.path === 'index.html'),
    }
  }

  async upsertFunnelFile(
    supabase: SupabaseClient,
    userId: string,
    funnelId: string,
    input: { path: string; content: string; role?: string; funnel_page_id?: string | null },
    orgId?: string | null,
  ) {
    const funnel = await this.getFunnel(supabase, funnelId, orgId)
    const funnelOrgId = ((funnel as Record<string, unknown>).org_id as string | null) ?? null
    const safePath = sanitizeFunnelBundlePath(input.path)
    const pageId =
      typeof input.funnel_page_id === 'string' && input.funnel_page_id.trim()
        ? input.funnel_page_id.trim()
        : null
    if (pageId) {
      const page = await this.pagesRepo.findById(supabase, pageId, orgId)
      if (!page || page.funnel_id !== funnelId) throw new NotFoundException('Page not found')
    }
    const role = input.role ?? (safePath === 'index.html' ? 'entry' : 'source')
    const beforeSnapshot = await this.filesRepo.findScoped(supabase, { funnelId, funnelPageId: pageId, path: safePath })
    const file = await this.filesRepo.upsertScoped(supabase, {
      funnel_id: funnelId,
      funnel_page_id: pageId,
      user_id: userId,
      org_id: funnelOrgId,
      path: safePath,
      content: input.content,
      mime_type: getMimeTypeForFunnelPath(safePath),
      role,
      size_bytes: new TextEncoder().encode(input.content).length,
    })
    if (pageId) await this.pagesRepo.update(supabase, pageId, { source_mode: 'html_bundle' })
    await this.funnelHistoryService.recordFileChange(supabase, {
      funnelId,
      funnelPageId: pageId,
      userId,
      orgId: funnelOrgId,
      source: 'studio',
      action: 'write_funnel_file',
      label: `Updated ${safePath}`,
      beforeSnapshot: (beforeSnapshot as Record<string, unknown> | null) ?? null,
      afterSnapshot: (file as Record<string, unknown> | null) ?? null,
    })
    return file
  }

  // ─── Funnel CRUD (RLS via user Supabase client) ───

  async listFunnels(
    supabase: SupabaseClient,
    campaignId: string,
    orgId?: string | null,
    spaceId?: string,
    options?: { summary?: boolean },
  ) {
    return this.funnelsRepo.findByCampaignId(supabase, campaignId, orgId, spaceId, options)
  }

  async getFunnel(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const funnel = await this.funnelsRepo.findByIdWithPages(supabase, id, orgId)
    if (!funnel) throw new NotFoundException('Funnel not found')
    return funnel
  }

  async createFunnel(
    supabase: SupabaseClient,
    userId: string,
    data: { name: string; funnel_type: string; campaign_id: string; space_id?: string | null },
    orgId?: string | null,
  ) {
    return this.funnelsRepo.create(
      supabase,
      {
        user_id: userId,
        name: data.name,
        funnel_type: data.funnel_type,
        campaign_id: data.campaign_id,
        space_id: data.space_id ?? null,
      },
      orgId,
    )
  }

  async updateFunnel(
    supabase: SupabaseClient,
    id: string,
    data: Record<string, unknown>,
    orgId?: string | null,
  ) {
    const funnel = await this.funnelsRepo.findById(supabase, id, orgId)
    if (!funnel) throw new NotFoundException('Funnel not found')
    return this.funnelsRepo.update(supabase, id, data)
  }

  async deleteFunnel(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const funnel = await this.funnelsRepo.findById(supabase, id, orgId)
    if (!funnel) throw new NotFoundException('Funnel not found')
    await this.funnelsRepo.delete(supabase, id)
  }

  /**
   * Publish a funnel: generates slug if needed, sets status to 'published'.
   * Returns the live URL on vibeyfunnels.com.
   */
  async publishFunnel(supabase: SupabaseClient, id: string, orgId?: string | null) {
    return this.funnelPublishService.publishFunnel(supabase, id, orgId)
  }

  /**
   * Unpublish a funnel: sets status to 'draft'.
   */
  async unpublishFunnel(supabase: SupabaseClient, id: string, orgId?: string | null) {
    return this.funnelPublishService.unpublishFunnel(supabase, id, orgId)
  }

  // ─── Funnel Pages CRUD (RLS via user Supabase client) ───

  private hasEmailCapture(tsxSource: string): boolean {
    // Primary: structural detection — a <form containing an email input is an email capture form.
    const hasForm = /<form\b/i.test(tsxSource)
    const hasEmailInput = /name\s*=\s*["']email["']/i.test(tsxSource)
    if (hasForm && hasEmailInput) return true
    // Fallback: explicit marker from funnel-builder skill.
    return /\bdata-vibey-capture\b/.test(tsxSource)
  }

  async getPage(supabase: SupabaseClient, funnelId: string, pageId: string, orgId?: string | null) {
    const page = await this.pagesRepo.findById(supabase, pageId, orgId)
    if (!page || page.funnel_id !== funnelId) {
      throw new NotFoundException('Page not found')
    }
    // HTML bundle pages have no TSX to validate; source lives in funnel_files.
    if ((page as Record<string, unknown>).source_mode === 'html_bundle') {
      return {
        ...page,
        generated_html: String(page.generated_html ?? ''),
        generated_css: String(page.generated_css ?? ''),
      }
    }
    const safe = prepareFunnelPageForWrite({
      generatedHtmlRaw: String(page.generated_html ?? ''),
      generatedCssRaw: String(page.generated_css ?? ''),
      pageName: String(page.name ?? 'FunnelPage'),
      mode: 'add',
    })
    return {
      ...page,
      generated_html: String(page.generated_html ?? ''),
      generated_css: String(page.generated_css ?? ''),
      preview_contract: {
        normalization_applied: safe.normalizationApplied,
        recovery_applied: safe.recoveryApplied,
        used_fallback: safe.usedFallback,
      },
    }
  }

  async createPage(
    supabase: SupabaseClient,
    userId: string,
    funnelId: string,
    data: {
      name: string
      page_type?: string
      generated_html: string
      generated_css: string
      order_index: number
      slug?: string
      path?: string
    },
    orgId?: string | null,
  ) {
    // Verify funnel exists and user has access (RLS will enforce ownership)
    const funnel = await this.funnelsRepo.findById(supabase, funnelId, orgId)
    if (!funnel) throw new NotFoundException('Funnel not found')

    const page = await this.pagesRepo.create(
      supabase,
      {
        funnel_id: funnelId,
        name: data.name,
        page_type: data.page_type,
        generated_html: data.generated_html,
        generated_css: data.generated_css,
        order_index: data.order_index,
        slug: data.slug,
        path: data.path,
      },
      orgId,
    )

    if (this.hasEmailCapture(data.generated_html)) {
      await this.upsertEmailCaptureConversionPoint(
        supabase,
        userId,
        funnelId,
        String(page.id),
        orgId,
        {},
      )
    } else {
      await this.deleteEmailCaptureConversionPoint(supabase, funnelId, String(page.id), orgId)
    }

    return page
  }

  async updatePage(
    supabase: SupabaseClient,
    userId: string,
    funnelId: string,
    pageId: string,
    data: Record<string, unknown>,
    orgId?: string | null,
  ) {
    const page = await this.pagesRepo.findById(supabase, pageId, orgId)
    if (!page || page.funnel_id !== funnelId) {
      throw new NotFoundException('Page not found')
    }

    // Only re-sync conversion points when TSX source changes.
    if (Object.prototype.hasOwnProperty.call(data, 'generated_html')) {
      const next = data.generated_html
      if (typeof next !== 'string') {
        throw new BadRequestException('generated_html must be a string')
      }
      if (this.hasEmailCapture(next)) {
        await this.upsertEmailCaptureConversionPoint(supabase, userId, funnelId, pageId, orgId, {})
      } else {
        await this.deleteEmailCaptureConversionPoint(supabase, funnelId, pageId, orgId)
      }
    }

    return this.pagesRepo.update(supabase, pageId, data)
  }

  async deletePage(
    supabase: SupabaseClient,
    funnelId: string,
    pageId: string,
    orgId?: string | null,
  ) {
    const page = await this.pagesRepo.findById(supabase, pageId, orgId)
    if (!page || page.funnel_id !== funnelId) {
      throw new NotFoundException('Page not found')
    }
    await this.pagesRepo.delete(supabase, pageId)
  }

  async reorderPages(
    supabase: SupabaseClient,
    funnelId: string,
    pageIds: string[],
    orgId?: string | null,
  ) {
    for (let i = 0; i < pageIds.length; i++) {
      const page = await this.pagesRepo.findById(supabase, pageIds[i]!, orgId)
      if (!page || page.funnel_id !== funnelId) {
        throw new NotFoundException(`Page not found: ${pageIds[i]}`)
      }
      await this.pagesRepo.update(supabase, pageIds[i]!, { order_index: i })
    }
    return this.getFunnel(supabase, funnelId, orgId)
  }

  async movePageToFunnel(
    supabase: SupabaseClient,
    targetFunnelId: string,
    pageId: string,
    orgId?: string | null,
  ) {
    const page = await this.pagesRepo.findById(supabase, pageId, orgId)
    if (!page) throw new NotFoundException('Page not found')
    const sourceFunnelId = page.funnel_id
    if (sourceFunnelId === targetFunnelId) {
      return this.getFunnel(supabase, targetFunnelId, orgId)
    }
    const targetFunnel = await this.funnelsRepo.findById(supabase, targetFunnelId, orgId)
    if (!targetFunnel) throw new NotFoundException('Funnel not found')
    const targetPages = await this.pagesRepo.findByFunnelId(supabase, targetFunnelId)
    const newOrderIndex = targetPages.length
    await this.pagesRepo.update(supabase, pageId, {
      funnel_id: targetFunnelId,
      order_index: newOrderIndex,
    })
    return this.getFunnel(supabase, targetFunnelId, orgId)
  }

  // ─── Funnel Conversion Points (explicit per-page conversion markers) ───

  async listConversionPoints(supabase: SupabaseClient, funnelId: string, orgId?: string | null) {
    return this.funnelRuntime.listConversionPoints(supabase, funnelId, orgId)
  }

  async upsertEmailCaptureConversionPoint(
    supabase: SupabaseClient,
    userId: string,
    funnelId: string,
    funnelPageId: string,
    orgId?: string | null,
    config: Record<string, unknown> = {},
  ) {
    const funnel = await this.funnelsRepo.findById(supabase, funnelId, orgId)
    if (!funnel) throw new NotFoundException('Funnel not found')

    const page = await this.pagesRepo.findById(supabase, funnelPageId, orgId)
    if (!page || page.funnel_id !== funnelId) {
      throw new NotFoundException('Page not found in this funnel')
    }

    return this.funnelRuntime.upsertEmailCaptureConversionPoint(supabase, {
      user_id: userId,
      funnel_id: funnelId,
      funnel_page_id: funnelPageId,
      kind: 'email_capture',
      config,
      org_id: orgId ?? null,
      updated_at: new Date().toISOString(),
    })
  }

  async deleteEmailCaptureConversionPoint(
    supabase: SupabaseClient,
    funnelId: string,
    funnelPageId: string,
    orgId?: string | null,
  ) {
    const page = await this.pagesRepo.findById(supabase, funnelPageId, orgId)
    if (!page || page.funnel_id !== funnelId) {
      throw new NotFoundException('Page not found in this funnel')
    }

    await this.funnelRuntime.deleteEmailCaptureConversionPoint(supabase, funnelPageId, orgId)
    return { success: true }
  }

  // ─── Preview (service role, no RLS) ───

  async getPageForPreview(pageId: string) {
    const supabase = this.funnelRuntime.createServiceClient()

    const page = await this.pagesRepo.findById(supabase, pageId)
    if (!page) throw new NotFoundException('Page not found')

    const safe = prepareFunnelPageForWrite({
      generatedHtmlRaw: String(page.generated_html ?? ''),
      generatedCssRaw: String(page.generated_css ?? ''),
      pageName: String(page.name ?? 'FunnelPage'),
      mode: 'add',
    })

    return {
      generated_html: String(page.generated_html ?? ''),
      generated_css: String(page.generated_css ?? ''),
      funnel_id: page.funnel_id,
      page_id: page.id,
      page_type: page.page_type,
      theme_config: page.theme_config,
      preview_contract: {
        normalization_applied: safe.normalizationApplied,
        recovery_applied: safe.recoveryApplied,
        used_fallback: safe.usedFallback,
      },
    }
  }

  // ─── Internal Agent endpoints (service role, no RLS) ───

  async createFunnelInternal(data: {
    user_id: string
    name: string
    funnel_type: string
    campaign_id: string
  }) {
    const supabase = this.funnelRuntime.createServiceClient()

    const orgId = await this.resolveOrgIdFromCampaign(supabase, data.campaign_id)

    return this.funnelsRepo.create(
      supabase,
      {
        user_id: data.user_id,
        name: data.name,
        funnel_type: data.funnel_type,
        campaign_id: data.campaign_id,
      },
      orgId,
    )
  }

  async createPageInternal(
    funnelId: string,
    data: {
      name: string
      page_type?: string
      generated_html: string
      generated_css: string
      slug?: string
      path?: string
      order_index: number
    },
  ) {
    const supabase = this.funnelRuntime.createServiceClient()

    const funnel = await this.funnelsRepo.findById(supabase, funnelId)
    if (!funnel) throw new NotFoundException('Funnel not found')

    const orgId = (funnel as Record<string, unknown>).org_id as string | null

    const page = await this.pagesRepo.create(
      supabase,
      {
        funnel_id: funnelId,
        name: data.name,
        page_type: data.page_type,
        generated_html: data.generated_html,
        generated_css: data.generated_css,
        slug: data.slug,
        path: data.path,
        order_index: data.order_index,
      },
      orgId,
    )

    const inferredUserId = String((funnel as any).user_id ?? '')
    if (!inferredUserId) {
      throw new Error('Internal funnel missing user_id')
    }

    if (this.hasEmailCapture(data.generated_html)) {
      await this.upsertEmailCaptureConversionPoint(
        supabase,
        inferredUserId,
        funnelId,
        String(page.id),
        orgId,
        {},
      )
    } else {
      await this.deleteEmailCaptureConversionPoint(supabase, funnelId, String(page.id), orgId)
    }

    return page
  }

  // ─── Token signing/verification for preview ───

  signPreviewToken(pageId: string): string {
    return signFunnelPreviewToken(pageId, this.getPreviewSecret())
  }

  verifyPreviewToken(pageId: string, token: string): boolean {
    return verifyFunnelPreviewToken(pageId, token, this.getPreviewSecret())
  }

  // ─── Helpers ───

  private getPreviewSecret(): string {
    return process.env.PREVIEW_TOKEN_SECRET || process.env.OPENCLAW_GATEWAY_TOKEN || 'dev-secret'
  }

  private async resolveOrgIdFromCampaign(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<string | null> {
    if (!campaignId) return null
    return this.funnelRuntime.findCampaignOrgId(supabase, campaignId)
  }
}
