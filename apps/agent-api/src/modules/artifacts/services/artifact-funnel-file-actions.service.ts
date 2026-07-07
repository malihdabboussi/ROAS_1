import { Injectable } from '@nestjs/common'
import { ArtifactFunnelFilesRepository } from '../repositories/artifact-funnel-files.repository'
import { ArtifactFunnelsRepository } from '../repositories/artifact-funnels.repository'
import {
  applyUniqueCandidateEdit,
  buildAnchorReplacement,
  bundleFileHasTweaks,
  inferBundleFileRole,
  lintFunnelBundle,
  sanitizeBundleFilePath,
  validateBundleFileContent,
} from '../utils/html-bundle.util'
import { ArtifactFunnelFileSupportService } from './artifact-funnel-file-support.service'

@Injectable()
export class ArtifactFunnelFileActionsService {
  constructor(
    private readonly fileSupportService: ArtifactFunnelFileSupportService = new ArtifactFunnelFileSupportService(),
    private readonly funnelsRepository: ArtifactFunnelsRepository = new ArtifactFunnelsRepository(),
    private readonly funnelFilesRepository: ArtifactFunnelFilesRepository = new ArtifactFunnelFilesRepository(),
  ) {}

  async listFunnelFiles(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const scope = await this.fileSupportService.resolveFunnelPageScope(
      resolved.supabase,
      resolved.funnelId,
      input,
    )
    if ('error' in scope) return { success: false, error: scope.error }

    const { data, error } = await this.funnelFilesRepository.listFunnelFiles(resolved.supabase, {
      funnelId: resolved.funnelId,
      funnelPageId: scope.pageId,
    })
    if (error) throw error
    const rows = (data ?? []) as Array<Record<string, unknown>>
    return {
      success: true,
      files: rows.filter((row) => row.funnel_page_id !== null),
      shared_files: rows.filter((row) => row.funnel_page_id === null),
    }
  }

  async readFunnelFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const scope = await this.fileSupportService.resolveFunnelPageScope(
      resolved.supabase,
      resolved.funnelId,
      input,
    )
    if ('error' in scope) return { success: false, error: scope.error }
    const path = sanitizeBundleFilePath(input.path ?? 'index.html', 'funnel')

    const { data, error } = await this.funnelFilesRepository.findFunnelFile(resolved.supabase, {
      funnelId: resolved.funnelId,
      funnelPageId: scope.pageId,
      path,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Funnel file not found' }
    return { success: true, file: data }
  }

  async writeFunnelFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const scope = await this.fileSupportService.resolveFunnelPageScope(
      resolved.supabase,
      resolved.funnelId,
      input,
    )
    if ('error' in scope) return { success: false, error: scope.error }
    if (scope.pageId && scope.sourceMode !== 'html_bundle') {
      return {
        success: false,
        error:
          'This funnel page is legacy TSX. Convert it first with update_funnel_page passing files (HTML bundle), then edit files.',
      }
    }
    const path = sanitizeBundleFilePath(input.path, 'funnel')
    const content = typeof input.content === 'string' ? input.content : ''
    if (!content.trim()) return { success: false, error: 'content is required' }

    const fileError = validateBundleFileContent(path, content)
    if (fileError) {
      return {
        success: false,
        error: `BUNDLE_INVALID: The file was NOT saved. ${fileError}. Send the complete, valid file content.`,
      }
    }

    const [file] = await this.fileSupportService.writeFunnelFileRows(
      resolved.supabase,
      resolved.funnel,
      [{ path, content, role: inferBundleFileRole(path, input.role) }],
      scope.pageId,
      { action: 'write_funnel_file', label: `Updated ${path}` },
    )

    if (scope.pageId) {
      await this.funnelsRepository.touchFunnelPage(resolved.supabase, scope.pageId)
    }

    if (scope.pageId && path === 'index.html') {
      await this.fileSupportService.syncEmailCaptureFromBundleEntry({
        supabase: resolved.supabase,
        userId: resolved.userId,
        funnelId: resolved.funnelId,
        funnelPageId: scope.pageId,
        entryContent: content,
      })
    }

    if (scope.pageId) {
      const { data: pageFileRows } = await this.funnelFilesRepository.listFunnelFilesForLint(
        resolved.supabase,
        {
          funnelId: resolved.funnelId,
          funnelPageId: scope.pageId,
        },
      )
      const knownPaths = await this.fileSupportService.getFunnelKnownPaths(
        resolved.supabase,
        resolved.funnelId,
      )
      const lint = lintFunnelBundle({
        files: (pageFileRows ?? []) as Array<{ path: string; content: string; role: string }>,
        knownPaths,
      })
      return {
        success: true,
        file,
        ...(lint.errors.length > 0 ? { bundle_errors: lint.errors } : {}),
        ...(lint.warnings.length > 0 ? { bundle_warnings: lint.warnings } : {}),
      }
    }
    return { success: true, file }
  }

  async patchFunnelFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const find = typeof input.find === 'string' ? input.find : ''
    const replace = typeof input.replace === 'string' ? input.replace : ''
    if (!find) return { success: false, error: 'find is required' }

    const current = await this.readFunnelFile(target, input, sessionKey)
    if (!current.success) return current
    const content = String((current.file as Record<string, unknown>).content ?? '')
    const matches = content.split(find).length - 1
    if (matches !== 1) {
      return { success: false, error: `find must match exactly once; matched ${matches}` }
    }
    return this.writeFunnelFile(
      target,
      { ...input, content: content.replace(find, replace) },
      sessionKey,
    )
  }

  async deleteFunnelFile(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const scope = await this.fileSupportService.resolveFunnelPageScope(
      resolved.supabase,
      resolved.funnelId,
      input,
    )
    if ('error' in scope) return { success: false, error: scope.error }
    const path = sanitizeBundleFilePath(input.path, 'funnel')
    if (scope.pageId && path === 'index.html') {
      return { success: false, error: 'index.html cannot be deleted from a page bundle' }
    }
    const beforeSnapshot = await this.fileSupportService.readFileSnapshot(resolved.supabase, {
      funnelId: resolved.funnelId,
      funnelPageId: scope.pageId,
      path,
    })
    const { error } = await this.funnelFilesRepository.deleteFunnelFileByPath(resolved.supabase, {
      funnelId: resolved.funnelId,
      funnelPageId: scope.pageId,
      path,
    })
    if (error) throw error
    await this.fileSupportService.recordFileChange(resolved.supabase, {
      funnel: resolved.funnel,
      funnelPageId: scope.pageId,
      action: 'delete_funnel_file',
      label: `Deleted ${path}`,
      beforeSnapshot,
      afterSnapshot: null,
    })
    return { success: true, funnel_id: resolved.funnelId, path }
  }

  async listFunnelAssets(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const { data, error } = await this.funnelFilesRepository.listFunnelAssets(
      resolved.supabase,
      resolved.funnelId,
    )
    if (error) throw error
    return { success: true, assets: data ?? [] }
  }

  async attachFunnelAsset(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = sanitizeBundleFilePath(input.path, 'funnel')
    const mediaAssetId = String(input.media_asset_id ?? '').trim()
    if (!mediaAssetId) return { success: false, error: 'media_asset_id is required' }
    const { data: mediaAsset, error: mediaError } = await this.funnelFilesRepository.findMediaAsset(
      resolved.supabase,
      mediaAssetId,
    )
    if (mediaError) throw mediaError
    if (!mediaAsset) return { success: false, error: 'Media asset not found' }
    const { data, error } = await this.funnelFilesRepository.upsertFunnelAsset(resolved.supabase, {
      funnel_id: resolved.funnelId,
      media_asset_id: mediaAssetId,
      user_id: resolved.userId,
      org_id: (resolved.funnel.org_id as string | null | undefined) ?? null,
      path,
      mime_type: String((mediaAsset as Record<string, unknown>).mime_type ?? ''),
      size_bytes: Number((mediaAsset as Record<string, unknown>).file_size ?? 0),
      role: typeof input.role === 'string' ? input.role : 'asset',
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return { success: true, asset: data }
  }

  async detachFunnelAsset(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const path = sanitizeBundleFilePath(input.path, 'funnel')
    const { error } = await this.funnelFilesRepository.deleteFunnelAsset(resolved.supabase, {
      funnelId: resolved.funnelId,
      path,
    })
    if (error) throw error
    return { success: true, funnel_id: resolved.funnelId, path }
  }

  async applyFunnelElementEdit(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const replacement = typeof input.value === 'string' ? input.value : ''
    if (!replacement.trim()) return { success: false, error: 'value is required' }
    const path = sanitizeBundleFilePath(input.path ?? input.source_file ?? 'index.html', 'funnel')

    const current = await this.readFunnelFile(target, { ...input, path }, sessionKey)
    if (!current.success) return current

    const content = String((current.file as Record<string, unknown>).content ?? '')
    const candidates = [
      typeof input.find === 'string' ? input.find : '',
      typeof input.text_snapshot === 'string' ? input.text_snapshot : '',
      typeof input.source_hint === 'string' ? input.source_hint : '',
    ].filter((item) => item.trim().length > 0)

    const edit = applyUniqueCandidateEdit(content, candidates, replacement)
    if (edit.status === 'applied') {
      return this.writeFunnelFile(target, { ...input, path, content: edit.nextContent }, sessionKey)
    }
    if (edit.status === 'ambiguous') {
      return {
        success: false,
        needs_clarification: true,
        error: `Selected element is ambiguous in ${path}; matched ${edit.matches} times.`,
        ui_blocks: [
          {
            type: 'clarification',
            id: `funnel-edit-clarify-${Date.now()}`,
            title: 'Which page element should I edit?',
            introMessage: `I found ${edit.matches} matching spots in ${path}. Pick a more specific target or select it again in Markup mode.`,
            questions: [
              {
                id: 'target',
                text: 'How should I target this edit?',
                type: 'single_choice',
                required: true,
                options: [
                  { id: 'select_again', label: 'Select the exact element again' },
                  { id: 'rewrite_section', label: 'Rewrite the whole section' },
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

  async addFunnelAnchor(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const anchorId = String(input.anchor_id ?? '').trim()
    const find = typeof input.find === 'string' ? input.find : ''
    if (!anchorId) return { success: false, error: 'anchor_id is required' }
    if (!find) return { success: false, error: 'find is required' }
    const replace = buildAnchorReplacement(find, anchorId)
    return this.patchFunnelFile(target, { ...input, find, replace }, sessionKey)
  }

  async extractFunnelTweaks(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const resolved = await this.fileSupportService.getOwnedFunnel(target, input, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const scope = await this.fileSupportService.resolveFunnelPageScope(
      resolved.supabase,
      resolved.funnelId,
      input,
    )
    if ('error' in scope) return { success: false, error: scope.error }

    const { data, error } = await this.funnelFilesRepository.listFunnelFilesForTweaks(
      resolved.supabase,
      {
        funnelId: resolved.funnelId,
        funnelPageId: scope.pageId,
      },
    )
    if (error) throw error
    const tweaks = ((data ?? []) as Array<Record<string, unknown>>).flatMap((file) => {
      const content = String(file.content ?? '')
      return bundleFileHasTweaks(content)
        ? [{ path: file.path, funnel_page_id: file.funnel_page_id, has_tweaks: true }]
        : []
    })
    return { success: true, funnel_id: resolved.funnelId, tweaks }
  }

  async updateFunnelTweaks(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const path = sanitizeBundleFilePath(input.path ?? 'index.html', 'funnel')
    const content = typeof input.content === 'string' ? input.content : ''
    if (!content.trim()) return { success: false, error: 'content is required' }
    return this.writeFunnelFile(target, { ...input, path, content }, sessionKey)
  }
}
