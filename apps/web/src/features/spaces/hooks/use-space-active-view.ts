import { useEffect, useMemo } from 'react'
import { useAccountContextGate, useOrgStore } from '@/lib/org/org-context-store'
import { artifactGroupableFields } from '../lib/artifact-view-config'
import { normalizeSpaceSchema } from '../lib/normalize-space-schema'
import {
  consolidatePaidAdsViews,
  resolveConsolidatedPaidAdsView,
} from '../lib/paid-ads-display-mode'
import {
  isEditorGatedViewType,
  mergeViewCustomizationLayers,
} from '../lib/view-customization-merge'
import type { Space } from '../types'
import {
  ARTIFACT_VIEW_TYPES,
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  isSpaceFieldVisibleInUi,
  type FieldDef,
  type SpaceSchema,
  type ViewDef,
} from '../types/space-schema'

const GROUPABLE_TYPES = new Set([
  'select',
  'multi_select',
  'assignee',
  'date',
  'created_at',
  'updated_at',
])

function isChannelViewType(type: ViewDef['type']): boolean {
  return type === 'channels' || type === 'channel'
}

export function useSpaceActiveView(opts: {
  activeSpace: Space | null
  activeViewId: string | null
  customizeSubjectViewId: string | null
  viewOverrides: Record<string, Partial<ViewDef>>
  sessionViewDrafts: Record<string, Partial<ViewDef>>
  setActiveView: (id: string | null) => void
}) {
  const {
    activeSpace,
    activeViewId,
    customizeSubjectViewId,
    viewOverrides,
    sessionViewDrafts,
    setActiveView,
  } = opts

  const { isOrgContext, hasMinRole } = useOrgStore()
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()
  const canShowChannelViews = isAccountContextReady && !isPersonalAccountContext

  const activeSchema = useMemo<SpaceSchema | undefined>(() => {
    const raw = activeSpace?.schema
    if (!raw) return undefined
    return normalizeSpaceSchema(raw)
  }, [activeSpace?.schema])

  const isTeamSpace = activeSpace?.visibility === 'team' && isOrgContext()
  const canSaveForEveryone = isTeamSpace && hasMinRole('admin')
  const canAccessEditorViews = !isOrgContext() || hasMinRole('editor')
  const activeShareAllowedViewIds = activeSpace?.share_meta?.allowed_view_ids ?? null
  const isShareOnlySpace = Boolean(activeSpace?.share_meta)
  const canCustomizeViews = !isShareOnlySpace && canAccessEditorViews

  const activeView = useMemo(() => {
    if (!activeSchema) return null
    const allowedViews = activeShareAllowedViewIds
      ? activeSchema.views.filter((view) => activeShareAllowedViewIds.includes(view.id))
      : activeSchema.views
    const contextViews = allowedViews.filter(
      (view) => canShowChannelViews || !isChannelViewType(view.type),
    )
    const contextAllowedViews = consolidatePaidAdsViews(contextViews)
    if (!contextAllowedViews.length) return null
    const requestedLegacyResearch = contextViews.find(
      (view) => view.id === activeViewId && view.type === 'ads_research',
    )
    const orgView =
      resolveConsolidatedPaidAdsView(contextViews, activeViewId) ?? contextAllowedViews[0]!
    const merged = mergeViewCustomizationLayers(orgView, {
      isTeamSpace,
      overrideLayer: viewOverrides[orgView.id],
      draftLayer: sessionViewDrafts[orgView.id],
    })
    return requestedLegacyResearch
      ? {
          ...merged,
          ads_config: {
            ...(merged.ads_config ?? {}),
            paid_ads_workspace_mode: 'research',
          },
        }
      : merged
  }, [
    activeSchema,
    activeViewId,
    activeShareAllowedViewIds,
    canShowChannelViews,
    isTeamSpace,
    viewOverrides,
    sessionViewDrafts,
  ])

  const customizePanelTargetView = useMemo(() => {
    if (!activeSchema) return null
    const allowedViews = activeShareAllowedViewIds
      ? activeSchema.views.filter((view) => activeShareAllowedViewIds.includes(view.id))
      : activeSchema.views
    const contextViews = allowedViews.filter(
      (view) => canShowChannelViews || !isChannelViewType(view.type),
    )
    const contextAllowedViews = consolidatePaidAdsViews(contextViews)
    if (!contextAllowedViews.length) return null
    const effectiveId = customizeSubjectViewId ?? activeViewId
    const orgView =
      resolveConsolidatedPaidAdsView(contextViews, effectiveId) ?? contextAllowedViews[0]!
    return mergeViewCustomizationLayers(orgView, {
      isTeamSpace,
      overrideLayer: viewOverrides[orgView.id],
      draftLayer: sessionViewDrafts[orgView.id],
    })
  }, [
    activeSchema,
    activeViewId,
    activeShareAllowedViewIds,
    customizeSubjectViewId,
    canShowChannelViews,
    isTeamSpace,
    sessionViewDrafts,
    viewOverrides,
  ])

  const visibleViews = useMemo(() => {
    if (!activeSchema?.views) return []
    return consolidatePaidAdsViews(
      activeSchema.views
        .filter((view) => {
          if (activeShareAllowedViewIds && !activeShareAllowedViewIds.includes(view.id))
            return false
          if (!canShowChannelViews && isChannelViewType(view.type)) return false
          return canAccessEditorViews || !isEditorGatedViewType(view.type)
        })
        .map((orgView) =>
          mergeViewCustomizationLayers(orgView, {
            isTeamSpace,
            overrideLayer: viewOverrides[orgView.id],
            draftLayer: sessionViewDrafts[orgView.id],
          }),
        ),
    )
  }, [
    activeSchema?.views,
    activeShareAllowedViewIds,
    canAccessEditorViews,
    canShowChannelViews,
    isTeamSpace,
    sessionViewDrafts,
    viewOverrides,
  ])

  useEffect(() => {
    if (!activeView || canAccessEditorViews) return
    if (!isEditorGatedViewType(activeView.type)) return
    const firstAllowed = visibleViews.find((view) => !isEditorGatedViewType(view.type))
    if (firstAllowed && firstAllowed.id !== activeView.id) {
      setActiveView(firstAllowed.id)
    }
  }, [activeView, canAccessEditorViews, setActiveView, visibleViews])

  const fieldsById = useMemo(
    () => new Map((activeSchema?.fields ?? []).map((field) => [field.id, field])),
    [activeSchema?.fields],
  )

  const fieldsForUi = useMemo(
    () => (activeSchema?.fields ?? []).filter(isSpaceFieldVisibleInUi),
    [activeSchema?.fields],
  )

  const visibleFields = useMemo<FieldDef[]>(() => {
    if (!activeView || !activeSchema) return []
    const ids = activeView.visible_fields ?? [...DEFAULT_TASK_VISIBLE_FIELD_IDS]
    return ids
      .map((id) => fieldsById.get(id))
      .filter((field): field is FieldDef => Boolean(field))
      .filter(isSpaceFieldVisibleInUi)
  }, [activeView, activeSchema, fieldsById])

  const isDocsViewEarly = activeView?.type === 'docs'
  const isArtifactViewEarly =
    activeView?.type === 'all_artifacts' ||
    (activeView ? ARTIFACT_VIEW_TYPES.has(activeView.type) : false)

  const groupableFields = useMemo(() => {
    if (isArtifactViewEarly) return artifactGroupableFields(activeView?.type)
    const base = fieldsForUi.filter((f) => GROUPABLE_TYPES.has(f.type) && f.id !== 'title')
    if (isDocsViewEarly) {
      const sourceField: FieldDef = {
        id: '_doc_source',
        name: 'Source',
        type: 'select',
        options: [
          { id: 'space', label: 'Space', color: 'emerald' },
          { id: 'studio', label: 'Studio', color: 'blue' },
          { id: 'channel', label: 'Channels', color: 'cyan' },
          { id: 'dm', label: 'DMs', color: 'indigo' },
          { id: 'mission', label: 'Mission', color: 'violet' },
          { id: 'campaign', label: 'Campaign docs', color: 'blue' },
          { id: 'drive', label: 'Drive', color: 'amber' },
        ],
      }
      return [sourceField, ...base]
    }
    return base
  }, [activeView?.type, fieldsForUi, isDocsViewEarly, isArtifactViewEarly])

  const groupByField = useMemo(
    () =>
      activeView?.group_by ? groupableFields.find((f) => f.id === activeView.group_by) : undefined,
    [activeView?.group_by, groupableFields],
  )

  return {
    activeSchema,
    activeView,
    customizePanelTargetView,
    visibleViews,
    fieldsById,
    fieldsForUi,
    visibleFields,
    groupableFields,
    groupByField,
    isTeamSpace,
    canSaveForEveryone,
    canAccessEditorViews,
    activeShareAllowedViewIds,
    isShareOnlySpace,
    canCustomizeViews,
    isDocsViewEarly,
    isArtifactViewEarly,
  }
}
