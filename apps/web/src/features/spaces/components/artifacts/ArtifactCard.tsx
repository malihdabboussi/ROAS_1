'use client'

import type { DragEvent as ReactDragEvent, MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { ArtifactCardActionButtons } from './ArtifactCardActionButtons'
import { ArtifactCardBody } from './ArtifactCardBody'
import { ArtifactCardDropdowns } from './ArtifactCardDropdowns'
import {
  artifactCardMaxWidthClass,
  previewTypeToArtifactNodeType,
} from './artifact-card-display'
import type { ArtifactListRow } from './artifact-display'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import { useArtifactCardMenus } from './use-artifact-card-menus'

export interface ArtifactCardProps {
  row: ArtifactListRow
  selected: boolean
  onOpen: (row: ArtifactListRow) => void
  onOpenFull: (row: ArtifactListRow, e: MouseEvent) => void
  previewType: ArtifactPreviewSelection['type']
  onArtifactListMutated?: () => void
  socialPostCardFieldIds: string[]
  funnelCardFieldIds: string[]
  sequenceCardFieldIds: string[]
  presentationsCardFieldIds: string[]
  avatarsCardFieldIds: string[]
  adCardFieldIds: string[]
  formCardFieldIds: string[]
  sequenceFunnelMap?: Map<string, string>
  presentationOfferMap?: Map<string, string>
  avatarOfferMap?: Map<string, string>
  formAggregatesMap?: Map<
    string,
    {
      responses_count: number
      last_response_at: string | null
      target_space_name: string | null
    }
  >
  parentCampaignId: string
}

export function ArtifactCard({
  row,
  selected,
  onOpen,
  onOpenFull,
  previewType,
  onArtifactListMutated,
  socialPostCardFieldIds,
  funnelCardFieldIds,
  sequenceCardFieldIds,
  sequenceFunnelMap,
  presentationsCardFieldIds,
  presentationOfferMap,
  avatarsCardFieldIds,
  avatarOfferMap,
  adCardFieldIds,
  formCardFieldIds,
  formAggregatesMap,
  parentCampaignId,
}: ArtifactCardProps) {
  const {
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
  } = useArtifactCardMenus({ row, previewType, parentCampaignId })

  return (
    <motion.div
      layout
      data-artifact-card
      draggable
      onDragStart={
        ((e: ReactDragEvent<HTMLDivElement>) => {
          const payload = {
            id: row.id,
            type: previewTypeToArtifactNodeType(previewType),
            label: row.title,
          }
          e.dataTransfer.setData('application/x-vibey-artifact', JSON.stringify(payload))
          e.dataTransfer.effectAllowed = 'copy'
        }) as unknown as undefined
      }
      transition={{ layout: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } }}
      onContextMenu={onContextMenu}
      className={cn(
        'card-glass group/artifact relative flex w-full flex-col overflow-hidden rounded-xl text-left transition-colors hover:bg-[var(--color-hover-subtle)]',
        artifactCardMaxWidthClass(previewType),
        !isOfferCard &&
          !isFunnelCard &&
          !isSocialPostCard &&
          !isSequenceCard &&
          !isPresentationCard &&
          !isAvatarCard &&
          !isAdCard &&
          !isFormCard &&
          !isEmailCard &&
          'min-h-[10rem]',
        (isOfferCard || isSequenceCard) && 'min-h-[6.5rem]',
        isFormCard && 'min-h-[7.5rem]',
        selected && 'ring-2 ring-[var(--color-primary)]',
      )}
    >
      <ArtifactCardActionButtons row={row} menus={actionMenus} onOpenFull={onOpenFull} />
      <ArtifactCardDropdowns
        row={row}
        onOpenFull={onOpenFull}
        onArtifactListMutated={onArtifactListMutated}
        {...dropdownControls}
      />
      <button
        type="button"
        onClick={() => onOpen(row)}
        className={cn(
          'flex w-full flex-col text-left',
          !isOfferCard &&
            !isFunnelCard &&
            !isSocialPostCard &&
            !isSequenceCard &&
            !isPresentationCard &&
            !isAvatarCard &&
            !isAdCard &&
            !isFormCard &&
            !isEmailCard &&
            'min-h-[10rem]',
          (isOfferCard || isSequenceCard) && 'min-h-[6.5rem] flex-1 gap-3 p-4',
          isFormCard && 'flex-1',
        )}
      >
        <ArtifactCardBody
          row={row}
          previewType={previewType}
          socialRaw={socialRaw}
          funnelRaw={funnelCardRaw}
          sequenceRaw={sequenceRaw}
          presentationRaw={presentationRaw}
          avatarRaw={avatarRaw}
          adRaw={adRaw}
          formRaw={formRaw}
          emailRaw={emailRaw}
          socialPostCardFieldIds={socialPostCardFieldIds}
          funnelCardFieldIds={funnelCardFieldIds}
          sequenceCardFieldIds={sequenceCardFieldIds}
          sequenceFunnelMap={sequenceFunnelMap}
          presentationsCardFieldIds={presentationsCardFieldIds}
          presentationOfferMap={presentationOfferMap}
          avatarsCardFieldIds={avatarsCardFieldIds}
          avatarOfferMap={avatarOfferMap}
          adCardFieldIds={adCardFieldIds}
          formCardFieldIds={formCardFieldIds}
          formAggregatesMap={formAggregatesMap}
        />
      </button>
    </motion.div>
  )
}
