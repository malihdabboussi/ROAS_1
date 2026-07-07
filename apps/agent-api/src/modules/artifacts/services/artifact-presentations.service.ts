import { Injectable, Logger } from '@nestjs/common'
import { prepareFunnelPageForWrite } from '@vibey/api-shared'
import type { FunnelWriteContractResult } from '@vibey/api-shared'
import {
  buildDeleteConfirmBlock,
  callOrExtracted,
  tryPersistMissionDeliverable,
} from '../utils/artifact-domain-handler-shared.util'
import {
  formatPresentationContractIssues,
  validatePresentationFilesBeforeSave,
} from '../utils/presentation-html-contract.util'
import { ArtifactPresentationsRepository } from '../repositories/artifact-presentations.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactPresentationBundleService } from './artifact-presentation-bundle.service'
import { ArtifactPresentationLegacyEditService } from './artifact-presentation-legacy-edit.service'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactPresentationsService {
  private readonly logger = new Logger(ArtifactPresentationsService.name)

  constructor(
    private readonly repository: ArtifactPresentationsRepository = new ArtifactPresentationsRepository(),
    private readonly bundleService: ArtifactPresentationBundleService = new ArtifactPresentationBundleService(
      repository,
    ),
    private readonly legacyEditService: ArtifactPresentationLegacyEditService = new ArtifactPresentationLegacyEditService(
      repository,
    ),
  ) {}

  private getPresentationTsxSource(input: Record<string, unknown>): string | null {
    if (typeof input.generated_html === 'string' && input.generated_html.trim().length > 0) {
      return input.generated_html
    }
    if (!Array.isArray(input.slides)) return null
    const tsxSlide = input.slides.find(
      (slide) =>
        slide &&
        typeof slide === 'object' &&
        !Array.isArray(slide) &&
        (slide as Record<string, unknown>).type === 'tsx',
    ) as Record<string, unknown> | undefined
    if (!tsxSlide) return null
    const content = tsxSlide.content
    if (typeof content === 'string' && content.trim().length > 0) return content
    const body = tsxSlide.body
    if (typeof body === 'string' && body.trim().length > 0) return body
    return null
  }

  private buildPresentationTsxContract(input: {
    tsxSource: string
    pageName: string
    mode: 'add' | 'update'
    previousValidHtml?: string
  }): FunnelWriteContractResult {
    return prepareFunnelPageForWrite({
      generatedHtmlRaw: input.tsxSource,
      generatedCssRaw: '',
      pageName: input.pageName,
      mode: input.mode,
      previousValidHtml: input.previousValidHtml,
    })
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_presentations: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listPresentations',
          () => this.listPresentations(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_presentation: (data, sessionKey, onProgress) =>
        callOrExtracted(
          target,
          'createPresentation',
          () => this.createPresentation(target, data, sessionKey, onProgress),
          data,
          sessionKey,
          onProgress,
        ),
      update_presentation: (data, sessionKey, onProgress) =>
        callOrExtracted(
          target,
          'updatePresentation',
          () => this.updatePresentation(target, data, sessionKey, onProgress),
          data,
          sessionKey,
          onProgress,
        ),
      patch_presentation: (data, sessionKey) =>
        callOrExtracted(
          target,
          'patchPresentation',
          () => this.legacyEditService.patchPresentation(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_presentation_slide: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updatePresentationSlide',
          () => this.legacyEditService.updatePresentationSlide(target, data, sessionKey),
          data,
          sessionKey,
        ),
      add_presentation_slide: (data, sessionKey) =>
        callOrExtracted(
          target,
          'addPresentationSlide',
          () => this.legacyEditService.addPresentationSlide(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_presentation: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getPresentation',
          () => this.getPresentation(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_presentation: (data, sessionKey) => this.deletePresentation(target, data, sessionKey),
      list_presentation_files: (data, sessionKey) =>
        this.bundleService.listPresentationFiles(target, data, sessionKey),
      read_presentation_file: (data, sessionKey) =>
        this.bundleService.readPresentationFile(target, data, sessionKey),
      write_presentation_file: (data, sessionKey) =>
        this.bundleService.writePresentationFile(target, data, sessionKey),
      patch_presentation_file: (data, sessionKey) =>
        this.bundleService.patchPresentationFile(target, data, sessionKey),
      delete_presentation_file: (data, sessionKey) =>
        this.bundleService.deletePresentationFile(target, data, sessionKey),
      show_presentation_file: (data, sessionKey) =>
        this.bundleService.readPresentationFile(target, data, sessionKey),
      list_presentation_assets: (data, sessionKey) =>
        this.bundleService.listPresentationAssets(target, data, sessionKey),
      attach_presentation_asset: (data, sessionKey) =>
        this.bundleService.attachPresentationAsset(target, data, sessionKey),
      detach_presentation_asset: (data, sessionKey) =>
        this.bundleService.detachPresentationAsset(target, data, sessionKey),
      apply_presentation_element_edit: (data, sessionKey) =>
        this.bundleService.applyPresentationElementEdit(target, data, sessionKey),
      add_presentation_anchor: (data, sessionKey) =>
        this.bundleService.addPresentationAnchor(target, data, sessionKey),
      extract_presentation_tweaks: (data, sessionKey) =>
        this.bundleService.extractPresentationTweaks(target, data, sessionKey),
      update_presentation_tweaks: (data, sessionKey) =>
        this.bundleService.updatePresentationTweaks(target, data, sessionKey),
    }
  }

  private async listPresentations(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Select a campaign first.' }
    }
    const { data, error } = await this.repository.listPresentations(supabase, {
      userId,
      campaignId,
    })
    if (error) throw error
    return data
  }

  private async createPresentation(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    await target.emitProgress(onProgress, 'Structuring your presentation')
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }
    const themeId = await target.resolveThemeId(supabase, input, userId, campaignId)
    const files = this.bundleService.normalizePresentationFiles(input)
    const entryFile =
      typeof input.entry_file === 'string' && input.entry_file.trim()
        ? input.entry_file
        : 'index.html'
    if (files.length > 0) {
      const validation = validatePresentationFilesBeforeSave(files, entryFile)
      if (validation.blockingIssues.length > 0) {
        return {
          success: false,
          error: `BUNDLE_INVALID: The presentation was NOT saved. Fix these problems and retry: ${formatPresentationContractIssues(validation.blockingIssues)}`,
        }
      }
    }
    const tsxSource = this.getPresentationTsxSource(input)
    const pageName = String((input.name as string) ?? 'PresentationPage')
    const tsxContract = tsxSource
      ? this.buildPresentationTsxContract({
          tsxSource,
          pageName,
          mode: 'add',
        })
      : null
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const spaceId = getActiveSpaceId(input)
    await target.emitProgress(onProgress, 'Saving your presentation')
    const { data, error } = await this.repository.createPresentation(supabase, {
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      offer_id: (input.offer_id as string) ?? null,
      name: (input.name as string) ?? 'Untitled Presentation',
      slides: input.slides ?? [],
      generated_html: files.length > 0 ? null : (tsxContract?.generatedHtml ?? null),
      theme_id: themeId,
      status: (input.status as string) ?? 'draft',
      metadata:
        files.length > 0
          ? {
              source_mode: 'html_bundle',
              entry_file: entryFile,
              html_runtime_version: 1,
            }
          : undefined,
      ...(spaceId ? { space_id: spaceId } : {}),
    })
    if (error) throw error
    if (files.length > 0) {
      await this.bundleService.writePresentationFileRows(
        supabase,
        data as Record<string, unknown>,
        files,
      )
    }
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: 'presentations',
      logger: this.logger,
    })
    await target.emitProgress(onProgress, 'Presentation is ready')
    if (tsxContract) {
      this.logger.log(
        `[PresentationSave] create id=${String((data as Record<string, unknown>).id ?? 'n/a')} usedFallback=${tsxContract.usedFallback} usedPreviousValid=${tsxContract.usedPreviousValid} initialValid=${tsxContract.initialValidation.valid} finalValid=${tsxContract.finalValidation.valid}`,
      )
    }
    await tryPersistMissionDeliverable(target, sessionKey, {
      type: 'presentation',
      entityId: data.id,
      entityTable: 'presentations',
      title: data.name ?? 'Untitled Presentation',
      sourceAction: 'create_presentation',
    })
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-presentation-${data.id}`,
          artifactType: 'presentation',
          artifactId: data.id,
          name: data.name ?? 'Untitled Presentation',
          status: data.status ?? 'draft',
          spaceId: spaceId ?? undefined,
        },
      ],
      _tsx_contract: tsxContract
        ? {
            normalization_applied: tsxContract.normalizationApplied,
            recovery_applied: tsxContract.recoveryApplied,
            used_fallback: tsxContract.usedFallback,
            used_previous_valid: tsxContract.usedPreviousValid,
          }
        : null,
      ...data,
    }
  }

  private async updatePresentation(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    await target.emitProgress(onProgress, 'Refining your presentation')
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    if (!input.presentation_id) return { success: false, error: 'presentation_id required' }
    const presentationId = String(input.presentation_id)
    const { data: existingPresentation, error: existingError } =
      await this.repository.findPresentation(supabase, {
        presentationId,
        userId,
        columns: 'id, generated_html',
      })
    if (existingError) throw existingError
    if (!existingPresentation) return { success: false, error: 'Presentation not found' }

    const updates: Record<string, unknown> = {}
    let tsxContract: FunnelWriteContractResult | null = null
    const files = this.bundleService.normalizePresentationFiles(input)
    const entryFile =
      typeof input.entry_file === 'string' && input.entry_file.trim()
        ? input.entry_file
        : 'index.html'
    if (files.length > 0) {
      const validation = validatePresentationFilesBeforeSave(files, entryFile)
      if (validation.blockingIssues.length > 0) {
        return {
          success: false,
          error: `BUNDLE_INVALID: The existing presentation was NOT overwritten. Fix these problems and retry: ${formatPresentationContractIssues(validation.blockingIssues)}`,
        }
      }
    }
    for (const key of ['name', 'slides', 'file_url', 'status']) {
      if (input[key] !== undefined) updates[key] = input[key]
    }

    const tsxSource = this.getPresentationTsxSource(input)
    if (files.length > 0) {
      updates.generated_html = null
      updates.metadata = {
        source_mode: 'html_bundle',
        entry_file:
          entryFile,
        html_runtime_version: 1,
      }
    } else if (tsxSource) {
      const pageName = String((input.name as string) ?? 'PresentationPage')
      tsxContract = this.buildPresentationTsxContract({
        tsxSource,
        pageName,
        mode: 'update',
        previousValidHtml: String(
          (existingPresentation as Record<string, unknown>).generated_html ?? '',
        ),
      })
      updates.generated_html = tsxContract.generatedHtml
    } else if (Object.prototype.hasOwnProperty.call(input, 'generated_html')) {
      const rawGeneratedHtml = input.generated_html
      if (
        rawGeneratedHtml === null ||
        (typeof rawGeneratedHtml === 'string' && rawGeneratedHtml.trim().length === 0)
      ) {
        updates.generated_html = null
      }
    }

    if (Object.prototype.hasOwnProperty.call(input, 'theme_id')) {
      const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
      updates.theme_id = await target.resolveThemeId(supabase, input, userId, campaignId)
    }
    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No fields to update' }
    }
    await target.emitProgress(onProgress, 'Applying your updates')
    const { data, error } = await this.repository.updatePresentation(supabase, {
      presentationId,
      userId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Presentation not found' }
    if (files.length > 0) {
      await this.bundleService.writePresentationFileRows(
        supabase,
        data as Record<string, unknown>,
        files,
      )
    }
    await target.emitProgress(onProgress, 'Presentation updated')
    if (tsxContract) {
      this.logger.log(
        `[PresentationSave] update id=${String((data as Record<string, unknown>).id ?? 'n/a')} usedFallback=${tsxContract.usedFallback} usedPreviousValid=${tsxContract.usedPreviousValid} initialValid=${tsxContract.initialValidation.valid} finalValid=${tsxContract.finalValidation.valid}`,
      )
    }
    return {
      ...data,
      _tsx_contract: tsxContract
        ? {
            normalization_applied: tsxContract.normalizationApplied,
            recovery_applied: tsxContract.recoveryApplied,
            used_fallback: tsxContract.usedFallback,
            used_previous_valid: tsxContract.usedPreviousValid,
          }
        : null,
    }
  }

  private async getPresentation(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const presentationId = String(input.presentation_id ?? '').trim()
    if (!presentationId) return { success: false, error: 'presentation_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findPresentation(supabase, {
      presentationId,
      userId,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Presentation not found' }
    return data
  }

  private async deletePresentation(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const presentationId = String(input.presentation_id ?? '').trim()
    if (!presentationId) return { success: false, error: 'presentation_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findPresentation(supabase, {
      presentationId,
      userId,
      columns: 'id, name',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Presentation not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_presentation',
          entityType: 'presentation',
          entityId: data.id,
          entityName: data.name ?? 'Untitled Presentation',
        }),
      ],
    }
  }
}
