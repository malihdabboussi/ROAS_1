'use client'

import { Image as ImageIcon, Mail, User } from 'lucide-react'
import type {
  Ad,
  Avatar,
  EmailArtifact,
  Funnel,
  Presentation,
  Sequence,
  SocialPost,
} from '@/lib/artifacts/artifact-types'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from '@/lib/chat/artifact-preview-layout'
import type { Form } from '@/lib/forms/forms-api'
import { cn } from '@/lib/utils/cn'
import { htmlToPlainTextPreview } from '@/features/spaces/components/space-item-values'
import { resolveAvatarPortraitSrc } from '@/features/spaces/lib/avatar-card-fields'
import { AdCardMetaRows } from './AdCardMetaRows'
import { AdCardPreview } from './AdCardPreview'
import { artifactBadgeClass } from './artifact-card-display'
import { formatRelativeArtifactDate, type ArtifactListRow } from './artifact-display'
import { AvatarCardMetaRows } from './AvatarCardMetaRows'
import { FormCardMetaRows } from './FormCardMetaRows'
import { FunnelCardHeroPreview } from './FunnelCardHeroPreview'
import { FunnelCardMetaRows } from './FunnelCardMetaRows'
import { PresentationCardHeroPreview } from './PresentationCardHeroPreview'
import { PresentationCardMetaRows } from './PresentationCardMetaRows'
import { SequenceCardMetaRows } from './SequenceCardMetaRows'
import { SocialPostCardMetaRows } from './SocialPostCardMetaRows'
import { SocialPostCardPreview } from './SocialPostCardPreview'

interface ArtifactCardBodyProps {
  row: ArtifactListRow
  previewType: string
  socialRaw?: SocialPost
  funnelRaw?: Funnel
  sequenceRaw?: Sequence
  presentationRaw?: Presentation
  avatarRaw?: Avatar
  adRaw?: Ad
  formRaw?: Form
  emailRaw?: EmailArtifact
  socialPostCardFieldIds?: string[]
  funnelCardFieldIds?: string[]
  sequenceCardFieldIds?: string[]
  sequenceFunnelMap?: Map<string, string>
  presentationsCardFieldIds?: string[]
  presentationOfferMap?: Map<string, string>
  avatarsCardFieldIds?: string[]
  avatarOfferMap?: Map<string, string>
  adCardFieldIds?: string[]
  formCardFieldIds?: string[]
  formAggregatesMap?: Map<
    string,
    {
      responses_count: number
      last_response_at: string | null
      target_space_name: string | null
    }
  >
}

export function ArtifactCardBody({
  row,
  previewType,
  socialRaw,
  funnelRaw,
  sequenceRaw,
  presentationRaw,
  avatarRaw,
  adRaw,
  formRaw,
  emailRaw,
  socialPostCardFieldIds = [],
  funnelCardFieldIds = [],
  sequenceCardFieldIds = [],
  sequenceFunnelMap,
  presentationsCardFieldIds = [],
  presentationOfferMap,
  avatarsCardFieldIds = [],
  avatarOfferMap,
  adCardFieldIds = [],
  formCardFieldIds = [],
  formAggregatesMap,
}: ArtifactCardBodyProps) {
  const isOfferCard = previewType === 'offer'
  const isFunnelCard = previewType === 'funnel'
  const isSocialPostCard = previewType === 'social_post'
  const isSequenceCard = previewType === 'sequence'
  const isPresentationCard = previewType === 'presentation'
  const isAvatarCard = previewType === 'avatar'
  const isAdCard = previewType === 'ad'
  const isFormCard = previewType === 'form'
  const isEmailCard = previewType === 'email'
  const avatarPortraitSrc = avatarRaw ? resolveAvatarPortraitSrc(avatarRaw.persona_data) : undefined
  const emailBodyPreview = isEmailCard
    ? htmlToPlainTextPreview(emailRaw?.body ?? row.description)
    : ''

  if (isFunnelCard) {
    return (
      <>
        <FunnelCardHeroPreview funnelId={row.id} />
        <div className="flex flex-col gap-1.5 px-3 py-2 pr-10">
          <p className="line-clamp-2 min-h-[2lh] min-w-0 text-sm font-semibold leading-tight text-[var(--foreground)]">
            {row.title}
          </p>
          {funnelRaw ? <FunnelCardMetaRows funnel={funnelRaw} fieldIds={funnelCardFieldIds} /> : null}
        </div>
      </>
    )
  }

  if (isSocialPostCard && socialRaw) {
    return (
      <>
        <SocialPostCardPreview post={socialRaw} />
        <div className="flex flex-col gap-1.5 px-3 py-2 pr-10">
          <p className="line-clamp-2 min-h-[2lh] min-w-0 text-sm font-semibold leading-tight text-[var(--foreground)]">
            {row.title}
          </p>
          <SocialPostCardMetaRows post={socialRaw} fieldIds={socialPostCardFieldIds} />
        </div>
      </>
    )
  }

  if (isAdCard && adRaw) {
    return (
      <>
        <AdCardPreview ad={adRaw} />
        <div className="flex flex-col gap-1.5 px-3 py-2 pr-10">
          <p className="line-clamp-2 min-h-[2lh] min-w-0 text-sm font-semibold leading-tight text-[var(--foreground)]">
            {row.title}
          </p>
          <AdCardMetaRows
            ad={adRaw}
            fieldIds={adCardFieldIds}
            adSetName={row.groupValues?.ad_set_id ?? null}
          />
        </div>
      </>
    )
  }

  if (isSequenceCard && sequenceRaw) {
    return (
      <>
        <p className="line-clamp-2 min-h-[2lh] pr-10 text-sm font-semibold leading-tight text-[var(--foreground)]">
          {row.title}
        </p>
        <SequenceCardMetaRows
          sequence={sequenceRaw}
          fieldIds={sequenceCardFieldIds}
          funnelName={sequenceFunnelMap?.get(sequenceRaw.id)}
        />
      </>
    )
  }

  if (isPresentationCard && presentationRaw) {
    return (
      <>
        <PresentationCardHeroPreview presentationId={row.id} />
        <div className="flex flex-col gap-1.5 px-3 py-2 pr-10">
          <p className="line-clamp-2 min-h-[2lh] min-w-0 text-sm font-semibold leading-tight text-[var(--foreground)]">
            {row.title}
          </p>
          <PresentationCardMetaRows
            presentation={presentationRaw}
            fieldIds={presentationsCardFieldIds}
            offerName={
              presentationRaw.offer_id
                ? presentationOfferMap?.get(presentationRaw.offer_id)
                : undefined
            }
          />
        </div>
      </>
    )
  }

  if (isAvatarCard && avatarRaw) {
    return (
      <>
        <div className="gap-spacing-4 flex min-w-0 items-start px-3 pb-2 pr-10 pt-3">
          <div className="shrink-0">
            {avatarPortraitSrc ? (
              <img
                src={avatarPortraitSrc}
                alt=""
                className="rounded-spacing-3 h-spacing-24 w-spacing-24 object-cover"
              />
            ) : (
              <div className="rounded-spacing-3 h-spacing-24 w-spacing-24 flex items-center justify-center bg-[var(--color-hover-subtle)] text-[var(--color-muted-foreground)]">
                <User className="icon-lg" />
              </div>
            )}
          </div>
          <p className="line-clamp-2 min-h-[2lh] min-w-0 flex-1 text-sm font-semibold leading-tight text-[var(--foreground)]">
            {row.title}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 px-3 py-2 pr-10">
          <AvatarCardMetaRows
            avatar={avatarRaw}
            fieldIds={avatarsCardFieldIds}
            offerName={avatarRaw.offer_id ? avatarOfferMap?.get(avatarRaw.offer_id) : undefined}
          />
        </div>
      </>
    )
  }

  if (isFormCard && formRaw) {
    return (
      <div className="p-spacing-4 flex flex-col gap-2 pr-10">
        <p className="line-clamp-2 min-h-[2lh] text-sm font-semibold leading-tight text-[var(--foreground)]">
          {row.title}
        </p>
        <FormCardMetaRows
          form={formRaw}
          fieldIds={formCardFieldIds}
          responsesCount={formAggregatesMap?.get(formRaw.id)?.responses_count ?? null}
          lastResponseAt={formAggregatesMap?.get(formRaw.id)?.last_response_at ?? null}
          targetSpaceName={formAggregatesMap?.get(formRaw.id)?.target_space_name ?? null}
        />
      </div>
    )
  }

  if (isEmailCard) {
    return (
      <>
        <div
          className="border-border bg-muted/30 px-spacing-4 py-spacing-4 relative w-full overflow-hidden border-b"
          style={{ height: ARTIFACT_CHAT_PREVIEW_PANE_PX }}
        >
          {emailBodyPreview.trim() ? (
            <p className="body-3 text-muted-foreground h-full overflow-y-auto whitespace-pre-line pr-1">
              {emailBodyPreview}
            </p>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Mail className="icon-lg text-muted-foreground animate-pulse" />
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{
              background: 'linear-gradient(to bottom, transparent, var(--color-card))',
            }}
          />
        </div>
        <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
          <Mail className="icon-sm text-muted-foreground shrink-0" />
          <span className="body-3 text-accent min-w-0 truncate font-semibold">
            {emailRaw?.subject?.trim() || row.title?.trim() || 'Email draft'}
          </span>
        </div>
      </>
    )
  }

  if (isOfferCard) {
    return (
      <>
        <p className="line-clamp-2 min-h-[2lh] pr-7 text-sm font-semibold leading-tight text-[var(--foreground)]">
          {row.title}
        </p>
        <p className="mt-auto text-[10px] text-[var(--color-muted-foreground)]">
          {formatRelativeArtifactDate(row.updated_at ?? row.created_at)}
        </p>
      </>
    )
  }

  return (
    <>
      {row.thumbnailUrl ? (
        <img src={row.thumbnailUrl} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-[var(--color-hover-subtle)] text-[var(--color-muted-foreground)]">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1">
          {(row.badges ?? []).slice(0, 3).map((badge) => (
            <span
              key={`${row.id}-${badge.label}`}
              className={cn(
                'rounded-spacing-2 inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                artifactBadgeClass(badge.tone),
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
            {row.title}
          </p>
          {row.subtitle ? (
            <p className="mt-1 line-clamp-1 text-xs text-[var(--color-muted-foreground)]">
              {row.subtitle}
            </p>
          ) : null}
        </div>
        {row.description ? (
          <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
            {row.description}
          </p>
        ) : null}
        <p className="mt-auto text-[10px] text-[var(--color-muted-foreground)]">
          {formatRelativeArtifactDate(row.updated_at ?? row.created_at)}
        </p>
      </div>
    </>
  )
}
