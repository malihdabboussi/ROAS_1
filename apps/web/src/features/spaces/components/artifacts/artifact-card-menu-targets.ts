import type {
  AvatarMenuTarget,
  EmailMenuTarget,
  FormMenuTarget,
  PresentationMenuTarget,
  SequenceMenuTarget,
} from '@/lib/artifacts'
import type { AdMenuTarget } from './ad/use-ad-menu-actions'
import type { OfferMenuTarget } from './offer/use-offer-menu-actions'
import type { SocialPostMenuTarget } from './social-post/use-social-post-menu-actions'

export function buildOfferMenuTarget(
  offer?: { id: string; name: string | null; campaign_id: string | null },
): OfferMenuTarget | undefined {
  return offer ? { id: offer.id, name: offer.name, campaign_id: offer.campaign_id } : undefined
}

export function buildSocialPostMenuTarget(
  post?: {
    id: string
    caption?: string | null
    headline?: string | null
    status: SocialPostMenuTarget['status']
    scheduled_at?: string | null
    campaign_id?: string | null
    platform?: SocialPostMenuTarget['platform'] | null
  },
): SocialPostMenuTarget | undefined {
  return post
    ? {
        id: post.id,
        caption: post.caption ?? null,
        headline: post.headline ?? null,
        status: post.status,
        scheduled_at: post.scheduled_at ?? null,
        campaign_id: post.campaign_id ?? null,
        platform: post.platform ?? null,
      }
    : undefined
}

export function buildSequenceMenuTarget(
  sequence?: { id: string; name: string | null; campaign_id: string | null },
): SequenceMenuTarget | undefined {
  return sequence
    ? {
        id: sequence.id,
        name: sequence.name ?? null,
        campaign_id: sequence.campaign_id ?? null,
      }
    : undefined
}

export function buildPresentationMenuTarget(
  presentation?: { id: string; name: string | null; campaign_id: string | null },
): PresentationMenuTarget | undefined {
  return presentation
    ? {
        id: presentation.id,
        name: presentation.name ?? null,
        campaign_id: presentation.campaign_id ?? null,
      }
    : undefined
}

export function buildAvatarMenuTarget(
  avatar?: { id: string; name: string | null; campaign_id?: string | null },
  parentCampaignId?: string | null,
): AvatarMenuTarget | undefined {
  return avatar
    ? {
        id: avatar.id,
        name: avatar.name ?? null,
        campaign_id: avatar.campaign_id ?? parentCampaignId ?? null,
      }
    : undefined
}

export function buildAdMenuTarget(
  ad?: {
    id: string
    headline?: string | null
    primary_text?: string | null
    campaign_id?: string | null
    ad_set_id?: string | null
  },
): AdMenuTarget | undefined {
  return ad
    ? {
        id: ad.id,
        headline: ad.headline ?? '',
        primary_text: ad.primary_text ?? '',
        campaign_id: ad.campaign_id ?? null,
        ad_set_id: ad.ad_set_id ?? null,
      }
    : undefined
}

export function buildFormMenuTarget(
  form?: {
    id: string
    name: string
    status: FormMenuTarget['status']
    share_token: string
    visibility: FormMenuTarget['visibility']
    published_url?: string | null
    campaign_id?: string | null
    space_id?: string | null
    settings?: { target_space_id?: unknown } | null
  },
): FormMenuTarget | undefined {
  return form
    ? {
        id: form.id,
        name: form.name,
        status: form.status,
        share_token: form.share_token,
        visibility: form.visibility,
        published_url: form.published_url ?? null,
        campaign_id: form.campaign_id ?? null,
        space_id: form.space_id ?? null,
        target_space_id:
          (typeof form.settings?.target_space_id === 'string' && form.settings.target_space_id) ||
          null,
      }
    : undefined
}

export function buildEmailMenuTarget(
  email?: { id: string; subject?: string | null; campaign_id?: string | null },
): EmailMenuTarget | undefined {
  return email
    ? {
        id: email.id,
        subject: email.subject ?? null,
        campaign_id: email.campaign_id ?? null,
      }
    : undefined
}
