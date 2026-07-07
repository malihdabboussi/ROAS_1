'use client'

import {
  AlignLeft,
  Calendar,
  CircleDot,
  Clapperboard,
  Clock,
  Eye,
  FolderInput,
  GitBranch,
  Hash,
  Inbox,
  Layers,
  LayoutTemplate,
  Link,
  ListChecks,
  Mail,
  Megaphone,
  Package,
  RefreshCw,
  Zap,
} from 'lucide-react'
import {
  AD_CARD_FIELD_IDS,
  AD_CARD_FIELD_LABEL,
  normalizeAdCardFieldOrder,
  type AdCardFieldId,
} from '../../../../lib/ad-card-fields'
import {
  AVATAR_CARD_FIELD_IDS,
  AVATAR_CARD_FIELD_LABEL,
  normalizeAvatarCardFieldOrder,
  type AvatarCardFieldId,
} from '../../../../lib/avatar-card-fields'
import {
  FORM_CARD_FIELD_IDS,
  FORM_CARD_FIELD_LABEL,
  normalizeFormCardFieldOrder,
  type FormCardFieldId,
} from '../../../../lib/form-card-fields'
import {
  FUNNEL_CARD_FIELD_IDS,
  FUNNEL_CARD_FIELD_LABEL,
  normalizeFunnelCardFieldOrder,
  type FunnelCardFieldId,
} from '../../../../lib/funnel-card-fields'
import {
  normalizePresentationCardFieldOrder,
  PRESENTATION_CARD_FIELD_IDS,
  PRESENTATION_CARD_FIELD_LABEL,
  type PresentationCardFieldId,
} from '../../../../lib/presentation-card-fields'
import {
  normalizeSequenceCardFieldOrder,
  SEQUENCE_CARD_FIELD_IDS,
  SEQUENCE_CARD_FIELD_LABEL,
  type SequenceCardFieldId,
} from '../../../../lib/sequence-card-fields'
import {
  normalizeSocialPostCardFieldOrder,
  SOCIAL_POST_CARD_FIELD_IDS,
  SOCIAL_POST_CARD_FIELD_LABEL,
  type SocialPostCardFieldId,
} from '../../../../lib/social-post-card-fields'
import type { ViewDef } from '../../../../types/space-schema'
import { CardFieldsSubView, type CardFieldUiDef } from '../../shared/CardFieldsSubView'

const AD_CARD_UI_DEFS: CardFieldUiDef<AdCardFieldId>[] = AD_CARD_FIELD_IDS.map((id) => ({
  id,
  label: AD_CARD_FIELD_LABEL[id],
  icon: {
    platform: Layers,
    placement: LayoutTemplate,
    ad_format: Clapperboard,
    status: CircleDot,
    source: Megaphone,
    ad_set: FolderInput,
    created_at: Clock,
    updated_at: RefreshCw,
    primary_text: AlignLeft,
    destination_url: Link,
  }[id],
}))

const SOCIAL_POST_CARD_UI_DEFS: CardFieldUiDef<SocialPostCardFieldId>[] =
  SOCIAL_POST_CARD_FIELD_IDS.map((id) => ({
    id,
    label: SOCIAL_POST_CARD_FIELD_LABEL[id],
    icon: {
      platform: Layers,
      post_type: Clapperboard,
      status: CircleDot,
      created_at: Clock,
      updated_at: RefreshCw,
      scheduled_at: Calendar,
    }[id],
  }))

const FUNNEL_CARD_UI_DEFS: CardFieldUiDef<FunnelCardFieldId>[] = FUNNEL_CARD_FIELD_IDS.map(
  (id) => ({
    id,
    label: FUNNEL_CARD_FIELD_LABEL[id],
    icon: {
      funnel_type: GitBranch,
      status: CircleDot,
      published_url: Link,
      created_at: Clock,
      updated_at: RefreshCw,
    }[id],
  }),
)

const SEQUENCE_CARD_UI_DEFS: CardFieldUiDef<SequenceCardFieldId>[] = SEQUENCE_CARD_FIELD_IDS.map(
  (id) => ({
    id,
    label: SEQUENCE_CARD_FIELD_LABEL[id],
    icon: {
      status: CircleDot,
      funnel: GitBranch,
      trigger: Zap,
      email_count: Mail,
      created_at: Clock,
      updated_at: RefreshCw,
    }[id],
  }),
)

const PRESENTATION_CARD_UI_DEFS: CardFieldUiDef<PresentationCardFieldId>[] =
  PRESENTATION_CARD_FIELD_IDS.map((id) => ({
    id,
    label: PRESENTATION_CARD_FIELD_LABEL[id],
    icon: {
      status: CircleDot,
      slide_count: Layers,
      published_url: Link,
      slug: Hash,
      offer: Package,
      created_at: Clock,
      updated_at: RefreshCw,
    }[id],
  }))

const AVATAR_CARD_UI_DEFS: CardFieldUiDef<AvatarCardFieldId>[] = AVATAR_CARD_FIELD_IDS.map(
  (id) => ({
    id,
    label: AVATAR_CARD_FIELD_LABEL[id],
    icon: {
      offer: Package,
      created_at: Clock,
      updated_at: RefreshCw,
    }[id],
  }),
)

const FORM_CARD_UI_DEFS: CardFieldUiDef<FormCardFieldId>[] = FORM_CARD_FIELD_IDS.map((id) => ({
  id,
  label: FORM_CARD_FIELD_LABEL[id],
  icon: {
    status: CircleDot,
    visibility: Eye,
    responses_count: Inbox,
    question_count: ListChecks,
    published_url: Link,
    target_space: FolderInput,
    created_at: Clock,
    updated_at: RefreshCw,
    last_response_at: Calendar,
    slug: Hash,
  }[id],
}))

type CardFieldsWrapperProps = {
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}

export function AdsCardFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: CardFieldsWrapperProps) {
  return (
    <CardFieldsSubView
      activeViewId={activeView.id}
      fieldDefs={AD_CARD_UI_DEFS}
      value={activeView.ads_config?.ad_card_fields}
      normalize={normalizeAdCardFieldOrder}
      onFieldsChange={(next) =>
        void onViewPatch({
          ads_config: {
            ...(activeView.ads_config ?? {}),
            ad_card_fields: next,
          },
        })
      }
      onBack={onBack}
      onClose={onClose}
    />
  )
}

export function SocialPostsCardFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: CardFieldsWrapperProps) {
  return (
    <CardFieldsSubView
      activeViewId={activeView.id}
      fieldDefs={SOCIAL_POST_CARD_UI_DEFS}
      value={activeView.social_posts_config?.social_post_card_fields}
      normalize={normalizeSocialPostCardFieldOrder}
      onFieldsChange={(next) =>
        void onViewPatch({
          social_posts_config: {
            ...(activeView.social_posts_config ?? {}),
            social_post_card_fields: next,
          },
        })
      }
      onBack={onBack}
      onClose={onClose}
    />
  )
}

export function FunnelsCardFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: CardFieldsWrapperProps) {
  return (
    <CardFieldsSubView
      activeViewId={activeView.id}
      fieldDefs={FUNNEL_CARD_UI_DEFS}
      value={activeView.funnels_config?.funnel_card_fields}
      normalize={normalizeFunnelCardFieldOrder}
      onFieldsChange={(next) =>
        void onViewPatch({
          funnels_config: { ...(activeView.funnels_config ?? {}), funnel_card_fields: next },
        })
      }
      onBack={onBack}
      onClose={onClose}
    />
  )
}

export function SequencesCardFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: CardFieldsWrapperProps) {
  return (
    <CardFieldsSubView
      activeViewId={activeView.id}
      fieldDefs={SEQUENCE_CARD_UI_DEFS}
      value={activeView.sequences_config?.sequence_card_fields}
      normalize={normalizeSequenceCardFieldOrder}
      onFieldsChange={(next) =>
        void onViewPatch({
          sequences_config: {
            ...(activeView.sequences_config ?? {}),
            sequence_card_fields: next,
          },
        })
      }
      onBack={onBack}
      onClose={onClose}
    />
  )
}

export function PresentationsCardFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: CardFieldsWrapperProps) {
  return (
    <CardFieldsSubView
      activeViewId={activeView.id}
      fieldDefs={PRESENTATION_CARD_UI_DEFS}
      value={activeView.presentations_config?.presentation_card_fields}
      normalize={normalizePresentationCardFieldOrder}
      onFieldsChange={(next) =>
        void onViewPatch({
          presentations_config: {
            ...(activeView.presentations_config ?? {}),
            presentation_card_fields: next,
          },
        })
      }
      onBack={onBack}
      onClose={onClose}
    />
  )
}

export function FormsCardFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: CardFieldsWrapperProps) {
  return (
    <CardFieldsSubView
      activeViewId={activeView.id}
      fieldDefs={FORM_CARD_UI_DEFS}
      value={activeView.forms_config?.form_card_fields}
      normalize={normalizeFormCardFieldOrder}
      onFieldsChange={(next) =>
        void onViewPatch({
          forms_config: {
            ...(activeView.forms_config ?? {}),
            form_card_fields: next,
          },
        })
      }
      onBack={onBack}
      onClose={onClose}
    />
  )
}

export function AvatarsCardFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: CardFieldsWrapperProps) {
  return (
    <CardFieldsSubView
      activeViewId={activeView.id}
      fieldDefs={AVATAR_CARD_UI_DEFS}
      value={activeView.avatars_config?.avatar_card_fields}
      normalize={normalizeAvatarCardFieldOrder}
      onFieldsChange={(next) =>
        void onViewPatch({
          avatars_config: {
            ...(activeView.avatars_config ?? {}),
            avatar_card_fields: next,
          },
        })
      }
      onBack={onBack}
      onClose={onClose}
    />
  )
}
