import {
  Briefcase,
  FileText,
  Gift,
  LayoutTemplate,
  Mail,
  Megaphone,
  Share2,
  User,
} from 'lucide-react'
import type { Funnel } from '@/features/studio/services/artifact-preview.service'
import { OFFER_STEPS } from '@/features/studio/types'
import type {
  Ad,
  AdCampaign,
  Avatar,
  Offer,
  Presentation,
  Sequence,
  SocialPost,
} from '@/features/studio/types'
import type { TreeNode } from './types'

export function buildArtifactTree(
  funnels: Funnel[],
  offers: Offer[],
  ads: Ad[],
  sequences: Sequence[],
  presentations: Presentation[],
  avatars: Avatar[],
  adCampaigns: AdCampaign[],
  socialPosts: SocialPost[] = [],
  _blogPosts: Array<{
    id: string
    funnel_id: string
    title: string
    slug: string
    created_at: string
  }> = [],
): TreeNode[] {
  const tree: TreeNode[] = []
  const websites = funnels.filter((funnel) => funnel.funnel_type === 'website')
  const classicFunnels = funnels.filter((funnel) => funnel.funnel_type !== 'website')
  const adsByAdSetId = new Map<string, Ad[]>()
  for (const ad of ads) {
    if (!ad.ad_set_id) continue
    const bucket = adsByAdSetId.get(ad.ad_set_id) ?? []
    bucket.push(ad)
    adsByAdSetId.set(ad.ad_set_id, bucket)
  }

  if (offers.length > 0) {
    tree.push({
      id: 'offers',
      label: 'Offers',
      type: 'category',
      icon: <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />,
      children: offers.map((offer) => ({
        id: `offer-${offer.id}`,
        label: offer.name ?? 'Untitled Offer',
        type: 'offer' as const,
        icon: <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />,
        resourceId: offer.id,
        children: OFFER_STEPS.filter(
          (step) => offer[`step${step.number}_data` as keyof Offer] != null,
        ).map((step) => ({
          id: `offer-${offer.id}-step-${step.number}`,
          label: step.name,
          type: 'offer-step' as const,
          icon: <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />,
          resourceId: offer.id,
          stepNumber: step.number,
        })),
      })),
    })
  }

  if (classicFunnels.length > 0) {
    tree.push({
      id: 'funnels',
      label: 'Funnels',
      type: 'category',
      icon: <LayoutTemplate className="h-3.5 w-3.5 flex-shrink-0" />,
      children: classicFunnels.map((funnel) => ({
        id: `funnel-${funnel.id}`,
        label: funnel.name,
        type: 'funnel' as const,
        icon: <LayoutTemplate className="h-3.5 w-3.5 flex-shrink-0" />,
        resourceId: funnel.id,
      })),
    })
  }

  if (websites.length > 0) {
    tree.push({
      id: 'websites',
      label: 'Websites',
      type: 'category',
      icon: <LayoutTemplate className="h-3.5 w-3.5 flex-shrink-0" />,
      children: websites.map((funnel) => ({
        id: `funnel-${funnel.id}`,
        label: funnel.name,
        type: 'funnel' as const,
        icon: <LayoutTemplate className="h-3.5 w-3.5 flex-shrink-0" />,
        resourceId: funnel.id,
        children: [
          {
            id: `website-blog-${funnel.id}`,
            label: 'Blog',
            type: 'website-blog' as const,
            icon: <FileText className="h-3.5 w-3.5 flex-shrink-0" />,
            funnelId: funnel.id,
          },
        ],
      })),
    })
  }

  const ungroupedAds = ads.filter((a) => !a.ad_set_id)
  const hasAdsContent = adCampaigns.length > 0 || ungroupedAds.length > 0
  if (hasAdsContent) {
    const adChildren: TreeNode[] = []
    for (const camp of adCampaigns) {
      const setNodes: TreeNode[] = (camp.ad_sets ?? []).map((adSet) => {
        // Merge flat ads list with nested relation payload so freshly-created ads
        // appear immediately even when ad_campaigns nested relation is briefly stale.
        const mergedSetAds = [...(adSet.ads ?? []), ...(adsByAdSetId.get(adSet.id) ?? [])].filter(
          (ad, index, all) => all.findIndex((candidate) => candidate.id === ad.id) === index,
        )
        const setAds = mergedSetAds.map((ad) => ({
          id: `ad-${ad.id}`,
          label: ad.headline || 'Untitled Ad',
          type: 'ad' as const,
          icon: <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />,
          resourceId: ad.id,
          adPlacement: ad.placement,
          metaStatus: ad.meta_effective_status ?? null,
          source: ad.source,
        }))
        return {
          id: `adset-${adSet.id}`,
          label: adSet.name,
          type: 'ad-set' as const,
          icon: <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />,
          resourceId: adSet.id,
          subtitle: undefined,
          metaStatus: adSet.meta_effective_status ?? null,
          source: adSet.source,
          isPublishedToMeta: !!adSet.meta_adset_id,
          children: setAds,
        }
      })

      adChildren.push({
        id: `adcamp-${camp.id}`,
        label: camp.name,
        type: 'ad-campaign' as const,
        icon: <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />,
        resourceId: camp.id,
        subtitle: undefined,
        metaStatus: camp.meta_effective_status ?? null,
        source: camp.source,
        children: setNodes,
      })
    }

    if (ungroupedAds.length > 0) {
      adChildren.push({
        id: 'ungrouped-ads',
        label: 'Ungrouped Ads',
        type: 'ad-campaign' as const,
        icon: <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />,
        subtitle: undefined,
        children: ungroupedAds.map((ad) => ({
          id: `ad-${ad.id}`,
          label: ad.headline || 'Untitled Ad',
          type: 'ad' as const,
          icon: <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />,
          resourceId: ad.id,
          adPlacement: ad.placement,
          metaStatus: ad.meta_effective_status ?? null,
          source: ad.source,
        })),
      })
    }

    tree.push({
      id: 'ads',
      label: 'Ads',
      type: 'category',
      icon: <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />,
      children: adChildren,
    })
  }

  if (sequences.length > 0) {
    tree.push({
      id: 'sequences',
      label: 'Email Sequences',
      type: 'category',
      icon: <Mail className="h-3.5 w-3.5 flex-shrink-0" />,
      children: sequences.map((seq) => ({
        id: `sequence-${seq.id}`,
        label: seq.name ?? 'Untitled Sequence',
        type: 'sequence' as const,
        icon: <Mail className="h-3.5 w-3.5 flex-shrink-0" />,
        resourceId: seq.id,
        children: (seq.sequence_emails ?? [])
          .sort(
            (a: { order_index?: number }, b: { order_index?: number }) =>
              (a.order_index ?? 0) - (b.order_index ?? 0),
          )
          .map((email) => ({
            id: `email-${email.id}`,
            label: email.subject ?? `Email ${email.order_index + 1}`,
            type: 'sequence-email' as const,
            icon: <FileText className="h-3.5 w-3.5 flex-shrink-0" />,
            resourceId: seq.id,
            emailId: email.id,
          })),
      })),
    })
  }

  if (presentations.length > 0) {
    tree.push({
      id: 'presentations',
      label: 'Presentations',
      type: 'category',
      icon: <Gift className="h-3.5 w-3.5 flex-shrink-0" />,
      children: presentations.map((p) => ({
        id: `pres-${p.id}`,
        label: p.name ?? 'Untitled Presentation',
        type: 'presentation' as const,
        icon: <Gift className="h-3.5 w-3.5 flex-shrink-0" />,
        resourceId: p.id,
      })),
    })
  }

  if (avatars.length > 0) {
    tree.push({
      id: 'avatars',
      label: 'Avatars',
      type: 'category',
      icon: <User className="h-3.5 w-3.5 flex-shrink-0" />,
      children: avatars.map((a) => ({
        id: `avatar-${a.id}`,
        label: a.name ?? 'Untitled Avatar',
        type: 'avatar' as const,
        icon: <User className="h-3.5 w-3.5 flex-shrink-0" />,
        resourceId: a.id,
      })),
    })
  }

  if (socialPosts.length > 0) {
    const byPlatform = new Map<string, SocialPost[]>()
    for (const post of socialPosts) {
      const group = byPlatform.get(post.platform) ?? []
      group.push(post)
      byPlatform.set(post.platform, group)
    }

    const platformChildren: TreeNode[] = []
    const platformOrder = ['linkedin', 'instagram'] as const
    const platformLabels: Record<string, string> = { linkedin: 'LinkedIn', instagram: 'Instagram' }

    for (const platform of platformOrder) {
      const posts = byPlatform.get(platform)
      if (!posts || posts.length === 0) continue
      platformChildren.push({
        id: `social-${platform}`,
        label: platformLabels[platform] ?? platform,
        type: 'social-platform' as const,
        icon: <Share2 className="h-3.5 w-3.5 flex-shrink-0" />,
        children: posts.map((p) => ({
          id: `social-post-${p.id}`,
          label:
            p.headline?.trim() || p.caption?.slice(0, 60) || `${platformLabels[p.platform]} Post`,
          type: 'social-post' as const,
          icon: <Share2 className="h-3.5 w-3.5 flex-shrink-0" />,
          resourceId: p.id,
        })),
      })
    }

    tree.push({
      id: 'social-content',
      label: 'Social Content',
      type: 'category',
      icon: <Share2 className="h-3.5 w-3.5 flex-shrink-0" />,
      children: platformChildren,
    })
  }

  return tree
}

export function getMetaStatusDotClass(status: string | null | undefined): string {
  if (!status) return 'bg-zinc-500'
  if (status === 'ACTIVE') return 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.4)]'
  if (status === 'PAUSED' || status === 'CAMPAIGN_PAUSED' || status === 'ADSET_PAUSED')
    return 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]'
  if (status === 'PENDING_REVIEW' || status === 'IN_PROCESS')
    return 'bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.4)]'
  if (status === 'DISAPPROVED' || status === 'WITH_ISSUES')
    return 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.4)]'
  return 'bg-zinc-500'
}
