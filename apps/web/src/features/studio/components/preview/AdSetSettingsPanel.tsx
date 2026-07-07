'use client'

import {
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { AdSet } from '../../types'
import { AD_SET_TOP_COUNTRY_VALUES } from './AdSetCountryTargetingField'
import { AdSetSettingsPanelBody } from './AdSetSettingsPanelBody'
import { AdSetSettingsHeaderControls } from './AdSetSettingsHeaderControls'
import { AdSetSettingsPublishModals } from './AdSetSettingsPublishModals'
import { useAdSetSettingsCampaignContext } from './useAdSetSettingsCampaignContext'
import { useAdSetSettingsFieldSaves } from './useAdSetSettingsFieldSaves'
import { useAdSetSettingsCountrySearch } from './useAdSetSettingsCountrySearch'
import { useAdSetSettingsGeoTargeting } from './useAdSetSettingsGeoTargeting'
import { useAdSetSettingsInterestSearch } from './useAdSetSettingsInterestSearch'
import { useAdSetSettingsLifecycle } from './useAdSetSettingsLifecycle'
import { useAdSetSettingsLocationSearch } from './useAdSetSettingsLocationSearch'
import { useAdSetSettingsPlacements } from './useAdSetSettingsPlacements'
import { useAdSetSettingsPublishControls } from './useAdSetSettingsPublishControls'
import { useAdSetSettingsTargetingControls } from './useAdSetSettingsTargetingControls'

const SPACES_INPUT_CLS =
  'border-border focus:border-primary h-spacing-9 px-spacing-3 body-3 text-foreground rounded-spacing-2 bg-background w-full border outline-none focus:ring-ring focus-visible:ring-ring ring-0'

const SPACES_INPUT_NARROW_CLS =
  'border-border focus:border-primary h-spacing-9 px-spacing-2 body-3 text-foreground rounded-spacing-2 bg-background w-16 border text-center outline-none focus:ring-ring focus-visible:ring-ring ring-0'

const SPACES_INPUT_NARROW_20_CLS =
  'border-border focus:border-primary h-spacing-9 px-spacing-2 body-3 text-foreground rounded-spacing-2 bg-background w-20 border text-center outline-none focus:ring-ring focus-visible:ring-ring ring-0'

interface AdSetSettingsPanelProps {
  adSetId: string
  onUpdated?: (s: AdSet) => void
  /** Fired on optimistic local edits so parent lists stay in sync. */
  onAdSetChange?: (s: AdSet) => void
  headerTrailing?: ReactNode
  appearance?: 'studio' | 'spaces'
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function AdSetSettingsPanel({
  adSetId,
  onUpdated,
  onAdSetChange,
  headerTrailing,
  appearance = 'studio',
}: AdSetSettingsPanelProps) {
  const isSpaces = appearance === 'spaces'
  const inputCls = isSpaces ? SPACES_INPUT_CLS : 'input-glass body-3 w-full'
  const inputClsNarrow = isSpaces
    ? SPACES_INPUT_NARROW_CLS
    : 'input-glass body-3 w-16 py-1 text-center'
  const inputClsNarrow20 = isSpaces
    ? SPACES_INPUT_NARROW_20_CLS
    : 'input-glass body-3 w-20 py-1 text-center'
  const controlAppearance = isSpaces ? ('spaces' as const) : ('studio' as const)
  const [data, setData] = useState<AdSet | null>(null)

  const [simpleMode, setSimpleMode] = useState(true)
  const isPublished = !!data?.meta_adset_id
  const isPostLaunchLocked = isPublished
  const {
    reviewModalOpen,
    publishModalOpen,
    openReviewModal,
    closeReviewModal,
    continueToPublish,
    closePublishModal,
    handlePublished,
  } = useAdSetSettingsPublishControls({
    adSetId,
    adSet: data,
    setAdSet: setData,
    onUpdated,
  })
  const {
    fieldStates,
    dailyBudgetText,
    lifetimeBudgetText,
    syncBudgetText,
    saveField,
    handleTextChange,
    handleSelectChange,
    handleBudgetChange,
    scheduleDebouncedSave,
  } = useAdSetSettingsFieldSaves({
    adSetId,
    setData,
    onUpdated,
    onAdSetChange,
  })
  const {
    moreCountriesOpen,
    setMoreCountriesOpen,
    moreCountriesRef,
    countriesInputRef,
    countriesPos,
    countrySearch,
    countryResults,
    countrySearchLoading,
    handleCountrySearch,
  } = useAdSetSettingsCountrySearch({ excludedCountryCodes: AD_SET_TOP_COUNTRY_VALUES })
  const {
    scheduleType,
    campaignBudgetType,
    adAccountId,
    metaAudiences,
    audiencesLoading,
    loadCampaignContext,
  } = useAdSetSettingsCampaignContext()
  const {
    loading,
    error,
    refreshError,
    settingMetaStatus,
    deliveryEstimate,
    estimateLoading,
    estimateError,
    handleSetMetaStatus,
    handleFetchEstimate,
  } = useAdSetSettingsLifecycle({
    adSetId,
    adSet: data,
    setAdSet: setData,
    syncBudgetText,
    loadCampaignContext,
    onUpdated,
  })
  const {
    locationSearch,
    locationResults,
    locationSearchLoading,
    locationInputRef,
    locationDropdownRef,
    locationDropdownOpen,
    setLocationDropdownOpen,
    locationPos,
    handleLocationSearch,
    setLocationSearch,
    setLocationResults,
  } = useAdSetSettingsLocationSearch()
  const {
    interestSearch,
    interestResults,
    interestSearchLoading,
    interestInputRef,
    interestDropdownRef,
    interestDropdownOpen,
    setInterestDropdownOpen,
    interestPos,
    handleInterestSearch,
    setInterestSearch,
    setInterestResults,
  } = useAdSetSettingsInterestSearch()
  const targeting = useMemo(
    () => (data?.targeting ?? {}) as Record<string, unknown>,
    [data?.targeting],
  )
  const {
    includeAudienceSearch,
    setIncludeAudienceSearch,
    excludeAudienceSearch,
    setExcludeAudienceSearch,
    includeExpanded,
    setIncludeExpanded,
    excludeExpanded,
    setExcludeExpanded,
    handleTargetingChange,
    handleAgeTargetingChange,
    handleAdvantageAudienceChange,
  } = useAdSetSettingsTargetingControls({
    targeting,
    setData,
    saveField,
    scheduleDebouncedSave,
  })
  const {
    activeCountries,
    activeLocations,
    handleToggleCountry,
    handleAddLocation,
    handleRemoveLocation,
    handleRadiusChange,
    handleRadiusSave,
  } = useAdSetSettingsGeoTargeting({
    targeting,
    setData,
    saveField,
    setLocationSearch,
    setLocationResults,
    setLocationDropdownOpen,
  })
  const {
    expandedGroups,
    setExpandedGroups,
    isPlacementActive,
    handleManualPlacementsChange,
    handleToggleGroup,
    handleTogglePlacement,
  } = useAdSetSettingsPlacements({
    targeting,
    setData,
    saveField,
  })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading ad set..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="text-muted-foreground/40 h-8 w-8" />
        <p className="body-3 text-muted-foreground">{error ?? 'Not found'}</p>
      </div>
    )
  }

  const advantagePlusOn =
    (targeting.targeting_automation as Record<string, unknown> | undefined)?.advantage_audience ===
    1

  return (
    <div
      className={
        isSpaces
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
          : 'bg-card flex h-full flex-col overflow-hidden'
      }
    >
      {!isSpaces ? (
        <div className="border-border space-y-2 border-b px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="body-2 text-foreground truncate font-semibold">AD SET SETTINGS</p>
            <AdSetSettingsHeaderControls
              isPublished={isPublished}
              metaEffectiveStatus={data.meta_effective_status}
              settingMetaStatus={settingMetaStatus}
              headerTrailing={headerTrailing}
              onOpenPublish={openReviewModal}
              onSetMetaStatus={handleSetMetaStatus}
            />
          </div>
          {refreshError && <span className="typo-caption text-destructive">{refreshError}</span>}
        </div>
      ) : null}

      <AdSetSettingsPanelBody
        appearance={appearance}
        isSpaces={isSpaces}
        simpleMode={simpleMode}
        onToggleSimpleMode={() => setSimpleMode((prev) => !prev)}
        inputClassName={inputCls}
        narrowInputClassName={inputClsNarrow}
        narrow20InputClassName={inputClsNarrow20}
        controlAppearance={controlAppearance}
        data={data}
        fieldStates={fieldStates}
        campaignBudgetType={campaignBudgetType}
        scheduleType={scheduleType}
        dailyBudgetText={dailyBudgetText}
        lifetimeBudgetText={lifetimeBudgetText}
        onTextChange={handleTextChange}
        onBudgetChange={handleBudgetChange}
        activeCountries={activeCountries}
        moreCountriesOpen={moreCountriesOpen}
        setMoreCountriesOpen={setMoreCountriesOpen}
        moreCountriesRef={moreCountriesRef}
        countriesInputRef={countriesInputRef}
        countriesPos={countriesPos}
        countrySearch={countrySearch}
        countryResults={countryResults}
        countrySearchLoading={countrySearchLoading}
        onCountrySearch={handleCountrySearch}
        onToggleCountry={handleToggleCountry}
        activeLocations={activeLocations}
        locationSearch={locationSearch}
        locationResults={locationResults}
        locationSearchLoading={locationSearchLoading}
        locationInputRef={locationInputRef}
        locationDropdownRef={locationDropdownRef}
        locationDropdownOpen={locationDropdownOpen}
        setLocationDropdownOpen={setLocationDropdownOpen}
        locationPos={locationPos}
        onLocationSearch={handleLocationSearch}
        onAddLocation={handleAddLocation}
        onRemoveLocation={handleRemoveLocation}
        onRadiusChange={handleRadiusChange}
        onRadiusSave={handleRadiusSave}
        isPostLaunchLocked={isPostLaunchLocked}
        onSelectChange={handleSelectChange}
        targeting={targeting}
        advantagePlusOn={advantagePlusOn}
        onAgeTargetingChange={handleAgeTargetingChange}
        onAdvantageAudienceChange={handleAdvantageAudienceChange}
        adAccountId={adAccountId}
        metaAudiences={metaAudiences}
        audiencesLoading={audiencesLoading}
        includeAudienceSearch={includeAudienceSearch}
        setIncludeAudienceSearch={setIncludeAudienceSearch}
        excludeAudienceSearch={excludeAudienceSearch}
        setExcludeAudienceSearch={setExcludeAudienceSearch}
        includeExpanded={includeExpanded}
        setIncludeExpanded={setIncludeExpanded}
        excludeExpanded={excludeExpanded}
        setExcludeExpanded={setExcludeExpanded}
        interestSearch={interestSearch}
        interestResults={interestResults}
        interestSearchLoading={interestSearchLoading}
        interestInputRef={interestInputRef}
        interestDropdownRef={interestDropdownRef}
        interestDropdownOpen={interestDropdownOpen}
        setInterestDropdownOpen={setInterestDropdownOpen}
        interestPos={interestPos}
        setInterestSearch={setInterestSearch}
        setInterestResults={setInterestResults}
        onInterestSearch={handleInterestSearch}
        onTargetingChange={handleTargetingChange}
        formatNumber={formatNumber}
        manualPlacements={!!targeting.manual_placements}
        expandedGroups={expandedGroups}
        setExpandedGroups={setExpandedGroups}
        isPlacementActive={isPlacementActive}
        onManualPlacementsChange={handleManualPlacementsChange}
        onToggleGroup={handleToggleGroup}
        onTogglePlacement={handleTogglePlacement}
        deliveryEstimate={deliveryEstimate}
        estimateLoading={estimateLoading}
        estimateError={estimateError}
        onFetchEstimate={() => void handleFetchEstimate()}
      />
      {!isSpaces ? (
        <AdSetSettingsPublishModals
          data={data}
          reviewModalOpen={reviewModalOpen}
          publishModalOpen={publishModalOpen}
          onReviewModalClose={closeReviewModal}
          onContinueToPublish={continueToPublish}
          onPublishModalClose={closePublishModal}
          onPublished={handlePublished}
        />
      ) : null}
    </div>
  )
}
