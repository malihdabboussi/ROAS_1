import { Injectable } from '@nestjs/common'
import { countPresentationSlides } from '@vibey/api-shared'
import { ArtifactPresentationsRepository } from '../repositories/artifact-presentations.repository'
import {
  applyUniqueCandidateEdit,
  buildAnchorReplacement,
  bundleFileHasTweaks,
  bundleFileSizeBytes,
  getBundleMimeType,
  normalizeBundleFiles,
  sanitizeBundleFilePath,
} from '../utils/html-bundle.util'
import {
  formatPresentationContractIssues,
  validatePresentationFileBeforeSave,
} from '../utils/presentation-html-contract.util'

@Injectable()
export class ArtifactPresentationBundleService {
  constructor(
    private readonly repository: ArtifactPresentationsRepository = new ArtifactPresentationsRepository(),
  ) {}

  normalizePresentationFiles(input: Record<string, unknown>): Array<{
    path: string
    content: string
    role: string
  }> {
    return normalizeBundleFiles(input.files, 'presentation')
  }

  async writePresentationFileRows(
    supabase: any,
    presentation: Record<string, unknown>,
    files: Array<{ path: string; content: string; role: string }>,
  ) {
    if (files.length === 0) return []
    const userId = String(presentation.user_id)
    const orgId = (presentation.org_id as string | null | undefined) ?? null
    const rows = files.map((file) => ({
      presentation_id: presentation.id,
      user_id: userId,
      org_id: orgId,
      path: file.path,
      content: file.content,
      role: file.role,
      mime_type: getBundleMimeType(file.path),
      size_bytes: bundleFileSizeBytes(file.content),
      updated_at: new Date().toISOString(),
    }))
    const { data, error } = await this.repository.upsertPresentationFiles(supabase, rows)
    if (error) throw error
    return data ?? []
  }

  async listPresentationFiles(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const { data, error } = await this.repository.listPresentationFiles(
      resolved.supabase,
      resolved.presentationId,
    )
    if (error) throw error
    return { success: true, files: data ?? [] }
  }

  async readPresentationFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = this.sanitizePresentationFilePath(input.path ?? 'index.html')
    const { data, error } = await this.repository.findPresentationFile(resolved.supabase, {
      presentationId: resolved.presentationId,
      path,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Presentation file not found' }
    return { success: true, file: data }
  }

  async writePresentationFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = this.sanitizePresentationFilePath(input.path)
    const content = typeof input.content === 'string' ? input.content : ''
    if (!content.trim()) return { success: false, error: 'content is required' }
    const validation = validatePresentationFileBeforeSave(path, content)
    if (validation.blockingIssues.length > 0) {
      return {
        success: false,
        error: `BUNDLE_INVALID: The file was NOT saved. ${formatPresentationContractIssues(validation.blockingIssues)} Send complete, valid file content.`,
      }
    }
    const [file] = await this.writePresentationFileRows(resolved.supabase, resolved.presentation, [
      {
        path,
        content,
        role:
          typeof input.role === 'string' ? input.role : path === 'index.html' ? 'entry' : 'source',
      },
    ])
    const currentMetadata =
      resolved.presentation.metadata && typeof resolved.presentation.metadata === 'object'
        ? (resolved.presentation.metadata as Record<string, unknown>)
        : {}
    const entryFile =
      typeof currentMetadata.entry_file === 'string' && currentMetadata.entry_file.trim()
        ? currentMetadata.entry_file
        : 'index.html'
    await this.repository.updatePresentationFields(resolved.supabase, {
      presentationId: resolved.presentationId,
      updates: {
        generated_html: null,
        metadata: {
          ...currentMetadata,
          source_mode: 'html_bundle',
          entry_file: entryFile,
          html_runtime_version: 1,
          ...(path === entryFile ? { slide_count: countPresentationSlides(content) } : {}),
        },
      },
    })
    return { success: true, file }
  }

  async patchPresentationFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = this.sanitizePresentationFilePath(input.path ?? 'index.html')
    const find = typeof input.find === 'string' ? input.find : ''
    const replace = typeof input.replace === 'string' ? input.replace : ''
    if (!find) return { success: false, error: 'find is required' }
    const current = await this.readPresentationFile(
      target,
      { presentation_id: resolved.presentationId, path },
      sessionKey,
    )
    if (!current.success) return current
    const content = String((current.file as Record<string, unknown>).content ?? '')
    const matches = content.split(find).length - 1
    if (matches !== 1)
      return { success: false, error: `find must match exactly once; matched ${matches}` }
    return this.writePresentationFile(
      target,
      { presentation_id: resolved.presentationId, path, content: content.replace(find, replace) },
      sessionKey,
    )
  }

  async deletePresentationFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = this.sanitizePresentationFilePath(input.path)
    if (path === 'index.html') return { success: false, error: 'index.html cannot be deleted' }
    const { error } = await this.repository.deletePresentationFile(resolved.supabase, {
      presentationId: resolved.presentationId,
      path,
    })
    if (error) throw error
    return { success: true, presentation_id: resolved.presentationId, path }
  }

  async listPresentationAssets(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const { data, error } = await this.repository.listPresentationAssets(
      resolved.supabase,
      resolved.presentationId,
    )
    if (error) throw error
    return { success: true, assets: data ?? [] }
  }

  async attachPresentationAsset(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = this.sanitizePresentationFilePath(input.path)
    const mediaAssetId = String(input.media_asset_id ?? '').trim()
    if (!mediaAssetId) return { success: false, error: 'media_asset_id is required' }
    const { data: mediaAsset, error: mediaError } = await this.repository.findMediaAsset(
      resolved.supabase,
      mediaAssetId,
    )
    if (mediaError) throw mediaError
    if (!mediaAsset) return { success: false, error: 'Media asset not found' }
    const { data, error } = await this.repository.upsertPresentationAsset(resolved.supabase, {
      presentation_id: resolved.presentationId,
      media_asset_id: mediaAssetId,
      user_id: resolved.userId,
      org_id: (resolved.presentation.org_id as string | null | undefined) ?? null,
      path,
      mime_type: String((mediaAsset as Record<string, unknown>).mime_type ?? ''),
      size_bytes: Number((mediaAsset as Record<string, unknown>).file_size ?? 0),
      role: typeof input.role === 'string' ? input.role : 'asset',
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return { success: true, asset: data }
  }

  async detachPresentationAsset(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = this.sanitizePresentationFilePath(input.path)
    const { error } = await this.repository.deletePresentationAsset(resolved.supabase, {
      presentationId: resolved.presentationId,
      path,
    })
    if (error) throw error
    return { success: true, presentation_id: resolved.presentationId, path }
  }

  async applyPresentationElementEdit(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = this.sanitizePresentationFilePath(input.path ?? input.source_file ?? 'index.html')
    const replacement = typeof input.value === 'string' ? input.value : ''
    if (!replacement.trim()) return { success: false, error: 'value is required' }

    const current = await this.readPresentationFile(
      target,
      { presentation_id: resolved.presentationId, path },
      sessionKey,
    )
    if (!current.success) return current

    const content = String((current.file as Record<string, unknown>).content ?? '')
    const candidates = [
      typeof input.find === 'string' ? input.find : '',
      typeof input.text_snapshot === 'string' ? input.text_snapshot : '',
      typeof input.source_hint === 'string' ? input.source_hint : '',
    ].filter((item) => item.trim().length > 0)

    const edit = applyUniqueCandidateEdit(content, candidates, replacement)
    if (edit.status === 'applied') {
      return this.writePresentationFile(
        target,
        {
          presentation_id: resolved.presentationId,
          path,
          content: edit.nextContent,
        },
        sessionKey,
      )
    }
    if (edit.status === 'ambiguous') {
      return {
        success: false,
        needs_clarification: true,
        error: `Selected element is ambiguous in ${path}; matched ${edit.matches} times.`,
        ui_blocks: [
          {
            type: 'clarification',
            id: `presentation-edit-clarify-${Date.now()}`,
            title: 'Which presentation element should I edit?',
            introMessage: `I found ${edit.matches} matching spots in ${path}. Pick a more specific target or select it again in Markup mode.`,
            questions: [
              {
                id: 'target',
                text: 'How should I target this edit?',
                type: 'single_choice',
                required: true,
                options: [
                  { id: 'select_again', label: 'Select the exact element again' },
                  { id: 'rewrite_slide', label: 'Rewrite the whole current slide' },
                ],
              },
            ],
          },
        ],
      }
    }

    return {
      success: false,
      needs_clarification: true,
      error: `Could not find a unique source match in ${path}`,
    }
  }

  async addPresentationAnchor(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const anchorId = String(input.anchor_id ?? '').trim()
    const find = typeof input.find === 'string' ? input.find : ''
    if (!anchorId) return { success: false, error: 'anchor_id is required' }
    if (!find) return { success: false, error: 'find is required' }
    const replace = buildAnchorReplacement(find, anchorId)
    return this.patchPresentationFile(target, { ...input, find, replace }, sessionKey)
  }

  async extractPresentationTweaks(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.getOwnedPresentation(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const files = await this.listPresentationFiles(target, input, sessionKey)
    if (!files.success) return files
    const tweaks = ((files.files ?? []) as Array<Record<string, unknown>>).flatMap((file) => {
      const content = String(file.content ?? '')
      return bundleFileHasTweaks(content) ? [{ path: file.path, has_tweaks: true }] : []
    })
    return { success: true, presentation_id: resolved.presentationId, tweaks }
  }

  async updatePresentationTweaks(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const path = this.sanitizePresentationFilePath(input.path ?? 'index.html')
    const content = typeof input.content === 'string' ? input.content : ''
    if (!content.trim()) return { success: false, error: 'content is required' }
    return this.writePresentationFile(target, { ...input, path, content }, sessionKey)
  }

  private sanitizePresentationFilePath(path: unknown): string {
    return sanitizeBundleFilePath(path, 'presentation')
  }

  private async getOwnedPresentation(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const presentationId = String(input.presentation_id ?? '').trim()
    if (!presentationId) return { error: 'presentation_id is required' } as const
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findPresentation(supabase, {
      presentationId,
      userId,
    })
    if (error) throw error
    if (!data) return { error: 'Presentation not found' } as const
    return {
      presentationId,
      userId,
      supabase,
      presentation: data as Record<string, unknown>,
    } as const
  }
}
