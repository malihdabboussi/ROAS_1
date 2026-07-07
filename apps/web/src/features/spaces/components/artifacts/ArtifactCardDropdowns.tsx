'use client'

import type { Dispatch, MouseEvent, RefObject, SetStateAction } from 'react'
import type {
  AvatarMenuTarget,
  EmailMenuTarget,
  FormMenuTarget,
  PresentationMenuTarget,
  SequenceMenuTarget,
} from '@/lib/artifacts'
import { AdMenuDropdown } from './ad/AdMenuDropdown'
import type { AdMenuTarget } from './ad/use-ad-menu-actions'
import type { ArtifactListRow } from './artifact-display'
import { AvatarMenuDropdown } from './avatar/AvatarMenuDropdown'
import { EmailMenuDropdown } from './email/EmailMenuDropdown'
import { FormMenuDropdown } from './form/FormMenuDropdown'
import { FunnelMenuDropdown } from './funnel/FunnelMenuDropdown'
import type { FunnelMenuTarget } from './funnel/use-funnel-menu-actions'
import { OfferMenuDropdown } from './offer/OfferMenuDropdown'
import type { OfferMenuTarget } from './offer/use-offer-menu-actions'
import { PresentationMenuDropdown } from './presentation/PresentationMenuDropdown'
import { SequenceMenuDropdown } from './sequence/SequenceMenuDropdown'
import { SocialPostMenuDropdown } from './social-post/SocialPostMenuDropdown'
import type { SocialPostMenuTarget } from './social-post/use-social-post-menu-actions'

type DropdownPointer = { x: number; y: number } | null

export interface ArtifactCardDropdownControl<TTarget> {
  target?: TTarget
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  pointerPosition: DropdownPointer
  setOpen: Dispatch<SetStateAction<boolean>>
  setPointer: Dispatch<SetStateAction<DropdownPointer>>
}

interface ArtifactCardDropdownsProps {
  row: ArtifactListRow
  onOpenFull: (row: ArtifactListRow, e: MouseEvent) => void
  onArtifactListMutated?: () => void
  funnel?: ArtifactCardDropdownControl<FunnelMenuTarget>
  offer?: ArtifactCardDropdownControl<OfferMenuTarget>
  socialPost?: ArtifactCardDropdownControl<SocialPostMenuTarget>
  sequence?: ArtifactCardDropdownControl<SequenceMenuTarget>
  presentation?: ArtifactCardDropdownControl<PresentationMenuTarget>
  avatar?: ArtifactCardDropdownControl<AvatarMenuTarget>
  ad?: ArtifactCardDropdownControl<AdMenuTarget>
  form?: ArtifactCardDropdownControl<FormMenuTarget>
  email?: ArtifactCardDropdownControl<EmailMenuTarget>
}

export function ArtifactCardDropdowns({
  row,
  onOpenFull,
  onArtifactListMutated,
  funnel,
  offer,
  socialPost,
  sequence,
  presentation,
  avatar,
  ad,
  form,
  email,
}: ArtifactCardDropdownsProps) {
  const close = (control: ArtifactCardDropdownControl<unknown>) => {
    control.setOpen(false)
    control.setPointer(null)
  }
  const openFull = (control: ArtifactCardDropdownControl<unknown>) => {
    close(control)
    onOpenFull(row, { stopPropagation: () => {} } as MouseEvent)
  }

  return (
    <>
      {funnel?.target && funnel.open ? (
        <FunnelMenuDropdown
          funnel={funnel.target}
          anchorRef={funnel.anchorRef}
          pointerPosition={funnel.pointerPosition}
          onClose={() => close(funnel)}
          onOpenFullView={() => openFull(funnel)}
        />
      ) : null}
      {offer?.target && offer.open ? (
        <OfferMenuDropdown
          offer={offer.target}
          anchorRef={offer.anchorRef}
          pointerPosition={offer.pointerPosition}
          onClose={() => close(offer)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(offer)}
        />
      ) : null}
      {socialPost?.target && socialPost.open ? (
        <SocialPostMenuDropdown
          post={socialPost.target}
          anchorRef={socialPost.anchorRef}
          pointerPosition={socialPost.pointerPosition}
          onClose={() => close(socialPost)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(socialPost)}
        />
      ) : null}
      {sequence?.target && sequence.open ? (
        <SequenceMenuDropdown
          sequence={sequence.target}
          anchorRef={sequence.anchorRef}
          pointerPosition={sequence.pointerPosition}
          onClose={() => close(sequence)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(sequence)}
        />
      ) : null}
      {presentation?.target && presentation.open ? (
        <PresentationMenuDropdown
          presentation={presentation.target}
          anchorRef={presentation.anchorRef}
          pointerPosition={presentation.pointerPosition}
          onClose={() => close(presentation)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(presentation)}
          onDeleted={onArtifactListMutated}
        />
      ) : null}
      {avatar?.target && avatar.open ? (
        <AvatarMenuDropdown
          avatar={avatar.target}
          anchorRef={avatar.anchorRef}
          pointerPosition={avatar.pointerPosition}
          onClose={() => close(avatar)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(avatar)}
          onDeleted={onArtifactListMutated}
        />
      ) : null}
      {ad?.target && ad.open ? (
        <AdMenuDropdown
          ad={ad.target}
          anchorRef={ad.anchorRef}
          pointerPosition={ad.pointerPosition}
          onClose={() => close(ad)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(ad)}
          onDeleted={onArtifactListMutated}
        />
      ) : null}
      {form?.target && form.open ? (
        <FormMenuDropdown
          form={form.target}
          anchorRef={form.anchorRef}
          pointerPosition={form.pointerPosition}
          onClose={() => close(form)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(form)}
        />
      ) : null}
      {email?.target && email.open ? (
        <EmailMenuDropdown
          email={email.target}
          anchorRef={email.anchorRef}
          pointerPosition={email.pointerPosition}
          onClose={() => close(email)}
          onChanged={onArtifactListMutated}
          onOpenFullView={() => openFull(email)}
          onDeleted={onArtifactListMutated}
        />
      ) : null}
    </>
  )
}
