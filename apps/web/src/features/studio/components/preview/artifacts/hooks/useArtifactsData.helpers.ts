import { normalizeArtifactsState } from '../tree/constants'
import type { ArtifactCategoryId, ArtifactsState, CampaignOption, TreeNode } from '../tree/types'

const DEFAULT_EXPANDED_ARTIFACT_IDS = [
  'funnels',
  'websites',
  'offers',
  'ads',
  'sequences',
  'presentations',
  'avatars',
  'social-content',
] as const

type CampaignOptionSource = {
  id: string
  name?: string | null
  config?: unknown
}

type NewestArtifactNode = {
  id: string
  label: string
  type: string
  resourceId?: string
  funnelId?: string
}

export function getInitialExpandedArtifactIds(): Set<string> {
  return new Set(DEFAULT_EXPANDED_ARTIFACT_IDS)
}

export function getArtifactsCacheKey(campaignId: string): string {
  return `vibey-artifacts-cache:${campaignId}`
}

export function mapCampaignOptions(campaigns: CampaignOptionSource[]): CampaignOption[] {
  return campaigns.map((campaign) => {
    const config =
      campaign.config && typeof campaign.config === 'object' && !Array.isArray(campaign.config)
        ? (campaign.config as Record<string, unknown>)
        : {}
    return {
      id: campaign.id,
      name: campaign.name ?? 'Untitled',
      icon: (config.icon as string | undefined) ?? 'folder-kanban',
    }
  })
}

export function buildExpandedArtifactIds(
  data: ArtifactsState,
  baseExpandedIds?: Set<string>,
): Set<string> {
  const artifacts = normalizeArtifactsState(data)
  const next = new Set(baseExpandedIds ?? DEFAULT_EXPANDED_ARTIFACT_IDS)

  for (const id of DEFAULT_EXPANDED_ARTIFACT_IDS) next.add(id)
  for (const funnel of artifacts.funnels) next.add(`funnel-${funnel.id}`)
  for (const offer of artifacts.offers) next.add(`offer-${offer.id}`)
  for (const ad of artifacts.ads) next.add(`ad-${ad.id}`)
  for (const campaign of artifacts.adCampaigns) {
    next.add(`adcamp-${campaign.id}`)
    for (const adSet of campaign.ad_sets ?? []) next.add(`adset-${adSet.id}`)
  }
  next.add('ungrouped-ads')
  for (const sequence of artifacts.sequences) next.add(`sequence-${sequence.id}`)
  for (const socialPost of artifacts.socialPosts) next.add(`social-${socialPost.platform}`)

  return next
}

export function collectExpandableNodeIds(treeData: TreeNode[]): string[] {
  const ids: string[] = []
  const walk = (node: TreeNode) => {
    if (
      node.type === 'category' ||
      node.type === 'funnel' ||
      node.type === 'offer' ||
      node.type === 'sequence' ||
      node.type === 'ad-campaign' ||
      node.type === 'ad-set' ||
      node.type === 'social-platform'
    ) {
      ids.push(node.id)
    }
    for (const child of node.children ?? []) walk(child)
  }
  for (const node of treeData) walk(node)
  return ids
}

export function filterTreeDataBySource(
  treeData: TreeNode[],
  filterSet: Set<ArtifactCategoryId> | null,
  sourceFilter: 'all' | 'vibey' | 'meta',
): TreeNode[] {
  let result = treeData
  if (filterSet) {
    result = result.filter((node) => filterSet.has(node.id as ArtifactCategoryId))
  }
  if (sourceFilter === 'all') {
    return result
  }
  const filterNodesBySource = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((node) => {
        if (node.source && node.source !== sourceFilter) return null
        if (node.children) {
          const filtered = filterNodesBySource(node.children)
          if (filtered.length === 0 && !node.source) return null
          return { ...node, children: filtered }
        }
        return node
      })
      .filter(Boolean) as TreeNode[]

  return filterNodesBySource(result)
}

export function countTopLevelChildren(treeData: TreeNode[]): number {
  return treeData.reduce((sum, category) => sum + (category.children?.length ?? 0), 0)
}

export function findNewestArtifactNode(data: ArtifactsState): NewestArtifactNode | null {
  const artifacts = normalizeArtifactsState(data)
  const leaves: Array<{
    createdAt: number
    node: NewestArtifactNode
  }> = []

  for (const offer of artifacts.offers) {
    leaves.push({
      createdAt: new Date(offer.created_at).getTime() || 0,
      node: {
        id: `offer-${offer.id}`,
        label: offer.name ?? 'Untitled Offer',
        type: 'offer',
        resourceId: offer.id,
      },
    })
  }
  for (const funnel of artifacts.funnels) {
    leaves.push({
      createdAt: new Date(funnel.created_at).getTime() || 0,
      node: {
        id: `funnel-${funnel.id}`,
        label: funnel.name,
        type: 'funnel',
        resourceId: funnel.id,
      },
    })
  }
  for (const ad of artifacts.ads) {
    leaves.push({
      createdAt: new Date(ad.created_at).getTime() || 0,
      node: {
        id: `ad-${ad.id}`,
        label: ad.headline || 'Untitled Ad',
        type: 'ad',
        resourceId: ad.id,
      },
    })
  }
  for (const sequence of artifacts.sequences) {
    leaves.push({
      createdAt: new Date(sequence.created_at).getTime() || 0,
      node: {
        id: `sequence-${sequence.id}`,
        label: sequence.name ?? 'Untitled Sequence',
        type: 'sequence',
        resourceId: sequence.id,
      },
    })
  }
  for (const presentation of artifacts.presentations) {
    leaves.push({
      createdAt: new Date(presentation.created_at).getTime() || 0,
      node: {
        id: `pres-${presentation.id}`,
        label: presentation.name ?? 'Untitled Presentation',
        type: 'presentation',
        resourceId: presentation.id,
      },
    })
  }
  for (const avatar of artifacts.avatars) {
    leaves.push({
      createdAt: new Date(avatar.created_at).getTime() || 0,
      node: {
        id: `avatar-${avatar.id}`,
        label: avatar.name ?? 'Untitled Avatar',
        type: 'avatar',
        resourceId: avatar.id,
      },
    })
  }
  for (const adCampaign of artifacts.adCampaigns) {
    leaves.push({
      createdAt: new Date(adCampaign.created_at).getTime() || 0,
      node: {
        id: `adcamp-${adCampaign.id}`,
        label: adCampaign.name,
        type: 'ad-campaign',
        resourceId: adCampaign.id,
      },
    })
  }
  for (const socialPost of artifacts.socialPosts) {
    leaves.push({
      createdAt: new Date(socialPost.created_at).getTime() || 0,
      node: {
        id: `social-post-${socialPost.id}`,
        label:
          socialPost.headline?.trim() || socialPost.caption?.slice(0, 60) || 'Social Post',
        type: 'social-post',
        resourceId: socialPost.id,
      },
    })
  }

  const blogNewestByFunnel = new Map<string, { createdAt: number; funnelId: string }>()
  for (const post of artifacts.blogPosts) {
    const createdAt = new Date(post.created_at).getTime() || 0
    const prev = blogNewestByFunnel.get(post.funnel_id)
    if (!prev || createdAt > prev.createdAt) {
      blogNewestByFunnel.set(post.funnel_id, { createdAt, funnelId: post.funnel_id })
    }
  }
  for (const { createdAt, funnelId } of blogNewestByFunnel.values()) {
    leaves.push({
      createdAt,
      node: {
        id: `website-blog-${funnelId}`,
        label: 'Blog',
        type: 'website-blog',
        funnelId,
      },
    })
  }

  if (leaves.length === 0) return null
  leaves.sort((a, b) => b.createdAt - a.createdAt)
  return leaves[0]?.node ?? null
}
