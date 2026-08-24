import type { StudioSearchArtifactHit } from '@/features/studio/services/studio-search-api.service'
import type { VibeyPendingArtifactOpen } from '@/features/studio/types/vibey-pending-artifact-open'

const OPEN_SEARCH_EVENT = 'vibey-open-studio-search'

export function dispatchOpenStudioSearch() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))
}

export function subscribeOpenStudioSearch(handler: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(OPEN_SEARCH_EVENT, handler)
  return () => window.removeEventListener(OPEN_SEARCH_EVENT, handler)
}

export type StudioSearchModalSelection =
  | { type: 'conversation'; id: string }
  | { type: 'campaign'; id: string; name: string; icon?: string | null }
  | { type: 'url'; url: string }
  | { type: 'action'; action: 'create-campaign' | 'create-request' }
  | {
      type: 'artifact'
      campaignId: string
      campaignName: string
      campaignIcon: string | null
      pending: VibeyPendingArtifactOpen
    }

export function mapStudioSearchHitToPending(
  hit: StudioSearchArtifactHit,
): VibeyPendingArtifactOpen | null {
  const title = hit.title
  switch (hit.kind) {
    case 'offer':
      return { kind: 'simple', type: 'offer', id: hit.id, name: title }
    case 'funnel':
    case 'website':
      return { kind: 'simple', type: 'funnel', id: hit.id, name: title }
    case 'sequence':
      return { kind: 'simple', type: 'sequence', id: hit.id, name: title }
    case 'email':
      if (!hit.sequence_id) return null
      return { kind: 'sequence-email', sequenceId: hit.sequence_id, emailId: hit.id, name: title }
    case 'presentation':
      return { kind: 'simple', type: 'presentation', id: hit.id, name: title }
    case 'avatar':
      return { kind: 'simple', type: 'avatar', id: hit.id, name: title }
    case 'ad':
      return { kind: 'simple', type: 'ad', id: hit.id, name: title }
    case 'ad_campaign':
      return { kind: 'simple', type: 'ad-campaign', id: hit.id, name: title }
    case 'ad_set':
      return { kind: 'simple', type: 'ad-set', id: hit.id, name: title }
    case 'social_post':
      return { kind: 'simple', type: 'social-post', id: hit.id, name: title }
    case 'blog_post':
      return {
        kind: 'simple',
        type: 'blog-post',
        id: hit.id,
        name: title,
        ...(hit.funnel_id ? { funnelId: hit.funnel_id } : {}),
      }
    case 'page':
      if (!hit.funnel_id) return null
      return { kind: 'page', funnelId: hit.funnel_id, pageId: hit.id, name: title }
    default:
      return null
  }
}

export function artifactHitToSelection(
  hit: StudioSearchArtifactHit,
  campaign: { id: string; name: string; icon: string },
): StudioSearchModalSelection | null {
  if (!hit.campaign_id) return null
  const pending = mapStudioSearchHitToPending(hit)
  if (!pending) return null
  return {
    type: 'artifact',
    campaignId: hit.campaign_id,
    campaignName: campaign.name,
    campaignIcon: campaign.icon ?? null,
    pending,
  }
}
