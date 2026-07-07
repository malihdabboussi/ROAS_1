import type {
  Ad,
  AdCampaign,
  Avatar,
  BlogPost,
  EmailArtifact,
  Funnel,
  Offer,
  Presentation,
  Sequence,
  SocialPost,
} from '@/lib/artifacts/artifact-types'
import type { Form } from '@/lib/forms/forms-api'
import type { ArtifactListRow } from './artifact-display'

function badge(
  label?: string | null,
  tone: NonNullable<ArtifactListRow['badges']>[number]['tone'] = 'muted',
) {
  return label ? { label, tone } : null
}

function compactBadges(
  ...items: Array<ReturnType<typeof badge>>
): NonNullable<ArtifactListRow['badges']> {
  return items.filter(Boolean) as NonNullable<ArtifactListRow['badges']>
}

export function funnelRows(funnels: Funnel[]): ArtifactListRow[] {
  return funnels
    .filter((funnel) => funnel.funnel_type !== 'website')
    .map((funnel) => ({
      id: funnel.id,
      title: funnel.name || 'Untitled Funnel',
      subtitle: funnel.published_url ?? funnel.slug,
      created_at: funnel.created_at,
      updated_at: funnel.updated_at,
      groupValues: {
        type: funnel.funnel_type,
        status: funnel.status,
        funnel_type: funnel.funnel_type,
        created_at: funnel.created_at?.slice(0, 7),
      },
      sortValues: {
        name: funnel.name,
        status: funnel.status,
        created_at: funnel.created_at,
        updated_at: funnel.updated_at,
      },
      badges: compactBadges(badge(funnel.funnel_type, 'blue'), badge(funnel.status, 'green')),
      raw: funnel,
    }))
}

export function formRows(forms: Form[]): ArtifactListRow[] {
  return forms.map((form) => ({
    id: form.id,
    title: form.name || 'Untitled Form',
    subtitle: form.published_url ?? form.slug ?? undefined,
    description: `${form.schema?.questions?.length ?? 0} questions`,
    created_at: form.created_at,
    updated_at: form.updated_at,
    groupValues: {
      type: 'form',
      status: form.status,
      visibility: form.visibility,
      created_at: form.created_at?.slice(0, 7),
    },
    sortValues: {
      name: form.name,
      status: form.status,
      visibility: form.visibility,
      created_at: form.created_at,
      updated_at: form.updated_at,
    },
    badges: compactBadges(badge(form.status, 'green'), badge(form.visibility, 'purple')),
    raw: form,
  }))
}

export function websiteRows(
  funnels: Funnel[],
  blogPostsByFunnelId: Record<string, BlogPost[]>,
): ArtifactListRow[] {
  return funnels
    .filter((funnel) => funnel.funnel_type === 'website')
    .map((funnel) => {
      const blogCount = blogPostsByFunnelId[funnel.id]?.length ?? 0
      return {
        id: funnel.id,
        title: funnel.name || 'Untitled Website',
        subtitle: funnel.published_url ?? funnel.slug,
        description: `${blogCount} blog ${blogCount === 1 ? 'post' : 'posts'}`,
        created_at: funnel.created_at,
        updated_at: funnel.updated_at,
        groupValues: { type: 'website', status: funnel.status },
        sortValues: { name: funnel.name, status: funnel.status, created_at: funnel.created_at },
        badges: compactBadges(badge('website', 'blue'), badge(funnel.status, 'green')),
        raw: funnel,
      }
    })
}

export function offerRows(offers: Offer[]): ArtifactListRow[] {
  return offers.map((offer) => ({
    id: offer.id,
    title: offer.name || 'Untitled Offer',
    subtitle: offer.processing_status?.replace(/_/g, ' '),
    created_at: offer.created_at,
    updated_at: offer.updated_at,
    groupValues: {
      type: 'offer',
      status: offer.processing_status,
      processing_status: offer.processing_status,
    },
    sortValues: {
      name: offer.name,
      processing_status: offer.processing_status,
      created_at: offer.created_at,
    },
    badges: compactBadges(badge(offer.processing_status?.replace(/_/g, ' '), 'purple')),
    raw: offer,
  }))
}

export function avatarRows(avatars: Avatar[]): ArtifactListRow[] {
  return avatars.map((avatar) => ({
    id: avatar.id,
    title: avatar.name || 'Untitled Avatar',
    subtitle: avatar.avatar_type,
    created_at: avatar.created_at,
    updated_at: avatar.updated_at,
    groupValues: {
      type: avatar.avatar_type ?? 'avatar',
      avatar_type: avatar.avatar_type,
      offer_id: avatar.offer_id,
    },
    sortValues: { name: avatar.name, created_at: avatar.created_at },
    badges: compactBadges(badge(avatar.avatar_type ?? 'avatar', 'blue')),
    raw: avatar,
  }))
}

export function adCampaignRows(adCampaigns: AdCampaign[]): ArtifactListRow[] {
  return adCampaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.name || 'Untitled Campaign',
    subtitle: campaign.objective,
    description: `${campaign.ad_sets?.length ?? 0} ad sets`,
    created_at: campaign.created_at,
    updated_at: campaign.updated_at,
    groupValues: {
      type: campaign.objective,
      status: campaign.status,
      objective: campaign.objective,
    },
    sortValues: { name: campaign.name, status: campaign.status, created_at: campaign.created_at },
    badges: compactBadges(
      badge(campaign.objective, 'blue'),
      badge(campaign.status, 'green'),
      badge(campaign.meta_campaign_id ? 'meta synced' : null, 'purple'),
    ),
    raw: campaign,
  }))
}

export function adRows(ads: Ad[], adSetNameById: Record<string, string>): ArtifactListRow[] {
  return ads.map((ad) => ({
    id: ad.id,
    title: ad.headline || 'Untitled Ad',
    subtitle: [ad.platform, ad.placement].filter(Boolean).join(' / '),
    description: ad.primary_text,
    thumbnailUrl: ad.image_url,
    created_at: ad.created_at,
    updated_at: ad.updated_at,
    groupValues: {
      type: ad.ad_format,
      platform: ad.platform,
      placement: ad.placement,
      status: ad.meta_effective_status ?? 'draft',
      source: ad.source ?? 'vibey',
      ad_set_id: ad.ad_set_id ? (adSetNameById[ad.ad_set_id] ?? ad.ad_set_id) : 'Ungrouped',
    },
    sortValues: {
      headline: ad.headline,
      status: ad.meta_effective_status,
      created_at: ad.created_at,
    },
    badges: compactBadges(
      badge(ad.platform, 'blue'),
      badge(ad.placement, 'purple'),
      badge(ad.source ?? 'vibey', 'green'),
    ),
    raw: ad,
  }))
}

export function sequenceRows(sequences: Sequence[]): ArtifactListRow[] {
  return sequences.map((sequence) => ({
    id: sequence.id,
    title: sequence.name || 'Untitled Sequence',
    subtitle: `${sequence.sequence_emails?.length ?? 0} emails`,
    created_at: sequence.created_at,
    updated_at: sequence.updated_at,
    groupValues: {
      type: 'sequence',
      status: sequence.status,
      trigger: String(sequence.trigger?.type ?? 'manual'),
    },
    sortValues: { name: sequence.name, status: sequence.status, created_at: sequence.created_at },
    badges: compactBadges(
      badge(sequence.status, 'green'),
      badge(`${sequence.sequence_emails?.length ?? 0} emails`, 'blue'),
    ),
    raw: sequence,
  }))
}

export function emailRows(emails: EmailArtifact[]): ArtifactListRow[] {
  return emails.map((email) => ({
    id: email.id,
    title: email.subject || 'Untitled Email',
    subtitle: email.status,
    description: email.body,
    created_at: email.created_at,
    updated_at: email.updated_at,
    groupValues: {
      type: 'email',
      status: email.status,
      source_item_id: email.source_item_id,
    },
    sortValues: {
      subject: email.subject,
      status: email.status,
      created_at: email.created_at,
      updated_at: email.updated_at,
    },
    badges: compactBadges(
      badge(
        email.status === 'sent' ? 'sent' : email.status === 'ready' ? 'ready' : 'draft',
        email.status === 'sent' ? 'green' : email.status === 'ready' ? 'blue' : 'muted',
      ),
    ),
    raw: email,
  }))
}

export function presentationRows(presentations: Presentation[]): ArtifactListRow[] {
  return presentations.map((presentation) => ({
    id: presentation.id,
    title: presentation.name || 'Untitled Presentation',
    subtitle: presentation.published_url,
    description: `${presentation.slides_count ?? presentation.slides?.length ?? 0} slides`,
    created_at: presentation.created_at,
    updated_at: presentation.updated_at,
    groupValues: { type: 'presentation', status: presentation.status },
    sortValues: {
      name: presentation.name,
      status: presentation.status,
      created_at: presentation.created_at,
    },
    badges: compactBadges(badge(presentation.status, 'purple')),
    raw: presentation,
  }))
}

export function socialPostRows(posts: SocialPost[]): ArtifactListRow[] {
  return posts.map((post) => ({
    id: post.id,
    title: post.headline?.trim() || post.caption?.slice(0, 80) || 'Social Post',
    subtitle: [post.platform, post.post_type].filter(Boolean).join(' / '),
    description: post.caption,
    thumbnailUrl: post.image_url ?? post.video_url,
    created_at: post.created_at,
    updated_at: post.updated_at,
    groupValues: {
      type: post.post_type,
      platform: post.platform,
      post_type: post.post_type,
      status: post.status,
    },
    sortValues: {
      status: post.status,
      scheduled_at: post.scheduled_at,
      created_at: post.created_at,
    },
    badges: compactBadges(badge(post.platform, 'blue'), badge(post.status, 'green')),
    raw: post,
  }))
}
