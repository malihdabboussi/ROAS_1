import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactFunnelFilesRepository } from '../repositories/artifact-funnel-files.repository'
import { ArtifactFunnelsRepository } from '../repositories/artifact-funnels.repository'
import {
  buildDeleteConfirmBlock,
  callOrExtracted,
  parseMissionSubtaskId,
  tryPersistMissionDeliverable,
} from '../utils/artifact-domain-handler-shared.util'
import {
  FUNNEL_TYPE_ALIASES,
  VALID_FUNNEL_TYPES,
  VALID_WEBSITE_PAGE_TYPES,
} from './artifact-action-schemas'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactFunnelFileActionsService } from './artifact-funnel-file-actions.service'
import { ArtifactFunnelFileSupportService } from './artifact-funnel-file-support.service'
import { ArtifactFunnelHistoryService } from './artifact-funnel-history.service'
import { ArtifactFunnelPageBundleService } from './artifact-funnel-page-bundle.service'
import { ArtifactFunnelPageService } from './artifact-funnel-page.service'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactFunnelsService {
  private readonly logger = new Logger(ArtifactFunnelsService.name)
  private readonly funnelPageService: ArtifactFunnelPageService
  private readonly funnelFileActionsService: ArtifactFunnelFileActionsService

  constructor(
    funnelHistoryService: ArtifactFunnelHistoryService = new ArtifactFunnelHistoryService(),
    private readonly funnelsRepository: ArtifactFunnelsRepository = new ArtifactFunnelsRepository(),
    funnelFilesRepository: ArtifactFunnelFilesRepository = new ArtifactFunnelFilesRepository(),
    @Optional() funnelPageService?: ArtifactFunnelPageService,
    @Optional() funnelFileActionsService?: ArtifactFunnelFileActionsService,
  ) {
    if (funnelPageService && funnelFileActionsService) {
      this.funnelPageService = funnelPageService
      this.funnelFileActionsService = funnelFileActionsService
      return
    }

    const fileSupportService = new ArtifactFunnelFileSupportService(
      funnelHistoryService,
      funnelsRepository,
      funnelFilesRepository,
    )
    const pageBundleService = new ArtifactFunnelPageBundleService(
      fileSupportService,
      funnelsRepository,
    )
    this.funnelPageService = new ArtifactFunnelPageService(
      fileSupportService,
      pageBundleService,
      funnelsRepository,
    )
    this.funnelFileActionsService = new ArtifactFunnelFileActionsService(
      fileSupportService,
      funnelsRepository,
      funnelFilesRepository,
    )
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_funnels: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listFunnels',
          () => this.listFunnels(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_funnel: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getFunnel',
          () => this.getFunnel(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_funnel: (data, sessionKey) => this.deleteFunnel(target, data, sessionKey),
      create_funnel: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createFunnel',
          () => this.createFunnel(target, data, sessionKey),
          data,
          sessionKey,
        ),
      add_funnel_page: (data, sessionKey, onProgress) =>
        callOrExtracted(
          target,
          'addFunnelPage',
          () => this.funnelPageService.addFunnelPage(target, data, sessionKey, onProgress),
          data,
          sessionKey,
          onProgress,
        ),
      update_funnel_page: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateFunnelPage',
          () => this.funnelPageService.updateFunnelPage(target, data, sessionKey),
          data,
          sessionKey,
        ),
      set_website_layout: (data, sessionKey) =>
        callOrExtracted(
          target,
          'setWebsiteLayout',
          () => this.funnelPageService.setWebsiteLayout(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_website: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createFunnel',
          () => this.createFunnel(target, { ...data, funnel_type: 'website' }, sessionKey),
          { ...data, funnel_type: 'website' },
          sessionKey,
        ),
      add_website_page: (data, sessionKey, onProgress) =>
        callOrExtracted(
          target,
          'addFunnelPage',
          () =>
            this.funnelPageService.addFunnelPage(
              target,
              this.normalizeWebsitePageInput(data),
              sessionKey,
              onProgress,
            ),
          this.normalizeWebsitePageInput(data),
          sessionKey,
          onProgress,
        ),
      update_website_page: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateFunnelPage',
          () =>
            this.funnelPageService.updateFunnelPage(
              target,
              this.normalizeWebsitePageInput(data),
              sessionKey,
            ),
          this.normalizeWebsitePageInput(data),
          sessionKey,
        ),
      get_website: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getFunnel',
          () => this.getFunnel(target, data, sessionKey),
          data,
          sessionKey,
        ),
      list_websites: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listFunnels',
          () => this.listFunnels(target, { ...data, funnel_type_filter: 'website' }, sessionKey),
          data,
          sessionKey,
        ),
      delete_website: (data, sessionKey) => this.deleteFunnel(target, data, sessionKey),
      list_funnel_files: (data, sessionKey) =>
        this.funnelFileActionsService.listFunnelFiles(target, data, sessionKey),
      read_funnel_file: (data, sessionKey) =>
        this.funnelFileActionsService.readFunnelFile(target, data, sessionKey),
      write_funnel_file: (data, sessionKey) =>
        this.funnelFileActionsService.writeFunnelFile(target, data, sessionKey),
      patch_funnel_file: (data, sessionKey) =>
        this.funnelFileActionsService.patchFunnelFile(target, data, sessionKey),
      delete_funnel_file: (data, sessionKey) =>
        this.funnelFileActionsService.deleteFunnelFile(target, data, sessionKey),
      list_funnel_assets: (data, sessionKey) =>
        this.funnelFileActionsService.listFunnelAssets(target, data, sessionKey),
      attach_funnel_asset: (data, sessionKey) =>
        this.funnelFileActionsService.attachFunnelAsset(target, data, sessionKey),
      detach_funnel_asset: (data, sessionKey) =>
        this.funnelFileActionsService.detachFunnelAsset(target, data, sessionKey),
      apply_funnel_element_edit: (data, sessionKey) =>
        this.funnelFileActionsService.applyFunnelElementEdit(target, data, sessionKey),
      add_funnel_anchor: (data, sessionKey) =>
        this.funnelFileActionsService.addFunnelAnchor(target, data, sessionKey),
      extract_funnel_tweaks: (data, sessionKey) =>
        this.funnelFileActionsService.extractFunnelTweaks(target, data, sessionKey),
      update_funnel_tweaks: (data, sessionKey) =>
        this.funnelFileActionsService.updateFunnelTweaks(target, data, sessionKey),
    }
  }

  private normalizeFunnelType(raw: unknown): { value: string | null; error: string | null } {
    if (raw === undefined || raw === null || raw === '') {
      return { value: 'lead-magnet', error: null }
    }
    const value = String(raw).trim().toLowerCase()
    const mapped = FUNNEL_TYPE_ALIASES[value] ?? value
    if ((VALID_FUNNEL_TYPES as readonly string[]).includes(mapped)) {
      return { value: mapped, error: null }
    }
    return {
      value: null,
      error: `Invalid funnel_type "${String(raw)}". Allowed values: ${VALID_FUNNEL_TYPES.join(', ')}. general-home-page may only map to home-page or website; never retry homepage failures as lead-magnet.`,
    }
  }

  private normalizeWebsitePageType(
    raw: unknown,
    path: unknown,
  ): {
    value: string
    error: string | null
  } {
    const inferred = typeof path === 'string' && path.trim() === '/' ? 'home' : 'custom'
    const value = String(raw ?? inferred)
      .trim()
      .toLowerCase()
    const normalized = value === 'homepage' || value === 'home-page' ? 'home' : value
    if ((VALID_WEBSITE_PAGE_TYPES as readonly string[]).includes(normalized)) {
      return { value: normalized, error: null }
    }
    return {
      value: normalized,
      error: `Invalid website page_type "${String(raw)}". Allowed values: ${VALID_WEBSITE_PAGE_TYPES.join(', ')}.`,
    }
  }

  private normalizeWebsitePageInput(data: Record<string, unknown>): Record<string, unknown> {
    const path = typeof data.path === 'string' && data.path.trim() ? data.path.trim() : undefined
    const pageType = this.normalizeWebsitePageType(data.page_type, path)
    return {
      ...data,
      page_type: pageType.value,
      ...(pageType.error ? { __website_page_type_error: pageType.error } : {}),
      ...(path ? { path } : pageType.value === 'home' ? { path: '/' } : {}),
    }
  }

  private async listFunnels(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Select a campaign first.' }
    }
    const typeFilter = input.funnel_type_filter as string | undefined
    const { data, error } = await this.funnelsRepository.listFunnels(supabase, {
      userId,
      orgId,
      campaignId,
      typeFilter,
    })
    if (error) throw error
    return data
  }

  private async getFunnel(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const funnelId = input.funnel_id as string
    if (!funnelId) return { success: false, error: 'funnel_id required' }
    const { data, error } = await this.funnelsRepository.findFunnel(supabase, {
      funnelId,
      userId,
      columns: '*, funnel_pages!funnel_id(*)',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Funnel not found' }
    return data
  }

  private async deleteFunnel(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const funnelId = String(input.funnel_id ?? '').trim()
    if (!funnelId) return { success: false, error: 'funnel_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.funnelsRepository.findFunnel(supabase, {
      funnelId,
      userId,
      columns: 'id, name',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Funnel not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_funnel',
          entityType: 'funnel',
          entityId: data.id,
          entityName: data.name ?? 'Untitled Funnel',
        }),
      ],
    }
  }

  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
  }

  private async deduplicateSlug(
    supabase: SupabaseClient,
    slug: string,
    userId: string,
  ): Promise<string> {
    const { data: existing } = await this.funnelsRepository.findSlug(supabase, { slug, userId })

    if (!existing) return slug
    const suffix = Math.random().toString(36).slice(2, 6)
    return `${slug}-${suffix}`
  }

  private async createFunnel(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }
    const themeId = await target.resolveThemeId(supabase, input, userId, campaignId)
    const name = (input.name as string) ?? 'Untitled Funnel'
    const normalizedFunnelType = this.normalizeFunnelType(input.funnel_type)
    if (normalizedFunnelType.error) return { success: false, error: normalizedFunnelType.error }
    const rawSlug = (input.slug as string) || this.generateSlugFromName(name)
    const spaceId = getActiveSpaceId(input)
    const missionContext =
      sessionKey && target.isMissionSessionKey?.(sessionKey)
        ? await target.resolveMissionContext(sessionKey, userId)
        : null
    const missionSubtaskId = sessionKey ? parseMissionSubtaskId(sessionKey) : null
    const missionIdentity =
      missionContext?.missionId && missionSubtaskId
        ? { missionId: String(missionContext.missionId), missionSubtaskId }
        : null

    if (missionIdentity) {
      const { data: existing, error: existingError } =
        await this.funnelsRepository.findMissionSubtaskFunnel(supabase, {
          userId,
          ...missionIdentity,
        })
      if (existingError) throw existingError
      if (existing) {
        await this.persistFunnelDeliverable(target, sessionKey, existing)
        return this.buildFunnelResult(existing, true)
      }
    }

    const slug = await this.deduplicateSlug(supabase, rawSlug, userId)
    const metadata = missionIdentity
      ? {
          mission_id: missionIdentity.missionId,
          mission_subtask_id: missionIdentity.missionSubtaskId,
          source_action: 'create_funnel',
        }
      : {}

    const { data, error } = await this.funnelsRepository.createFunnel(supabase, {
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      name,
      funnel_type: normalizedFunnelType.value,
      slug,
      status: (input.status as string) ?? 'draft',
      theme_id: themeId,
      metadata,
      ...(spaceId ? { space_id: spaceId } : {}),
    })
    if (error) {
      const code = (error as any).code
      if (code === '23505' && missionIdentity) {
        const { data: existing, error: existingError } =
          await this.funnelsRepository.findMissionSubtaskFunnel(supabase, {
            userId,
            ...missionIdentity,
          })
        if (existingError) throw existingError
        if (existing) {
          await this.persistFunnelDeliverable(target, sessionKey, existing)
          return this.buildFunnelResult(existing, true)
        }
      }
      if (code === '23505' && String(error.message).includes('slug')) {
        return {
          success: false,
          error: `SLUG_CONFLICT: A funnel with slug "${slug}" already exists. Retry with a different, more unique slug — e.g. append the campaign name or a short descriptor.`,
        }
      }
      throw error
    }
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: data.funnel_type === 'website' ? 'websites' : 'funnels',
      logger: this.logger,
    })
    await this.persistFunnelDeliverable(target, sessionKey, data)
    return this.buildFunnelResult(data, false)
  }

  private async persistFunnelDeliverable(
    target: Record<string, any>,
    sessionKey: string | undefined,
    data: Record<string, any>,
  ): Promise<void> {
    const deliverableType = data.funnel_type === 'website' ? 'website' : 'funnel'
    await tryPersistMissionDeliverable(target, sessionKey, {
      type: deliverableType,
      entityId: data.id,
      entityTable: 'funnels',
      title: data.name ?? 'Untitled Funnel',
      sourceAction: deliverableType === 'website' ? 'create_website' : 'create_funnel',
    })
  }

  private buildFunnelResult(data: Record<string, any>, reused: boolean) {
    const artifactType = data.funnel_type === 'website' ? 'website' : 'funnel'
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-${artifactType}-${data.id}`,
          artifactType,
          artifactId: data.id,
          name: data.name ?? 'Untitled Funnel',
          status: data.status ?? 'draft',
          spaceId: data.space_id ?? undefined,
        },
      ],
      ...data,
      reused,
    }
  }
}
