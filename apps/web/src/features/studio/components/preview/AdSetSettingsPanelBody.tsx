import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import {
  AdSetAgeAdvantageFields,
  AdSetOptimizationBillingFields,
} from './AdSetAdvancedTargetingFields'
import { AdSetAudienceTargetingField } from './AdSetAudienceTargetingField'
import { AdSetCountryTargetingField } from './AdSetCountryTargetingField'
import { AdSetDeliveryEstimateField } from './AdSetDeliveryEstimateField'
import { AdSetGeneralBudgetFields } from './AdSetGeneralBudgetFields'
import { AdSetLocationTargetingField } from './AdSetLocationTargetingField'
import { AdSetMetaSourceBanner } from './AdSetMetaSourceBanner'
import { AdSetPlacementsField } from './AdSetPlacementsField'
import { SettingsSection } from './ad-set-settings-panel-primitives'
import type { AdSetSettingsPanelBodyProps } from './ad-set-settings-panel-body.types'

export function AdSetSettingsPanelBody({
  appearance,
  isSpaces,
  simpleMode,
  onToggleSimpleMode,
  inputClassName,
  narrowInputClassName,
  narrow20InputClassName,
  controlAppearance,
  data,
  fieldStates,
  campaignBudgetType,
  scheduleType,
  dailyBudgetText,
  lifetimeBudgetText,
  onTextChange,
  onBudgetChange,
  activeCountries,
  moreCountriesOpen,
  setMoreCountriesOpen,
  moreCountriesRef,
  countriesInputRef,
  countriesPos,
  countrySearch,
  countryResults,
  countrySearchLoading,
  onCountrySearch,
  onToggleCountry,
  activeLocations,
  locationSearch,
  locationResults,
  locationSearchLoading,
  locationInputRef,
  locationDropdownRef,
  locationDropdownOpen,
  setLocationDropdownOpen,
  locationPos,
  onLocationSearch,
  onAddLocation,
  onRemoveLocation,
  onRadiusChange,
  onRadiusSave,
  isPostLaunchLocked,
  onSelectChange,
  targeting,
  advantagePlusOn,
  onAgeTargetingChange,
  onAdvantageAudienceChange,
  adAccountId,
  metaAudiences,
  audiencesLoading,
  includeAudienceSearch,
  setIncludeAudienceSearch,
  excludeAudienceSearch,
  setExcludeAudienceSearch,
  includeExpanded,
  setIncludeExpanded,
  excludeExpanded,
  setExcludeExpanded,
  interestSearch,
  interestResults,
  interestSearchLoading,
  interestInputRef,
  interestDropdownRef,
  interestDropdownOpen,
  setInterestDropdownOpen,
  interestPos,
  setInterestSearch,
  setInterestResults,
  onInterestSearch,
  onTargetingChange,
  formatNumber,
  manualPlacements,
  expandedGroups,
  setExpandedGroups,
  isPlacementActive,
  onManualPlacementsChange,
  onToggleGroup,
  onTogglePlacement,
  deliveryEstimate,
  estimateLoading,
  estimateError,
  onFetchEstimate,
}: AdSetSettingsPanelBodyProps) {
  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      {data.source === 'meta' && (
        <AdSetMetaSourceBanner appearance={appearance} metaAdSetId={data.meta_adset_id} />
      )}
      <div className={isSpaces ? 'space-y-spacing-4 p-spacing-4' : 'space-y-8 px-5 py-5'}>
        <AdSetGeneralBudgetFields
          appearance={appearance}
          data={data}
          fieldStates={fieldStates}
          inputClassName={inputClassName}
          campaignBudgetType={campaignBudgetType}
          scheduleType={scheduleType}
          dailyBudgetText={dailyBudgetText}
          lifetimeBudgetText={lifetimeBudgetText}
          onTextChange={onTextChange}
          onBudgetChange={onBudgetChange}
        />

        {simpleMode && (
          <SettingsSection appearance={appearance} title={isSpaces ? 'Targeting' : undefined}>
            <AdSetCountryTargetingField
              appearance={appearance}
              fieldState={fieldStates['targeting_countries']}
              inputClassName={inputClassName}
              activeCountries={activeCountries}
              showCountrySearch={false}
              moreCountriesOpen={moreCountriesOpen}
              setMoreCountriesOpen={setMoreCountriesOpen}
              moreCountriesRef={moreCountriesRef}
              countriesInputRef={countriesInputRef}
              countriesPos={countriesPos}
              countrySearch={countrySearch}
              countryResults={countryResults}
              countrySearchLoading={countrySearchLoading}
              onCountrySearch={onCountrySearch}
              onToggleCountry={onToggleCountry}
            />
            <AdSetLocationTargetingField
              appearance={appearance}
              fieldState={fieldStates['targeting_locations']}
              inputClassName={inputClassName}
              narrowInputClassName={narrowInputClassName}
              activeLocations={activeLocations}
              locationSearch={locationSearch}
              locationResults={locationResults}
              locationSearchLoading={locationSearchLoading}
              locationInputRef={locationInputRef}
              locationDropdownRef={locationDropdownRef}
              locationDropdownOpen={locationDropdownOpen}
              setLocationDropdownOpen={setLocationDropdownOpen}
              locationPos={locationPos}
              onLocationSearch={onLocationSearch}
              onAddLocation={onAddLocation}
              onRemoveLocation={onRemoveLocation}
              onRadiusChange={onRadiusChange}
              onRadiusSave={onRadiusSave}
            />
          </SettingsSection>
        )}

        {isSpaces ? (
          <AdvancedOptionsToggle open={!simpleMode} onToggle={onToggleSimpleMode} />
        ) : null}

        <AnimatePresence initial={false}>
          {!simpleMode ? (
            <motion.div
              key="advanced-ad-set-fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <SettingsSection appearance={appearance} title={isSpaces ? 'Advanced' : undefined}>
                <AdSetOptimizationBillingFields
                  appearance={appearance}
                  data={data}
                  fieldStates={fieldStates}
                  controlAppearance={controlAppearance}
                  isPostLaunchLocked={isPostLaunchLocked}
                  onSelectChange={onSelectChange}
                />

                <div className="space-y-5">
                  <AdSetCountryTargetingField
                    appearance={appearance}
                    fieldState={fieldStates['targeting_countries']}
                    inputClassName={inputClassName}
                    activeCountries={activeCountries}
                    showCountrySearch
                    moreCountriesOpen={moreCountriesOpen}
                    setMoreCountriesOpen={setMoreCountriesOpen}
                    moreCountriesRef={moreCountriesRef}
                    countriesInputRef={countriesInputRef}
                    countriesPos={countriesPos}
                    countrySearch={countrySearch}
                    countryResults={countryResults}
                    countrySearchLoading={countrySearchLoading}
                    onCountrySearch={onCountrySearch}
                    onToggleCountry={onToggleCountry}
                  />

                  <AdSetLocationTargetingField
                    appearance={appearance}
                    fieldState={fieldStates['targeting_locations']}
                    inputClassName={inputClassName}
                    narrowInputClassName={narrowInputClassName}
                    activeLocations={activeLocations}
                    locationSearch={locationSearch}
                    locationResults={locationResults}
                    locationSearchLoading={locationSearchLoading}
                    locationInputRef={locationInputRef}
                    locationDropdownRef={locationDropdownRef}
                    locationDropdownOpen={locationDropdownOpen}
                    setLocationDropdownOpen={setLocationDropdownOpen}
                    locationPos={locationPos}
                    onLocationSearch={onLocationSearch}
                    onAddLocation={onAddLocation}
                    onRemoveLocation={onRemoveLocation}
                    onRadiusChange={onRadiusChange}
                    onRadiusSave={onRadiusSave}
                  />

                  <AdSetAgeAdvantageFields
                    appearance={appearance}
                    targeting={targeting}
                    advantagePlusOn={advantagePlusOn}
                    fieldStates={fieldStates}
                    narrow20InputClassName={narrow20InputClassName}
                    onAgeTargetingChange={onAgeTargetingChange}
                    onAdvantageAudienceChange={onAdvantageAudienceChange}
                  />

                  <AdSetAudienceTargetingField
                    appearance={appearance}
                    advantagePlusOn={advantagePlusOn}
                    targeting={targeting}
                    fieldStates={fieldStates}
                    inputClassName={inputClassName}
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
                    onInterestSearch={onInterestSearch}
                    onTargetingChange={onTargetingChange}
                    formatNumber={formatNumber}
                  />
                </div>

                <AdSetPlacementsField
                  fieldState={fieldStates['targeting_placements']}
                  manualPlacements={manualPlacements}
                  expandedGroups={expandedGroups}
                  setExpandedGroups={setExpandedGroups}
                  isPlacementActive={isPlacementActive}
                  onManualPlacementsChange={onManualPlacementsChange}
                  onToggleGroup={onToggleGroup}
                  onTogglePlacement={onTogglePlacement}
                />

                <AdSetDeliveryEstimateField
                  deliveryEstimate={deliveryEstimate}
                  estimateLoading={estimateLoading}
                  estimateError={estimateError}
                  onFetchEstimate={onFetchEstimate}
                  formatNumber={formatNumber}
                />
              </SettingsSection>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!isSpaces ? (
          <button
            type="button"
            onClick={onToggleSimpleMode}
            className="border-border bg-secondary/30 typo-caption hover:bg-secondary/50 flex items-center gap-2 rounded-full border px-4 py-2 font-medium transition-colors"
          >
            {simpleMode ? (
              <>
                See advanced options
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              '← Back to Simple Mode'
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function AdvancedOptionsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group/advanced-toggle gap-spacing-2 py-spacing-1 flex w-full items-center"
      aria-expanded={open}
    >
      <span className="body-3 text-muted-foreground group-hover/advanced-toggle:text-foreground flex shrink-0 items-center gap-1.5 font-medium transition-colors">
        {open ? (
          <>
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Simple mode
          </>
        ) : (
          <>
            See advanced options
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </>
        )}
      </span>
      <span className="border-border min-h-px min-w-0 flex-1 border-t" aria-hidden />
    </button>
  )
}
