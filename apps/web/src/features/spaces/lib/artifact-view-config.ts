import type { ArtifactViewBaseConfig, FieldDef, ViewDef } from '../types/space-schema'
import { getAllArtifactsConfig } from './all-artifacts'

export function getArtifactConfig(view: ViewDef | null | undefined): ArtifactViewBaseConfig {
  if (!view) return {}
  if (view.type === 'all_artifacts') return getAllArtifactsConfig(view)
  if (view.type === 'funnels') return view.funnels_config ?? {}
  if (view.type === 'offers') return view.offers_config ?? {}
  if (view.type === 'ads') return view.ads_config ?? {}
  if (view.type === 'ad_campaigns') return view.ad_campaigns_config ?? {}
  if (view.type === 'sequences') return view.sequences_config ?? {}
  if (view.type === 'emails') return view.emails_config ?? {}
  if (view.type === 'presentations') return view.presentations_config ?? {}
  if (view.type === 'avatars') return view.avatars_config ?? {}
  if (view.type === 'social_posts') return view.social_posts_config ?? {}
  if (view.type === 'websites') return view.websites_config ?? {}
  return {}
}

export function artifactConfigPatch(
  view: ViewDef,
  patch: Partial<ArtifactViewBaseConfig>,
): Partial<ViewDef> {
  if (view.type === 'all_artifacts') {
    return { all_artifacts_config: { ...(view.all_artifacts_config ?? {}), ...patch } }
  }
  if (view.type === 'funnels')
    return { funnels_config: { ...(view.funnels_config ?? {}), ...patch } }
  if (view.type === 'offers') return { offers_config: { ...(view.offers_config ?? {}), ...patch } }
  if (view.type === 'ads') return { ads_config: { ...(view.ads_config ?? {}), ...patch } }
  if (view.type === 'ad_campaigns') {
    return { ad_campaigns_config: { ...(view.ad_campaigns_config ?? {}), ...patch } }
  }
  if (view.type === 'sequences')
    return { sequences_config: { ...(view.sequences_config ?? {}), ...patch } }
  if (view.type === 'emails') return { emails_config: { ...(view.emails_config ?? {}), ...patch } }
  if (view.type === 'presentations') {
    return { presentations_config: { ...(view.presentations_config ?? {}), ...patch } }
  }
  if (view.type === 'avatars')
    return { avatars_config: { ...(view.avatars_config ?? {}), ...patch } }
  if (view.type === 'social_posts') {
    return { social_posts_config: { ...(view.social_posts_config ?? {}), ...patch } }
  }
  if (view.type === 'websites')
    return { websites_config: { ...(view.websites_config ?? {}), ...patch } }
  return {}
}

export function artifactGroupableFields(type: ViewDef['type'] | undefined): FieldDef[] {
  const field = (id: string, name: string): FieldDef => ({ id, name, type: 'select' })
  const dateField = (id: string, name: string): FieldDef => ({ id, name, type: 'date' })
  if (type === 'all_artifacts') {
    return [field('artifact_type', 'Artifact Type')]
  }
  if (type === 'funnels')
    return [
      field('funnel_type', 'Funnel Type'),
      field('status', 'Status'),
      dateField('created_at', 'Created'),
    ]
  if (type === 'websites') return [field('status', 'Status')]
  if (type === 'offers')
    return [field('processing_status', 'Processing Status'), dateField('created_at', 'Created')]
  if (type === 'avatars') return [field('avatar_type', 'Avatar Type'), field('offer_id', 'Offer')]
  if (type === 'ads')
    return [
      field('platform', 'Platform'),
      field('placement', 'Placement'),
      field('status', 'Status'),
      field('source', 'Source'),
      field('ad_set_id', 'Ad Set'),
    ]
  if (type === 'ad_campaigns') return [field('objective', 'Objective'), field('status', 'Status')]
  if (type === 'sequences') return [field('status', 'Status'), field('trigger', 'Trigger')]
  if (type === 'emails') return [field('status', 'Status')]
  if (type === 'presentations') return [field('status', 'Status')]
  if (type === 'social_posts')
    return [
      field('platform', 'Platform'),
      field('post_type', 'Format'),
      field('status', 'Status'),
      dateField('scheduled_at', 'Scheduled'),
    ]
  return []
}
