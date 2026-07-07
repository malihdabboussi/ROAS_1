'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getIconColor } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'
import {
  ARTIFACT_VIEW_TYPES,
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  isSpaceFieldVisibleInUi,
  REPORTING_VIEW_TYPES,
  type SocialPlatform,
} from '../../types/space-schema'
import { ReportingCustomizePanel } from '../reporting/ReportingCustomizePanel'
import {
  VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD,
  VIBEY_SPACE_FLOATING_CONTROL,
} from '@/lib/ui/floating-control-attrs'
import { getViewTypeTabMeta } from '../view-type-tab-meta'
import type { CustomizeViewPanelProps } from './customize-view-panel.types'
import { AllArtifactsMainView } from './views/all-artifacts/AllArtifactsMainView'
import { AllSocialResearchPeopleSubView } from './views/all-social-research/AllSocialResearchPeopleSubView'
import { ArtifactsMainView } from './views/artifacts/ArtifactsMainView'
import {
  AdsCardFieldsSubView,
  AvatarsCardFieldsSubView,
  FormsCardFieldsSubView,
  FunnelsCardFieldsSubView,
  PresentationsCardFieldsSubView,
  SequencesCardFieldsSubView,
  SocialPostsCardFieldsSubView,
} from './views/artifacts/CardFieldsSubViews'
import { ChannelsMainView } from './views/channels/ChannelsMainView'
import { ContactsFieldsSubView } from './views/contacts/ContactsFieldsSubView'
import { ContactsMainView } from './views/contacts/ContactsMainView'
import {
  DefaultFieldsSubView as FieldsSubView,
  DefaultMainView as MainView,
} from './views/default/DefaultViews'
import { IgFieldsSubView } from './views/instagram/IgFieldsSubView'
import { IgFormatSubView } from './views/instagram/IgFormatSubView'
import { IgPeopleSubView } from './views/instagram/IgPeopleSubView'
import { IgResearchDateRangeSubView } from './views/instagram/IgResearchDateRangeSubView'
import { IgResearchMainView } from './views/instagram/IgResearchMainView'
import { MissionsFieldsSubView, MissionsMainView } from './views/missions/MissionsViews'

const CUSTOMIZE_PANEL_WIDTH_PX = 320

function clampDropdownBelowAnchor(anchorEl: HTMLElement): CSSProperties {
  if (typeof window === 'undefined') {
    return {
      position: 'fixed',
      left: 0,
      top: 0,
      width: CUSTOMIZE_PANEL_WIDTH_PX,
      maxHeight: '85vh',
      zIndex: 50,
    }
  }
  const PAD = 8
  const GAP = 4
  const r = anchorEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = r.left
  if (left + CUSTOMIZE_PANEL_WIDTH_PX > vw - PAD) {
    left = vw - PAD - CUSTOMIZE_PANEL_WIDTH_PX
  }
  left = Math.max(PAD, left)
  const top = r.bottom + GAP
  const maxH = Math.max(PAD * 3, Math.min(vh * 0.85, vh - top - PAD))
  return {
    position: 'fixed',
    left,
    top,
    width: CUSTOMIZE_PANEL_WIDTH_PX,
    maxHeight: maxH,
    zIndex: 50,
  }
}

export function CustomizeViewPanelContainer({
  open,
  stageBounds = null,
  onClose,
  schema,
  activeView,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  initialSubView = 'main',
  onAddAccount,
  onSyncAccount,
  onRemoveAccount,
  onAddAllSocialAccount,
  onSyncAllSocialAccount,
  onRemoveAllSocialAccount,
  reportingCampaignId = null,
  artifactCampaignId = null,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onOpenSharingPermissions,
  onOpenStatusEditor,
  dropdownAnchorRef = null,
}: CustomizeViewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [dropdownPosTick, setDropdownPosTick] = useState(0)
  const [nameDraft, setNameDraft] = useState(activeView.name)
  const [subView, setSubView] = useState<
    'main' | 'fields' | 'people' | 'ig_date_range' | 'ig_format'
  >('main')

  const isMedia = activeView.type === 'media'

  useEffect(() => {
    setNameDraft(activeView.name)
  }, [activeView.name])
  useEffect(() => {
    if (!open) {
      setSubView('main')
      return
    }
    if (
      activeView.type !== 'instagram_research' &&
      activeView.type !== 'tiktok_research' &&
      activeView.type !== 'youtube_research' &&
      activeView.type !== 'twitter_research' &&
      activeView.type !== 'all_social_research'
    ) {
      setSubView(initialSubView === 'fields' && activeView.type !== 'media' ? 'fields' : 'main')
      return
    }
    if (initialSubView === 'ig_format') setSubView('ig_format')
    else if (initialSubView === 'people') setSubView('people')
    else if (initialSubView === 'fields') setSubView('fields')
    else setSubView('main')
  }, [open, initialSubView, activeView.type])

  useEffect(() => {
    if (!(open && isMedia && subView === 'fields')) return
    setSubView('main')
  }, [open, isMedia, subView])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onPointerDownCapture = (e: PointerEvent) => {
      const panel = panelRef.current
      if (!panel) return
      const path = e.composedPath()
      const inside = path.some((n) => {
        if (n === panel) return true
        if (n instanceof Element && n.closest(`[${VIBEY_SPACE_FLOATING_CONTROL}]`)) return true
        if (n instanceof Element && n.closest(`[${VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD}]`))
          return true
        if (n instanceof Element && n.closest('[data-icon-picker-popup]')) return true
        if (n instanceof Node) return panel.contains(n)
        return false
      })
      if (inside) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [open, onClose])

  useEffect(() => {
    if (!(open && dropdownAnchorRef?.current)) return
    const bump = () => setDropdownPosTick((t) => t + 1)
    bump()
    window.addEventListener('scroll', bump, true)
    window.addEventListener('resize', bump)
    return () => {
      window.removeEventListener('scroll', bump, true)
      window.removeEventListener('resize', bump)
    }
  }, [open, dropdownAnchorRef, activeView?.id])

  const viewIconName = activeView.icon ?? getViewTypeTabMeta(activeView.type).defaultIcon
  const viewIconColor = getIconColor(activeView.icon_color)

  const uiFields = useMemo(() => schema.fields.filter(isSpaceFieldVisibleInUi), [schema.fields])

  const visibleSet = useMemo(
    () => new Set(activeView.visible_fields ?? [...DEFAULT_TASK_VISIBLE_FIELD_IDS]),
    [activeView.visible_fields],
  )

  const shownFields = useMemo(
    () => uiFields.filter((f) => visibleSet.has(f.id)),
    [uiFields, visibleSet],
  )

  const GROUPABLE_TYPES = useMemo(
    () => new Set(['select', 'multi_select', 'assignee', 'date', 'created_at', 'updated_at']),
    [],
  )
  const groupableFields = useMemo(
    () => uiFields.filter((f) => GROUPABLE_TYPES.has(f.type) && f.id !== 'title'),
    [uiFields, GROUPABLE_TYPES],
  )
  const groupByField = useMemo(
    () => (activeView.group_by ? uiFields.find((f) => f.id === activeView.group_by) : undefined),
    [activeView.group_by, uiFields],
  )

  const isMissions = activeView.type === 'missions'
  const isIgResearch = activeView.type === 'instagram_research'
  const isTiktokResearch = activeView.type === 'tiktok_research'
  const isYoutubeResearch = activeView.type === 'youtube_research'
  const isTwitterResearch = activeView.type === 'twitter_research'
  const isAllSocialResearch = activeView.type === 'all_social_research'
  const isAllArtifacts = activeView.type === 'all_artifacts'
  const isSocialResearch =
    isIgResearch ||
    isTiktokResearch ||
    isYoutubeResearch ||
    isTwitterResearch ||
    isAllSocialResearch
  const socialPlatform: SocialPlatform = isTiktokResearch
    ? 'tiktok'
    : isYoutubeResearch
      ? 'youtube'
      : isTwitterResearch
        ? 'twitter'
        : 'instagram'
  const isContacts = activeView.type === 'contacts'
  const isChannels = activeView.type === 'channels' || activeView.type === 'channel'
  const isReporting = REPORTING_VIEW_TYPES.has(activeView.type)
  const isArtifact = ARTIFACT_VIEW_TYPES.has(activeView.type) || isAllArtifacts

  const dropdownAnchorEl = dropdownAnchorRef?.current ?? null
  const isDropdown = Boolean(open && dropdownAnchorEl)
  void dropdownPosTick
  const dropdownStyle = open && dropdownAnchorEl ? clampDropdownBelowAnchor(dropdownAnchorEl) : null

  const panelSurfaceClass = cn(
    'pointer-events-auto flex w-[320px] flex-col overflow-hidden border border-[var(--border)] bg-[var(--background)]',
    isDropdown ? 'min-h-0 max-h-full rounded-2xl shadow-lg' : 'rounded-l-2xl border-r-0',
    !isDropdown && (stageBounds ? 'h-full min-h-0 max-h-full' : 'my-3'),
  )

  const subViewTree = (
    <AnimatePresence mode="wait">
      {isSocialResearch ? (
        subView === 'people' ? (
          isAllSocialResearch ? (
            <AllSocialResearchPeopleSubView
              key="all-social-people"
              activeView={activeView}
              activeSchema={schema}
              onViewPatch={onViewPatch}
              onBack={() => setSubView('main')}
              onClose={onClose}
              onAddAccount={onAddAllSocialAccount}
              onSyncAccount={onSyncAllSocialAccount}
              onRemoveAccount={onRemoveAllSocialAccount}
            />
          ) : (
            <IgPeopleSubView
              key="ig-people"
              activeView={activeView}
              platform={socialPlatform}
              onViewPatch={onViewPatch}
              onBack={() => setSubView('main')}
              onClose={onClose}
              onAddAccount={onAddAccount}
              onSyncAccount={onSyncAccount}
              onRemoveAccount={onRemoveAccount}
            />
          )
        ) : subView === 'fields' ? (
          <IgFieldsSubView
            key="ig-fields"
            activeView={activeView}
            platform={socialPlatform}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : subView === 'ig_format' ? (
          <IgFormatSubView
            key="ig-format"
            activeView={activeView}
            platform={socialPlatform}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : subView === 'ig_date_range' ? (
          <IgResearchDateRangeSubView
            key="ig-dates"
            activeView={activeView}
            platform={socialPlatform}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : (
          <IgResearchMainView
            key="ig-main"
            activeView={activeView}
            platform={socialPlatform}
            viewIconName={viewIconName}
            viewIconColor={viewIconColor}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onViewPatch={onViewPatch}
            onViewPinToStart={onViewPinToStart}
            canDeleteView={canDeleteView}
            onDeleteView={onDeleteView}
            onClose={onClose}
            settingsPanelOpen={open}
            onAddAccount={onAddAccount}
            onOpenFields={() => setSubView('fields')}
            onOpenFormat={() => setSubView('ig_format')}
            onOpenDateRange={() => setSubView('ig_date_range')}
            onOpenPeople={() => setSubView('people')}
            isTeamSpace={isTeamSpace}
            canSaveForEveryone={canSaveForEveryone}
            hasViewOverride={hasViewOverride}
            onSaveForEveryone={onSaveForEveryone}
            onResetToDefault={onResetToDefault}
            onOpenSharingPermissions={onOpenSharingPermissions}
            activeSchema={isAllSocialResearch ? schema : undefined}
          />
        )
      ) : isMissions ? (
        subView === 'fields' ? (
          <MissionsFieldsSubView
            key="m-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : (
          <MissionsMainView
            key="m-main"
            activeView={activeView}
            viewIconName={viewIconName}
            viewIconColor={viewIconColor}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onViewPatch={onViewPatch}
            onViewPinToStart={onViewPinToStart}
            canDeleteView={canDeleteView}
            onDeleteView={onDeleteView}
            onClose={onClose}
            onOpenFields={() => setSubView('fields')}
            isTeamSpace={isTeamSpace}
            canSaveForEveryone={canSaveForEveryone}
            hasViewOverride={hasViewOverride}
            onSaveForEveryone={onSaveForEveryone}
            onResetToDefault={onResetToDefault}
            onOpenSharingPermissions={onOpenSharingPermissions}
          />
        )
      ) : isContacts ? (
        subView === 'fields' ? (
          <ContactsFieldsSubView
            key="contacts-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : (
          <ContactsMainView
            key="contacts-main"
            activeView={activeView}
            viewIconName={viewIconName}
            viewIconColor={viewIconColor}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onViewPatch={onViewPatch}
            onViewPinToStart={onViewPinToStart}
            canDeleteView={canDeleteView}
            onDeleteView={onDeleteView}
            onClose={onClose}
            onOpenFields={() => setSubView('fields')}
            isTeamSpace={isTeamSpace}
            canSaveForEveryone={canSaveForEveryone}
            hasViewOverride={hasViewOverride}
            onSaveForEveryone={onSaveForEveryone}
            onResetToDefault={onResetToDefault}
            onOpenSharingPermissions={onOpenSharingPermissions}
          />
        )
      ) : isChannels ? (
        <ChannelsMainView
          key="channels-main"
          activeView={activeView}
          viewIconName={viewIconName}
          viewIconColor={viewIconColor}
          nameDraft={nameDraft}
          setNameDraft={setNameDraft}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          onClose={onClose}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onOpenSharingPermissions={onOpenSharingPermissions}
        />
      ) : isArtifact ? (
        activeView.type === 'ads' && subView === 'fields' ? (
          <AdsCardFieldsSubView
            key="ads-card-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : activeView.type === 'social_posts' && subView === 'fields' ? (
          <SocialPostsCardFieldsSubView
            key="social-posts-card-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : activeView.type === 'funnels' && subView === 'fields' ? (
          <FunnelsCardFieldsSubView
            key="funnels-card-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : activeView.type === 'sequences' && subView === 'fields' ? (
          <SequencesCardFieldsSubView
            key="sequences-card-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : activeView.type === 'presentations' && subView === 'fields' ? (
          <PresentationsCardFieldsSubView
            key="presentations-card-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : activeView.type === 'avatars' && subView === 'fields' ? (
          <AvatarsCardFieldsSubView
            key="avatars-card-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : activeView.type === 'forms' && subView === 'fields' ? (
          <FormsCardFieldsSubView
            key="forms-card-fields"
            activeView={activeView}
            onViewPatch={onViewPatch}
            onBack={() => setSubView('main')}
            onClose={onClose}
          />
        ) : isAllArtifacts ? (
          <AllArtifactsMainView
            key="all-artifacts-main"
            activeView={activeView}
            viewIconName={viewIconName}
            viewIconColor={viewIconColor}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onViewPatch={onViewPatch}
            onViewPinToStart={onViewPinToStart}
            canDeleteView={canDeleteView}
            onDeleteView={onDeleteView}
            onClose={onClose}
            isTeamSpace={isTeamSpace}
            canSaveForEveryone={canSaveForEveryone}
            hasViewOverride={hasViewOverride}
            onSaveForEveryone={onSaveForEveryone}
            onResetToDefault={onResetToDefault}
            onOpenSharingPermissions={onOpenSharingPermissions}
          />
        ) : (
          <ArtifactsMainView
            key="artifacts-main"
            activeView={activeView}
            viewIconName={viewIconName}
            viewIconColor={viewIconColor}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onViewPatch={onViewPatch}
            onViewPinToStart={onViewPinToStart}
            canDeleteView={canDeleteView}
            onDeleteView={onDeleteView}
            onClose={onClose}
            isTeamSpace={isTeamSpace}
            canSaveForEveryone={canSaveForEveryone}
            hasViewOverride={hasViewOverride}
            onSaveForEveryone={onSaveForEveryone}
            onResetToDefault={onResetToDefault}
            onOpenSharingPermissions={onOpenSharingPermissions}
            artifactCampaignId={artifactCampaignId}
            onOpenAdsCardFields={activeView.type === 'ads' ? () => setSubView('fields') : undefined}
            onOpenSocialPostsCardFields={
              activeView.type === 'social_posts' ? () => setSubView('fields') : undefined
            }
            onOpenFunnelsCardFields={
              activeView.type === 'funnels' ? () => setSubView('fields') : undefined
            }
            onOpenSequencesCardFields={
              activeView.type === 'sequences' ? () => setSubView('fields') : undefined
            }
            onOpenPresentationsCardFields={
              activeView.type === 'presentations' ? () => setSubView('fields') : undefined
            }
            onOpenAvatarsCardFields={
              activeView.type === 'avatars' ? () => setSubView('fields') : undefined
            }
            onOpenFormsCardFields={
              activeView.type === 'forms' ? () => setSubView('fields') : undefined
            }
          />
        )
      ) : isReporting ? (
        <ReportingCustomizePanel
          key="reporting-main"
          activeView={activeView}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          onClose={onClose}
          campaignId={reportingCampaignId}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onOpenSharingPermissions={onOpenSharingPermissions}
        />
      ) : subView === 'fields' && !isMedia ? (
        <FieldsSubView
          key="fields"
          schema={schema}
          activeView={activeView}
          onViewPatch={onViewPatch}
          onBack={() => setSubView('main')}
          onClose={onClose}
        />
      ) : (
        <MainView
          key="main"
          activeView={activeView}
          viewIconName={viewIconName}
          viewIconColor={viewIconColor}
          nameDraft={nameDraft}
          setNameDraft={setNameDraft}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          onClose={onClose}
          shownFields={shownFields}
          hideFieldsSection={isMedia}
          onOpenFields={() => setSubView('fields')}
          groupByField={groupByField}
          groupableFields={groupableFields}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onOpenSharingPermissions={onOpenSharingPermissions}
          onOpenStatusEditor={isMedia ? undefined : onOpenStatusEditor}
        />
      )}
    </AnimatePresence>
  )

  return (
    <AnimatePresence>
      {open && isDropdown && dropdownStyle ? (
        <motion.div
          key="customize-view-dropdown"
          ref={panelRef}
          className={panelSurfaceClass}
          style={dropdownStyle}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
        >
          {subViewTree}
        </motion.div>
      ) : open ? (
        <motion.div
          key="customize-view-slide"
          className={cn(
            'pointer-events-none fixed z-50 flex justify-end',
            stageBounds ? 'right-spaces-board-inset left-0 overflow-hidden' : 'inset-0',
          )}
          style={
            stageBounds
              ? {
                  top: stageBounds.top,
                  height: stageBounds.height,
                }
              : undefined
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={panelRef}
            className={panelSurfaceClass}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
          >
            {subViewTree}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
