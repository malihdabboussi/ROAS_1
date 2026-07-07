'use client'

import { Album, ChevronRight } from 'lucide-react'
import { normalizeAdCardFieldOrder } from '../../../../lib/ad-card-fields'
import { normalizeAvatarCardFieldOrder } from '../../../../lib/avatar-card-fields'
import { normalizeFormCardFieldOrder } from '../../../../lib/form-card-fields'
import { normalizeFunnelCardFieldOrder } from '../../../../lib/funnel-card-fields'
import { normalizePresentationCardFieldOrder } from '../../../../lib/presentation-card-fields'
import { normalizeSequenceCardFieldOrder } from '../../../../lib/sequence-card-fields'
import { normalizeSocialPostCardFieldOrder } from '../../../../lib/social-post-card-fields'
import type { ViewDef } from '../../../../types/space-schema'

function CardFieldsRow({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between transition-colors hover:opacity-80"
    >
      <div className="flex items-center gap-1.5">
        <Album className="icon-sm text-muted-foreground" />
        <span className="body-3 text-foreground font-semibold">Fields</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="typo-caption text-muted-foreground">{count} shown</span>
        <ChevronRight className="icon-xs text-muted-foreground" />
      </div>
    </button>
  )
}

export function ArtifactsCardFieldsSection({
  activeView,
  onOpenAdsCardFields,
  onOpenSocialPostsCardFields,
  onOpenFunnelsCardFields,
  onOpenSequencesCardFields,
  onOpenPresentationsCardFields,
  onOpenAvatarsCardFields,
  onOpenFormsCardFields,
}: {
  activeView: ViewDef
  onOpenAdsCardFields?: () => void
  onOpenSocialPostsCardFields?: () => void
  onOpenFunnelsCardFields?: () => void
  onOpenSequencesCardFields?: () => void
  onOpenPresentationsCardFields?: () => void
  onOpenAvatarsCardFields?: () => void
  onOpenFormsCardFields?: () => void
}) {
  if (activeView.type === 'ads' && onOpenAdsCardFields) {
    return (
      <CardFieldsRow
        count={normalizeAdCardFieldOrder(activeView.ads_config?.ad_card_fields).length}
        onClick={onOpenAdsCardFields}
      />
    )
  }

  if (activeView.type === 'social_posts' && onOpenSocialPostsCardFields) {
    return (
      <CardFieldsRow
        count={
          normalizeSocialPostCardFieldOrder(
            activeView.social_posts_config?.social_post_card_fields,
          ).length
        }
        onClick={onOpenSocialPostsCardFields}
      />
    )
  }

  if (activeView.type === 'funnels' && onOpenFunnelsCardFields) {
    return (
      <CardFieldsRow
        count={normalizeFunnelCardFieldOrder(activeView.funnels_config?.funnel_card_fields).length}
        onClick={onOpenFunnelsCardFields}
      />
    )
  }

  if (activeView.type === 'sequences' && onOpenSequencesCardFields) {
    return (
      <CardFieldsRow
        count={
          normalizeSequenceCardFieldOrder(activeView.sequences_config?.sequence_card_fields).length
        }
        onClick={onOpenSequencesCardFields}
      />
    )
  }

  if (activeView.type === 'presentations' && onOpenPresentationsCardFields) {
    return (
      <CardFieldsRow
        count={
          normalizePresentationCardFieldOrder(
            activeView.presentations_config?.presentation_card_fields,
          ).length
        }
        onClick={onOpenPresentationsCardFields}
      />
    )
  }

  if (activeView.type === 'forms' && onOpenFormsCardFields) {
    return (
      <CardFieldsRow
        count={normalizeFormCardFieldOrder(activeView.forms_config?.form_card_fields).length}
        onClick={onOpenFormsCardFields}
      />
    )
  }

  if (activeView.type === 'avatars' && onOpenAvatarsCardFields) {
    return (
      <CardFieldsRow
        count={normalizeAvatarCardFieldOrder(activeView.avatars_config?.avatar_card_fields).length}
        onClick={onOpenAvatarsCardFields}
      />
    )
  }

  return null
}
