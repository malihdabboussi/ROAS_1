import type { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactPresentationsRepository } from '../repositories/artifact-presentations.repository'
import { ArtifactPresentationBundleService } from './artifact-presentation-bundle.service'
import { ensureSpaceView } from './ensure-space-view'

const VISUAL_DOC_PRESENTATION_META = {
  source_mode: 'html_bundle',
  entry_file: 'index.html',
  html_runtime_version: 1,
  linked_from: 'visual_doc',
} as const

export type VisualDocPresentationSyncResult = {
  presentationId: string | null
  created: boolean
}

export async function syncVisualDocLinkedPresentation(input: {
  supabase: SupabaseClient
  userId: string
  orgId: string | null
  spaceId: string
  itemId: string
  title: string
  html: string
  existingPresentationId: string | null
  presentationsRepository?: ArtifactPresentationsRepository
  bundleService?: ArtifactPresentationBundleService
  logger?: Pick<Logger, 'warn' | 'error'>
}): Promise<VisualDocPresentationSyncResult> {
  const presentationsRepository =
    input.presentationsRepository ?? new ArtifactPresentationsRepository()
  const bundleService = input.bundleService ?? new ArtifactPresentationBundleService()
  const files = [
    {
      path: 'index.html',
      content: input.html,
      role: 'entry',
    },
  ]

  const { data: space, error: spaceError } = await input.supabase
    .from('spaces')
    .select('id, campaign_id')
    .eq('id', input.spaceId)
    .maybeSingle()
  if (spaceError) {
    input.logger?.warn(
      `[visual-doc] could not resolve campaign for space=${input.spaceId}: ${spaceError.message}`,
    )
    return { presentationId: input.existingPresentationId, created: false }
  }
  const campaignId =
    typeof (space as { campaign_id?: unknown } | null)?.campaign_id === 'string'
      ? String((space as { campaign_id: string }).campaign_id)
      : null
  if (!campaignId) {
    input.logger?.warn(
      `[visual-doc] skip presentation sync — space=${input.spaceId} has no campaign_id`,
    )
    return { presentationId: input.existingPresentationId, created: false }
  }

  const metadata = {
    ...VISUAL_DOC_PRESENTATION_META,
    visual_doc_item_id: input.itemId,
  }
  const presentationName = input.title.trim() || 'Visual doc'

  if (input.existingPresentationId) {
    const { data: existing, error: findError } = await presentationsRepository.findPresentation(
      input.supabase,
      {
        presentationId: input.existingPresentationId,
        userId: input.userId,
        columns: 'id',
      },
    )
    if (findError) throw findError
    if (existing?.id) {
      const { data: updated, error: updateError } = await presentationsRepository.updatePresentation(
        input.supabase,
        {
          presentationId: input.existingPresentationId,
          userId: input.userId,
          updates: {
            name: presentationName,
            generated_html: null,
            metadata,
          },
        },
      )
      if (updateError) throw updateError
      if (!updated) {
        throw new Error('Linked visual presentation not found during update')
      }
      await bundleService.writePresentationFileRows(input.supabase, updated, files)
      await ensureSpaceView({
        supabase: input.supabase,
        spaceId: input.spaceId,
        campaignId,
        viewType: 'presentations',
        logger: input.logger,
      })
      return { presentationId: String(updated.id), created: false }
    }
  }

  const { data: created, error: createError } = await presentationsRepository.createPresentation(
    input.supabase,
    {
      user_id: input.userId,
      org_id: input.orgId,
      campaign_id: campaignId,
      offer_id: null,
      name: presentationName,
      slides: [],
      generated_html: null,
      theme_id: null,
      status: 'draft',
      metadata,
      space_id: input.spaceId,
    },
  )
  if (createError) throw createError
  await bundleService.writePresentationFileRows(input.supabase, created, files)
  await ensureSpaceView({
    supabase: input.supabase,
    spaceId: input.spaceId,
    campaignId,
    viewType: 'presentations',
    logger: input.logger,
  })
  return { presentationId: String(created.id), created: true }
}
