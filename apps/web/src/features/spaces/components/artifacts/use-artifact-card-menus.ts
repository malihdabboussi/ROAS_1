'use client'

import { useRef, useState, type MouseEvent } from 'react'
import type {
  Ad,
  Avatar,
  EmailArtifact,
  Funnel,
  Offer,
  Presentation,
  Sequence,
  SocialPost,
} from '@/lib/artifacts/artifact-types'
import type {
  AvatarMenuTarget,
  EmailMenuTarget,
  FormMenuTarget,
  PresentationMenuTarget,
  SequenceMenuTarget,
} from '@/lib/artifacts'
import type { Form } from '@/lib/forms/forms-api'
import type { ArtifactCardActionMenuButton } from './ArtifactCardActionButtons'
import type { ArtifactCardDropdownControl } from './ArtifactCardDropdowns'
import {
  buildAdMenuTarget,
  buildAvatarMenuTarget,
  buildEmailMenuTarget,
  buildFormMenuTarget,
  buildOfferMenuTarget,
  buildPresentationMenuTarget,
  buildSequenceMenuTarget,
  buildSocialPostMenuTarget,
} from './artifact-card-menu-targets'
import type { ArtifactListRow } from './artifact-display'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import type { AdMenuTarget } from './ad/use-ad-menu-actions'
import type { FunnelMenuTarget } from './funnel/use-funnel-menu-actions'
import type { OfferMenuTarget } from './offer/use-offer-menu-actions'
import type { SocialPostMenuTarget } from './social-post/use-social-post-menu-actions'

type ArtifactCardContextMenuHandler = (e: MouseEvent<HTMLDivElement>) => void

interface UseArtifactCardMenusInput {
  row: ArtifactListRow
  previewType: ArtifactPreviewSelection['type']
  parentCampaignId: string
}

interface ArtifactCardMenuDefinition {
  enabled: boolean
  menu: ArtifactCardActionMenuButton
}

function menuDefinition(
  enabled: boolean,
  key: string,
  label: string,
  control: Pick<ArtifactCardActionMenuButton, 'open' | 'anchorRef' | 'setPointer' | 'setOpen'>,
): ArtifactCardMenuDefinition {
  return {
    enabled,
    menu: {
      key,
      label,
      open: control.open,
      anchorRef: control.anchorRef,
      setPointer: control.setPointer,
      setOpen: control.setOpen,
    },
  }
}

export function useArtifactCardMenus({
  row,
  previewType,
  parentCampaignId,
}: UseArtifactCardMenusInput) {
  const isOfferCard = previewType === 'offer'
  const isFunnelCard = previewType === 'funnel'
  const isSocialPostCard = previewType === 'social_post'
  const isSequenceCard = previewType === 'sequence'
  const isPresentationCard = previewType === 'presentation'
  const isAvatarCard = previewType === 'avatar'
  const isAdCard = previewType === 'ad'
  const isFormCard = previewType === 'form'
  const isEmailCard = previewType === 'email'
  const socialRaw = isSocialPostCard ? (row.raw as SocialPost | undefined) : undefined
  const funnelCardRaw = isFunnelCard ? (row.raw as Funnel | undefined) : undefined
  const sequenceRaw = isSequenceCard ? (row.raw as Sequence | undefined) : undefined
  const presentationRaw = isPresentationCard ? (row.raw as Presentation | undefined) : undefined
  const avatarRaw = isAvatarCard ? (row.raw as Avatar | undefined) : undefined
  const adRaw = isAdCard ? (row.raw as Ad | undefined) : undefined
  const formRaw = isFormCard ? (row.raw as Form | undefined) : undefined
  const emailRaw = isEmailCard ? (row.raw as EmailArtifact | undefined) : undefined
  const funnelRaw = isFunnelCard ? (row.raw as FunnelMenuTarget | undefined) : undefined

  const funnelKebabRef = useRef<HTMLButtonElement>(null)
  const [funnelMenuOpen, setFunnelMenuOpen] = useState(false)
  const [funnelMenuPointer, setFunnelMenuPointer] = useState<{ x: number; y: number } | null>(null)

  const offerKebabRef = useRef<HTMLButtonElement>(null)
  const [offerMenuOpen, setOfferMenuOpen] = useState(false)
  const [offerMenuPointer, setOfferMenuPointer] = useState<{ x: number; y: number } | null>(null)
  const offerMenuTarget = buildOfferMenuTarget(isOfferCard ? (row.raw as Offer) : undefined)

  const socialPostKebabRef = useRef<HTMLButtonElement>(null)
  const [socialPostMenuOpen, setSocialPostMenuOpen] = useState(false)
  const [socialPostMenuPointer, setSocialPostMenuPointer] = useState<{
    x: number
    y: number
  } | null>(null)
  const socialPostMenuTarget = buildSocialPostMenuTarget(socialRaw)

  const sequenceKebabRef = useRef<HTMLButtonElement>(null)
  const [sequenceMenuOpen, setSequenceMenuOpen] = useState(false)
  const [sequenceMenuPointer, setSequenceMenuPointer] = useState<{
    x: number
    y: number
  } | null>(null)
  const sequenceMenuTarget = buildSequenceMenuTarget(sequenceRaw)

  const presentationKebabRef = useRef<HTMLButtonElement>(null)
  const [presentationMenuOpen, setPresentationMenuOpen] = useState(false)
  const [presentationMenuPointer, setPresentationMenuPointer] = useState<{
    x: number
    y: number
  } | null>(null)
  const presentationMenuTarget = buildPresentationMenuTarget(presentationRaw)

  const avatarKebabRef = useRef<HTMLButtonElement>(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [avatarMenuPointer, setAvatarMenuPointer] = useState<{ x: number; y: number } | null>(null)
  const avatarMenuTarget = buildAvatarMenuTarget(avatarRaw, parentCampaignId)

  const adKebabRef = useRef<HTMLButtonElement>(null)
  const [adMenuOpen, setAdMenuOpen] = useState(false)
  const [adMenuPointer, setAdMenuPointer] = useState<{ x: number; y: number } | null>(null)
  const adMenuTarget = buildAdMenuTarget(adRaw)

  const formKebabRef = useRef<HTMLButtonElement>(null)
  const [formMenuOpen, setFormMenuOpen] = useState(false)
  const [formMenuPointer, setFormMenuPointer] = useState<{ x: number; y: number } | null>(null)
  const formMenuTarget = buildFormMenuTarget(formRaw)

  const emailKebabRef = useRef<HTMLButtonElement>(null)
  const [emailMenuOpen, setEmailMenuOpen] = useState(false)
  const [emailMenuPointer, setEmailMenuPointer] = useState<{ x: number; y: number } | null>(null)
  const emailMenuTarget = buildEmailMenuTarget(emailRaw)

  const dropdownControls = {
    funnel: {
      target: funnelRaw,
      open: funnelMenuOpen,
      anchorRef: funnelKebabRef,
      pointerPosition: funnelMenuPointer,
      setOpen: setFunnelMenuOpen,
      setPointer: setFunnelMenuPointer,
    } satisfies ArtifactCardDropdownControl<FunnelMenuTarget>,
    offer: {
      target: offerMenuTarget,
      open: offerMenuOpen,
      anchorRef: offerKebabRef,
      pointerPosition: offerMenuPointer,
      setOpen: setOfferMenuOpen,
      setPointer: setOfferMenuPointer,
    } satisfies ArtifactCardDropdownControl<OfferMenuTarget>,
    socialPost: {
      target: socialPostMenuTarget,
      open: socialPostMenuOpen,
      anchorRef: socialPostKebabRef,
      pointerPosition: socialPostMenuPointer,
      setOpen: setSocialPostMenuOpen,
      setPointer: setSocialPostMenuPointer,
    } satisfies ArtifactCardDropdownControl<SocialPostMenuTarget>,
    sequence: {
      target: sequenceMenuTarget,
      open: sequenceMenuOpen,
      anchorRef: sequenceKebabRef,
      pointerPosition: sequenceMenuPointer,
      setOpen: setSequenceMenuOpen,
      setPointer: setSequenceMenuPointer,
    } satisfies ArtifactCardDropdownControl<SequenceMenuTarget>,
    presentation: {
      target: presentationMenuTarget,
      open: presentationMenuOpen,
      anchorRef: presentationKebabRef,
      pointerPosition: presentationMenuPointer,
      setOpen: setPresentationMenuOpen,
      setPointer: setPresentationMenuPointer,
    } satisfies ArtifactCardDropdownControl<PresentationMenuTarget>,
    avatar: {
      target: avatarMenuTarget,
      open: avatarMenuOpen,
      anchorRef: avatarKebabRef,
      pointerPosition: avatarMenuPointer,
      setOpen: setAvatarMenuOpen,
      setPointer: setAvatarMenuPointer,
    } satisfies ArtifactCardDropdownControl<AvatarMenuTarget>,
    ad: {
      target: adMenuTarget,
      open: adMenuOpen,
      anchorRef: adKebabRef,
      pointerPosition: adMenuPointer,
      setOpen: setAdMenuOpen,
      setPointer: setAdMenuPointer,
    } satisfies ArtifactCardDropdownControl<AdMenuTarget>,
    form: {
      target: formMenuTarget,
      open: formMenuOpen,
      anchorRef: formKebabRef,
      pointerPosition: formMenuPointer,
      setOpen: setFormMenuOpen,
      setPointer: setFormMenuPointer,
    } satisfies ArtifactCardDropdownControl<FormMenuTarget>,
    email: {
      target: emailMenuTarget,
      open: emailMenuOpen,
      anchorRef: emailKebabRef,
      pointerPosition: emailMenuPointer,
      setOpen: setEmailMenuOpen,
      setPointer: setEmailMenuPointer,
    } satisfies ArtifactCardDropdownControl<EmailMenuTarget>,
  }

  const menuDefinitions = [
    menuDefinition(isFunnelCard && Boolean(funnelRaw), 'funnel', 'Funnel options', dropdownControls.funnel),
    menuDefinition(isOfferCard && Boolean(offerMenuTarget), 'offer', 'Offer options', dropdownControls.offer),
    menuDefinition(isSocialPostCard && Boolean(socialPostMenuTarget), 'social-post', 'Social post options', dropdownControls.socialPost),
    menuDefinition(isSequenceCard && Boolean(sequenceMenuTarget), 'sequence', 'Sequence options', dropdownControls.sequence),
    menuDefinition(isPresentationCard && Boolean(presentationMenuTarget), 'presentation', 'Presentation options', dropdownControls.presentation),
    menuDefinition(isAvatarCard && Boolean(avatarMenuTarget), 'avatar', 'Avatar options', dropdownControls.avatar),
    menuDefinition(isAdCard && Boolean(adMenuTarget), 'ad', 'Ad options', dropdownControls.ad),
    menuDefinition(isFormCard && Boolean(formMenuTarget), 'form', 'Form options', dropdownControls.form),
    menuDefinition(isEmailCard && Boolean(emailMenuTarget), 'email', 'Email options', dropdownControls.email),
  ]
  const actionMenus = menuDefinitions
    .filter(({ enabled }) => enabled)
    .map(({ menu }) => menu)
  const contextMenu = menuDefinitions.find(({ enabled }) => enabled)?.menu
  const onContextMenu: ArtifactCardContextMenuHandler | undefined = contextMenu
    ? (e) => {
        e.preventDefault()
        contextMenu.setPointer({ x: e.clientX, y: e.clientY })
        contextMenu.setOpen(true)
      }
    : undefined

  return {
    isOfferCard,
    isFunnelCard,
    isSocialPostCard,
    isSequenceCard,
    isPresentationCard,
    isAvatarCard,
    isAdCard,
    isFormCard,
    isEmailCard,
    socialRaw,
    funnelCardRaw,
    sequenceRaw,
    presentationRaw,
    avatarRaw,
    adRaw,
    formRaw,
    emailRaw,
    actionMenus,
    dropdownControls,
    onContextMenu,
  }
}
