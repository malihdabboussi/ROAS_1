import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsSequencesBase } from './artifacts-sequences.base'
import type { PresentationInitialFileInput } from './artifacts.types'

export class ArtifactsPresentationFilesBase extends ArtifactsSequencesBase {
  async createPresentation(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    name: string,
    orgId?: string | null,
    spaceId?: string | null,
    initialBundle?: {
      files?: PresentationInitialFileInput[]
      entryFile?: string
    },
  ) {
    const initialFiles = this.normalizePresentationInitialFiles(initialBundle?.files)
    const entryFile =
      initialFiles.length > 0
        ? this.resolvePresentationEntryFile(initialBundle?.entryFile, initialFiles)
        : 'index.html'
    const data = await this.artifactPresentationsRepo.createPresentation(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      name,
      status: 'draft',
      slides: [],
      metadata: {
        source_mode: 'html_bundle',
        entry_file: entryFile,
        html_runtime_version: 1,
      },
      org_id: orgId ?? null,
      space_id: spaceId ?? null,
    })
    if (initialFiles.length > 0) {
      for (const file of initialFiles) {
        await this.upsertPresentationFile(
          supabase,
          userId,
          String(data.id),
          file.path,
          file.content,
          file.role ?? (file.path === entryFile ? 'entry' : 'source'),
        )
      }
    } else {
      await this.upsertPresentationFile(
        supabase,
        userId,
        String(data.id),
        'index.html',
        this.defaultPresentationIndexHtml,
        'entry',
      )
    }
    await this.spaceAutomation?.processArtifactLifecycleEvent(supabase, {
      artifact_kind: 'presentation',
      lifecycle_event: 'created',
      artifact_id: String(data.id),
      campaign_id: campaignId,
      user_id: userId,
      org_id: orgId ?? null,
      title: name,
      status: 'draft',
    })
    return data
  }

  // ─── Presentations ───

  async listPresentations(
    supabase: SupabaseClient,
    campaignId: string,
    spaceId?: string,
    options?: { summary?: boolean },
  ) {
    const rows = await this.artifactPresentationsRepo.listPresentations(
      supabase,
      campaignId,
      spaceId,
      options,
    )
    if (!options?.summary) return rows
    // Summary query already excludes generated_html/slides; keep card contract.
    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      generated_html: null,
      slides: [],
      slides_count: Array.isArray(row.slides) ? row.slides.length : 0,
    }))
  }

  async getPresentation(supabase: SupabaseClient, id: string) {
    const data = await this.artifactPresentationsRepo.getPresentation(supabase, id)
    if (!data) throw new NotFoundException('Presentation not found')
    return data
  }

  async listPresentationFiles(supabase: SupabaseClient, presentationId: string) {
    await this.getPresentation(supabase, presentationId)
    return this.artifactPresentationsRepo.listPresentationFiles(supabase, presentationId)
  }

  async getPresentationFile(supabase: SupabaseClient, presentationId: string, path: string) {
    await this.getPresentation(supabase, presentationId)
    const safePath = this.sanitizePresentationBundlePath(path)
    const data = await this.artifactPresentationsRepo.getPresentationFile(
      supabase,
      presentationId,
      safePath,
    )
    if (!data) throw new NotFoundException('Presentation file not found')
    return data
  }

  async upsertPresentationFile(
    supabase: SupabaseClient,
    userId: string,
    presentationId: string,
    path: string,
    content: string,
    role?: string,
  ) {
    const presentation = await this.getPresentation(supabase, presentationId)
    const safePath = this.sanitizePresentationBundlePath(path)
    const nextRole = role ?? (safePath === 'index.html' ? 'entry' : 'source')
    const data = await this.artifactPresentationsRepo.upsertPresentationFile(supabase, {
      presentation_id: presentationId,
      user_id: userId,
      org_id: ((presentation as Record<string, unknown>).org_id as string | null) ?? null,
      path: safePath,
      content,
      mime_type: this.getMimeTypeForPresentationPath(safePath),
      role: nextRole,
      size_bytes: new TextEncoder().encode(content).length,
      updated_at: new Date().toISOString(),
    })

    const currentMetadata = this.getPresentationMetadata(presentation as Record<string, unknown>)
    const nextMetadata = {
      ...currentMetadata,
      source_mode: 'html_bundle',
      entry_file: currentMetadata.entry_file ?? (nextRole === 'entry' ? safePath : 'index.html'),
      html_runtime_version: currentMetadata.html_runtime_version ?? 1,
    }
    await this.artifactPresentationsRepo.updatePresentationMetadata(
      supabase,
      presentationId,
      nextMetadata,
    )

    return data
  }

  async deletePresentationFile(supabase: SupabaseClient, presentationId: string, path: string) {
    await this.getPresentation(supabase, presentationId)
    const safePath = this.sanitizePresentationBundlePath(path)
    if (safePath === 'index.html') {
      throw new BadRequestException('index.html cannot be deleted')
    }
    await this.artifactPresentationsRepo.deletePresentationFile(supabase, presentationId, safePath)
  }

  async listPresentationAssets(supabase: SupabaseClient, presentationId: string) {
    await this.getPresentation(supabase, presentationId)
    return this.artifactPresentationsRepo.listPresentationAssets(supabase, presentationId)
  }

  async attachPresentationAsset(
    supabase: SupabaseClient,
    userId: string,
    presentationId: string,
    path: string,
    mediaAssetId: string,
    role?: string,
  ) {
    const presentation = await this.getPresentation(supabase, presentationId)
    const safePath = this.sanitizePresentationBundlePath(path)
    const mediaAsset = await this.artifactPresentationsRepo.findMediaAsset(supabase, mediaAssetId)
    if (!mediaAsset) throw new NotFoundException('Media asset not found')

    return this.artifactPresentationsRepo.upsertPresentationAsset(supabase, {
      presentation_id: presentationId,
      media_asset_id: mediaAssetId,
      user_id: userId,
      org_id: ((presentation as Record<string, unknown>).org_id as string | null) ?? null,
      path: safePath,
      mime_type: String((mediaAsset as Record<string, unknown>).mime_type ?? ''),
      size_bytes: Number((mediaAsset as Record<string, unknown>).file_size ?? 0),
      role: role ?? 'asset',
      updated_at: new Date().toISOString(),
    })
  }

  async detachPresentationAsset(supabase: SupabaseClient, presentationId: string, path: string) {
    await this.getPresentation(supabase, presentationId)
    const safePath = this.sanitizePresentationBundlePath(path)
    await this.artifactPresentationsRepo.deletePresentationAsset(supabase, presentationId, safePath)
  }

  async getPresentationBundle(supabase: SupabaseClient, presentationId: string) {
    const presentation = await this.getPresentation(supabase, presentationId)
    const [files, assets] = await Promise.all([
      this.listPresentationFiles(supabase, presentationId),
      this.listPresentationAssets(supabase, presentationId),
    ])
    const metadata = this.getPresentationMetadata(presentation as Record<string, unknown>)
    const entryFile =
      typeof metadata.entry_file === 'string' && metadata.entry_file.trim()
        ? metadata.entry_file
        : 'index.html'
    const hasEntry = files.some((file: { path?: string }) => file.path === entryFile)
    return {
      presentation,
      files,
      assets,
      entry_file: entryFile,
      source_mode: files.length > 0 ? 'html_bundle' : (metadata.source_mode ?? 'legacy_tsx'),
      has_entry: hasEntry,
    }
  }
}
