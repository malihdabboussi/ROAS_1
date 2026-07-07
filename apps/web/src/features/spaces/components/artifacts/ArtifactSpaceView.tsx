'use client'

import { useSearchParams } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { LayoutGroup } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { funnelStatusGlassClass } from '@/components/artifacts'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { normalizeAdCardFieldOrder } from '@/features/spaces/lib/ad-card-fields'
import { normalizeAvatarCardFieldOrder } from '@/features/spaces/lib/avatar-card-fields'
import { normalizeFormCardFieldOrder } from '@/features/spaces/lib/form-card-fields'
import { normalizeFunnelCardFieldOrder } from '@/features/spaces/lib/funnel-card-fields'
import { normalizePresentationCardFieldOrder } from '@/features/spaces/lib/presentation-card-fields'
import { normalizeSequenceCardFieldOrder } from '@/features/spaces/lib/sequence-card-fields'
import { normalizeSocialPostCardFieldOrder } from '@/features/spaces/lib/social-post-card-fields'
import { cn } from '@/lib/utils/cn'
import { ARTIFACT_KIND_LABELS } from '../../lib/all-artifacts'
import type { ArtifactViewBaseConfig, ArtifactViewType } from '../../types/space-schema'
import { ArtifactCard } from './ArtifactCard'
import {
  artifactMatchesSearch,
  artifactMatchesTimeRange,
  groupArtifactRows,
  sortArtifactRows,
  type ArtifactListRow,
} from './artifact-display'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import { ArtifactDeepView } from './ArtifactDeepView'
import { ArtifactTypeGroupHeader } from './ArtifactTypeGroupHeader'
import { socialPostStatusGlassClass } from './social-post-status-glass'
import { ARTIFACT_QUERY_KEY, useArtifactDetailQuery } from './use-artifact-detail-query'

interface ArtifactSpaceViewProps {
  campaignId: string
  rows: ArtifactListRow[]
  loading: boolean
  error?: string | null
  config: ArtifactViewBaseConfig
  emptyTitle: string
  emptyDescription: string
  /** Optional decorative mockup rendered above the empty-state title (e.g. tilted card preview). */
  emptyMockup?: ReactNode
  previewType: ArtifactPreviewSelection['type']
  timeField?: 'created_at' | 'updated_at' | 'scheduled_at'
  /** Lifted preview-panel selection (host renders the panel as a flex sibling at SpaceItemsContainer level). */
  selection: ArtifactPreviewSelection | null
  onSelectionChange: (next: ArtifactPreviewSelection | null) => void
  onDetailChange?: (open: boolean) => void
  onArtifactDeepMetaChange?: (meta: { id: string; title: string } | null) => void
  /** Merged into funnel/blog/presentation preview toolbars in deep-work mode (e.g. Save view). */
  artifactDeepToolbarExtras?: ReactNode
  /** Refresh artifact rows after destructive menu actions (e.g. Spaces offer menu). */
  onArtifactListMutated?: () => void
  /** Social Posts grid cards: meta rows below title (`social_posts_config.social_post_card_fields`). */
  socialPostsCardFieldIds?: string[] | null
  /** Funnels grid cards: meta rows below title (`funnels_config.funnel_card_fields`). */
  funnelsCardFieldIds?: string[] | null
  /** Sequences grid cards: meta rows below title (`sequences_config.sequence_card_fields`). */
  sequencesCardFieldIds?: string[] | null
  /** Presentations grid cards: meta rows below title (`presentations_config.presentation_card_fields`). */
  presentationsCardFieldIds?: string[] | null
  /** Avatars grid cards: meta rows below header (`avatars_config.avatar_card_fields`). */
  avatarsCardFieldIds?: string[] | null
  /** Ads grid cards: meta rows below title (`ads_config.ad_card_fields`). */
  adsCardFieldIds?: string[] | null
  /** Forms grid cards: meta rows below title (`forms_config.form_card_fields`). */
  formsCardFieldIds?: string[] | null
  /** Map of offerId → offer name (for avatar cards). */
  avatarOfferMap?: Map<string, string>
  /** Map of offerId → offer name (for presentation cards). */
  presentationOfferMap?: Map<string, string>
  /** Map of sequenceId → connected funnel name (from workflow graph). */
  sequenceFunnelMap?: Map<string, string>
  /** Map of formId → { responses_count, last_response_at, target_space_name } (for form cards). */
  formAggregatesMap?: Map<
    string,
    {
      responses_count: number
      last_response_at: string | null
      target_space_name: string | null
    }
  >
  /** Unified All Artifacts view: each row carries its own preview kind. */
  mixedArtifactKinds?: boolean
}

export function ArtifactSpaceView({
  campaignId,
  rows,
  loading,
  error,
  config,
  emptyTitle,
  emptyDescription,
  emptyMockup,
  previewType,
  timeField = 'created_at',
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  onArtifactListMutated,
  socialPostsCardFieldIds,
  funnelsCardFieldIds,
  sequencesCardFieldIds,
  sequenceFunnelMap,
  presentationsCardFieldIds,
  presentationOfferMap,
  avatarsCardFieldIds,
  avatarOfferMap,
  adsCardFieldIds,
  formsCardFieldIds,
  formAggregatesMap,
  mixedArtifactKinds = false,
}: ArtifactSpaceViewProps) {
  const resolveRowPreviewType = (row: ArtifactListRow): ArtifactPreviewSelection['type'] =>
    (mixedArtifactKinds ? row.previewKind : undefined) ?? previewType

  const { artifactId, setArtifactQuery } = useArtifactDetailQuery()
  const searchParams = useSearchParams()
  const prevCampaignIdRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevCampaignIdRef.current
    prevCampaignIdRef.current = campaignId
    if (prev !== null && prev !== campaignId && searchParams.get(ARTIFACT_QUERY_KEY)) {
      setArtifactQuery(null)
    }
  }, [campaignId, searchParams, setArtifactQuery])

  useEffect(() => {
    if (!artifactId) {
      onDetailChange?.(false)
      onArtifactDeepMetaChange?.(null)
      return
    }
    onDetailChange?.(true)
    const row = rows.find((r) => r.id === artifactId)
    onArtifactDeepMetaChange?.({ id: artifactId, title: row?.title ?? 'Artifact' })
  }, [artifactId, rows, onDetailChange, onArtifactDeepMetaChange])

  const displayRows = useMemo(() => {
    const filtered = rows.filter(
      (row) =>
        artifactMatchesSearch(row, config.search_query) &&
        artifactMatchesTimeRange(row, config, timeField),
    )
    return sortArtifactRows(filtered, config)
  }, [config, rows, timeField])

  const groups = useMemo(
    () => groupArtifactRows(displayRows, config.group_by, config.group_sort ?? 'asc'),
    [displayRows, config.group_by, config.group_sort],
  )

  const socialMetaFieldIds = useMemo(
    () =>
      mixedArtifactKinds || previewType === 'social_post'
        ? normalizeSocialPostCardFieldOrder(socialPostsCardFieldIds ?? undefined)
        : [],
    [mixedArtifactKinds, previewType, socialPostsCardFieldIds],
  )

  const funnelMetaFieldIds = useMemo(
    () =>
      mixedArtifactKinds || previewType === 'funnel'
        ? normalizeFunnelCardFieldOrder(funnelsCardFieldIds ?? undefined)
        : [],
    [mixedArtifactKinds, previewType, funnelsCardFieldIds],
  )

  const sequenceMetaFieldIds = useMemo(
    () =>
      mixedArtifactKinds || previewType === 'sequence'
        ? normalizeSequenceCardFieldOrder(sequencesCardFieldIds ?? undefined)
        : [],
    [mixedArtifactKinds, previewType, sequencesCardFieldIds],
  )

  const presentationMetaFieldIds = useMemo(
    () =>
      mixedArtifactKinds || previewType === 'presentation'
        ? normalizePresentationCardFieldOrder(presentationsCardFieldIds ?? undefined)
        : [],
    [mixedArtifactKinds, previewType, presentationsCardFieldIds],
  )

  const avatarMetaFieldIds = useMemo(
    () =>
      mixedArtifactKinds || previewType === 'avatar'
        ? normalizeAvatarCardFieldOrder(avatarsCardFieldIds ?? undefined)
        : [],
    [mixedArtifactKinds, previewType, avatarsCardFieldIds],
  )

  const adMetaFieldIds = useMemo(
    () =>
      mixedArtifactKinds || previewType === 'ad'
        ? normalizeAdCardFieldOrder(adsCardFieldIds ?? undefined)
        : [],
    [mixedArtifactKinds, previewType, adsCardFieldIds],
  )

  const formMetaFieldIds = useMemo(
    () =>
      mixedArtifactKinds || previewType === 'form'
        ? normalizeFormCardFieldOrder(formsCardFieldIds ?? undefined)
        : [],
    [mixedArtifactKinds, previewType, formsCardFieldIds],
  )

  const openRow = (row: ArtifactListRow) => {
    const rowPreviewType = resolveRowPreviewType(row)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('space:artifact-focus', {
          detail: { type: rowPreviewType, id: row.id, name: row.title },
        }),
      )
    }
    onSelectionChange({
      type: rowPreviewType,
      id: row.id,
      title: row.title,
    } as ArtifactPreviewSelection)
  }

  const openRowFull = (row: ArtifactListRow, e: MouseEvent) => {
    const rowPreviewType = resolveRowPreviewType(row)
    e.stopPropagation()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('space:artifact-focus', {
          detail: { type: rowPreviewType, id: row.id, name: row.title },
        }),
      )
    }
    setArtifactQuery(row.id)
    onSelectionChange(null)
  }

  const deepSelection = useMemo((): ArtifactPreviewSelection | null => {
    if (!artifactId) return null
    const row = rows.find((r) => r.id === artifactId)
    return {
      type: row ? resolveRowPreviewType(row) : previewType,
      id: artifactId,
      title: row?.title ?? 'Artifact',
    } as ArtifactPreviewSelection
  }, [artifactId, previewType, rows, mixedArtifactKinds])

  if (artifactId && deepSelection) {
    return (
      <ArtifactDeepView
        campaignId={campaignId}
        selection={deepSelection}
        onResourceDeleted={() => {
          setArtifactQuery(null)
        }}
        toolbarExtras={artifactDeepToolbarExtras}
      />
    )
  }

  if (loading) {
    return (
      <div className="py-spacing-12 flex flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading…" state="processing" size="lg" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center">
        {error}
      </div>
    )
  }
  if (displayRows.length === 0) {
    if (emptyMockup) {
      return (
        <div className="p-spacing-8 flex flex-1 items-center justify-center">
          <div className="gap-spacing-6 flex flex-col items-center text-center">
            {emptyMockup}
            <div className="space-y-spacing-1">
              <p className="title-h6 text-foreground">{emptyTitle}</p>
              <p className="body-3 text-muted-foreground max-w-xs">{emptyDescription}</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="card-glass max-w-sm rounded-xl p-8">
          <p className="body-2 text-foreground font-semibold">{emptyTitle}</p>
          <p className="body-3 text-muted-foreground mt-2">{emptyDescription}</p>
        </div>
      </div>
    )
  }

  const selectedId = selection?.id ?? null

  const renderRows = (nextRows: ArtifactListRow[]) => (
    <LayoutGroup>
      <div className="grid-artifact-cards">
        {nextRows.map((row) => (
          <ArtifactCard
            key={row.id}
            row={row}
            selected={row.id === selectedId}
            onOpen={openRow}
            onOpenFull={openRowFull}
            previewType={resolveRowPreviewType(row)}
            onArtifactListMutated={onArtifactListMutated}
            socialPostCardFieldIds={socialMetaFieldIds}
            funnelCardFieldIds={funnelMetaFieldIds}
            sequenceCardFieldIds={sequenceMetaFieldIds}
            sequenceFunnelMap={sequenceFunnelMap}
            presentationsCardFieldIds={presentationMetaFieldIds}
            presentationOfferMap={presentationOfferMap}
            avatarsCardFieldIds={avatarMetaFieldIds}
            avatarOfferMap={avatarOfferMap}
            adCardFieldIds={adMetaFieldIds}
            formCardFieldIds={formMetaFieldIds}
            formAggregatesMap={formAggregatesMap}
            parentCampaignId={campaignId}
          />
        ))}
      </div>
    </LayoutGroup>
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4">
      {groups ? (
        <div className="gap-spacing-10 flex flex-col">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="group/header mb-2 flex items-center gap-2">
                <ChevronRight className="h-3 w-3 rotate-90 text-[var(--color-muted-foreground)]" />
                {config.group_by === 'artifact_type' &&
                ARTIFACT_KIND_LABELS[group.key as ArtifactViewType] ? (
                  <ArtifactTypeGroupHeader viewType={group.key as ArtifactViewType} />
                ) : (
                  <span
                    className={cn(
                      'rounded-spacing-2 inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
                      previewType === 'funnel' && config.group_by === 'status'
                        ? funnelStatusGlassClass(group.key)
                        : previewType === 'social_post' && config.group_by === 'status'
                          ? socialPostStatusGlassClass(group.key)
                          : 'badge-glass-muted',
                    )}
                  >
                    {config.group_by === 'artifact_type'
                      ? (ARTIFACT_KIND_LABELS[group.key as ArtifactViewType] ?? group.label)
                      : group.label}
                  </span>
                )}
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {group.rows.length}
                </span>
              </div>
              {renderRows(group.rows)}
            </div>
          ))}
        </div>
      ) : (
        renderRows(displayRows)
      )}
    </div>
  )
}
