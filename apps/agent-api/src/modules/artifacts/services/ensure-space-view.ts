import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactSpaceSchemaRepository } from '../repositories/artifact-space-schema.repository'

export type SpaceArtifactViewType =
  | 'missions'
  | 'docs'
  | 'funnels'
  | 'offers'
  | 'ads'
  | 'ad_campaigns'
  | 'sequences'
  | 'presentations'
  | 'avatars'
  | 'social_posts'
  | 'websites'

interface EnsureSpaceViewParams {
  supabase: SupabaseClient
  spaceId?: string | null
  campaignId: string | null | undefined
  viewType: SpaceArtifactViewType
  logger?: { warn: (message: string) => void }
}

const spaceSchemaRepository = new ArtifactSpaceSchemaRepository()

function buildSpaceViewDef(
  viewType: SpaceArtifactViewType,
  pinnedToStart = true,
): Record<string, unknown> {
  const base = {
    id: viewType,
    type: viewType,
    pinned_to_start: pinnedToStart,
  }
  if (viewType === 'docs') {
    return {
      ...base,
      name: 'Docs',
      group_by: 'category',
      docs_config: { pinned_item_ids: [], display_mode: 'grid' },
      visible_fields: ['title', 'category'],
    }
  }
  if (viewType === 'missions') {
    return {
      ...base,
      name: 'Missions',
      icon: 'rocket',
    }
  }
  const meta: Record<
    Exclude<SpaceArtifactViewType, 'docs' | 'missions'>,
    { name: string; icon: string; configKey: string }
  > = {
    funnels: { name: 'Funnels', icon: 'git-branch', configKey: 'funnels_config' },
    offers: { name: 'Offers', icon: 'package', configKey: 'offers_config' },
    ads: { name: 'Ads', icon: 'megaphone', configKey: 'ads_config' },
    ad_campaigns: { name: 'Ad Campaigns', icon: 'target', configKey: 'ad_campaigns_config' },
    sequences: { name: 'Sequences', icon: 'mail', configKey: 'sequences_config' },
    presentations: {
      name: 'Presentations',
      icon: 'presentation',
      configKey: 'presentations_config',
    },
    avatars: { name: 'Avatars', icon: 'user', configKey: 'avatars_config' },
    social_posts: { name: 'Social Posts', icon: 'share-2', configKey: 'social_posts_config' },
    websites: { name: 'Websites', icon: 'globe', configKey: 'websites_config' },
  }
  const viewMeta = meta[viewType]
  const view: Record<string, unknown> = {
    ...base,
    name: viewMeta.name,
    icon: viewMeta.icon,
  }
  const defaultConfig: Record<string, unknown> = {
    display_mode: 'grid',
    time_range: 'all',
    sort_by: 'created_at',
    sort_dir: 'desc',
  }
  if (viewType === 'social_posts') defaultConfig.time_field = 'created_at'
  view[viewMeta.configKey] = defaultConfig
  return view
}

async function patchSpaceSchemaWithView(input: {
  supabase: SupabaseClient
  spaceId: string
  viewType: SpaceArtifactViewType
  logger?: { warn: (message: string) => void }
}): Promise<'created' | 'existing' | 'error'> {
  const { supabase, spaceId, viewType, logger } = input
  const { data, error: readError } = await spaceSchemaRepository.findSpaceSchema(
    supabase,
    spaceId,
  )
  if (readError || !data) {
    logger?.warn(
      `[ensure-space-view] supabase read failed for ${spaceId}: ${readError?.message ?? 'row not found'}`,
    )
    return 'error'
  }
  const schema =
    data.schema && typeof data.schema === 'object' && !Array.isArray(data.schema)
      ? (data.schema as Record<string, unknown>)
      : {}
  const views = Array.isArray(schema.views) ? (schema.views as Array<Record<string, unknown>>) : []
  if (
    views.some(
      (view) => view && typeof view === 'object' && (view as { type?: unknown }).type === viewType,
    )
  ) {
    return 'existing'
  }
  const nextSchema = {
    ...schema,
    views: [...views, buildSpaceViewDef(viewType)],
  }
  const { error: updateError } = await spaceSchemaRepository.patchSpaceSchema(supabase, {
    spaceId,
    schema: nextSchema,
  })
  if (updateError) {
    logger?.warn(
      `[ensure-space-view] supabase update failed for ${spaceId} ${viewType}: ${updateError.message}`,
    )
    return 'error'
  }
  return 'created'
}

export async function ensureSpaceView({
  supabase,
  spaceId,
  campaignId,
  viewType,
  logger,
}: EnsureSpaceViewParams): Promise<void> {
  if (!campaignId && !spaceId) return
  try {
    if (spaceId) {
      await patchSpaceSchemaWithView({ supabase, spaceId, viewType, logger })
      return
    }
    if (!campaignId) return
    // Campaign-only fallback: find the most recently updated space in this campaign
    // and pin the view onto it. Keeps the existing campaign-scoped behavior working
    // when callers don't carry an explicit space context.
    const { data: spaces, error: spacesError } =
      await spaceSchemaRepository.findLatestCampaignSpace(supabase, campaignId)
    if (spacesError || !spaces || spaces.length === 0) return
    const target = spaces[0]
    if (target?.id) {
      await patchSpaceSchemaWithView({
        supabase,
        spaceId: String(target.id),
        viewType,
        logger,
      })
    }
  } catch (err) {
    logger?.warn(
      `[ensure-space-view] failed for ${viewType}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
