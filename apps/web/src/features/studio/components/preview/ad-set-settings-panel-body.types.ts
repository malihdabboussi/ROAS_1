import type { ComponentProps } from 'react'
import {
  AdSetAgeAdvantageFields,
  AdSetOptimizationBillingFields,
} from './AdSetAdvancedTargetingFields'
import { AdSetAudienceTargetingField } from './AdSetAudienceTargetingField'
import { AdSetCountryTargetingField } from './AdSetCountryTargetingField'
import { AdSetDeliveryEstimateField } from './AdSetDeliveryEstimateField'
import { AdSetGeneralBudgetFields } from './AdSetGeneralBudgetFields'
import { AdSetLocationTargetingField } from './AdSetLocationTargetingField'
import { AdSetPlacementsField } from './AdSetPlacementsField'

type GeneralBudgetProps = ComponentProps<typeof AdSetGeneralBudgetFields>
type CountryProps = ComponentProps<typeof AdSetCountryTargetingField>
type LocationProps = ComponentProps<typeof AdSetLocationTargetingField>
type AgeAdvantageProps = ComponentProps<typeof AdSetAgeAdvantageFields>
type AudienceProps = ComponentProps<typeof AdSetAudienceTargetingField>
type PlacementsProps = ComponentProps<typeof AdSetPlacementsField>
type DeliveryEstimateProps = ComponentProps<typeof AdSetDeliveryEstimateField>
type OptimizationBillingProps = ComponentProps<typeof AdSetOptimizationBillingFields>

export interface AdSetSettingsPanelBodyProps {
  appearance: 'studio' | 'spaces'
  isSpaces: boolean
  simpleMode: boolean
  onToggleSimpleMode: () => void
  inputClassName: string
  narrowInputClassName: string
  narrow20InputClassName: string
  controlAppearance: OptimizationBillingProps['controlAppearance']
  data: GeneralBudgetProps['data']
  fieldStates: GeneralBudgetProps['fieldStates']
  campaignBudgetType: GeneralBudgetProps['campaignBudgetType']
  scheduleType: GeneralBudgetProps['scheduleType']
  dailyBudgetText: GeneralBudgetProps['dailyBudgetText']
  lifetimeBudgetText: GeneralBudgetProps['lifetimeBudgetText']
  onTextChange: GeneralBudgetProps['onTextChange']
  onBudgetChange: GeneralBudgetProps['onBudgetChange']
  activeCountries: CountryProps['activeCountries']
  moreCountriesOpen: CountryProps['moreCountriesOpen']
  setMoreCountriesOpen: CountryProps['setMoreCountriesOpen']
  moreCountriesRef: CountryProps['moreCountriesRef']
  countriesInputRef: CountryProps['countriesInputRef']
  countriesPos: CountryProps['countriesPos']
  countrySearch: CountryProps['countrySearch']
  countryResults: CountryProps['countryResults']
  countrySearchLoading: CountryProps['countrySearchLoading']
  onCountrySearch: CountryProps['onCountrySearch']
  onToggleCountry: CountryProps['onToggleCountry']
  activeLocations: LocationProps['activeLocations']
  locationSearch: LocationProps['locationSearch']
  locationResults: LocationProps['locationResults']
  locationSearchLoading: LocationProps['locationSearchLoading']
  locationInputRef: LocationProps['locationInputRef']
  locationDropdownRef: LocationProps['locationDropdownRef']
  locationDropdownOpen: LocationProps['locationDropdownOpen']
  setLocationDropdownOpen: LocationProps['setLocationDropdownOpen']
  locationPos: LocationProps['locationPos']
  onLocationSearch: LocationProps['onLocationSearch']
  onAddLocation: LocationProps['onAddLocation']
  onRemoveLocation: LocationProps['onRemoveLocation']
  onRadiusChange: LocationProps['onRadiusChange']
  onRadiusSave: LocationProps['onRadiusSave']
  isPostLaunchLocked: boolean
  onSelectChange: OptimizationBillingProps['onSelectChange']
  targeting: AgeAdvantageProps['targeting']
  advantagePlusOn: AgeAdvantageProps['advantagePlusOn']
  onAgeTargetingChange: AgeAdvantageProps['onAgeTargetingChange']
  onAdvantageAudienceChange: AgeAdvantageProps['onAdvantageAudienceChange']
  adAccountId: AudienceProps['adAccountId']
  metaAudiences: AudienceProps['metaAudiences']
  audiencesLoading: AudienceProps['audiencesLoading']
  includeAudienceSearch: AudienceProps['includeAudienceSearch']
  setIncludeAudienceSearch: AudienceProps['setIncludeAudienceSearch']
  excludeAudienceSearch: AudienceProps['excludeAudienceSearch']
  setExcludeAudienceSearch: AudienceProps['setExcludeAudienceSearch']
  includeExpanded: AudienceProps['includeExpanded']
  setIncludeExpanded: AudienceProps['setIncludeExpanded']
  excludeExpanded: AudienceProps['excludeExpanded']
  setExcludeExpanded: AudienceProps['setExcludeExpanded']
  interestSearch: AudienceProps['interestSearch']
  interestResults: AudienceProps['interestResults']
  interestSearchLoading: AudienceProps['interestSearchLoading']
  interestInputRef: AudienceProps['interestInputRef']
  interestDropdownRef: AudienceProps['interestDropdownRef']
  interestDropdownOpen: AudienceProps['interestDropdownOpen']
  setInterestDropdownOpen: AudienceProps['setInterestDropdownOpen']
  interestPos: AudienceProps['interestPos']
  setInterestSearch: AudienceProps['setInterestSearch']
  setInterestResults: AudienceProps['setInterestResults']
  onInterestSearch: AudienceProps['onInterestSearch']
  onTargetingChange: AudienceProps['onTargetingChange']
  formatNumber: AudienceProps['formatNumber']
  manualPlacements: PlacementsProps['manualPlacements']
  expandedGroups: PlacementsProps['expandedGroups']
  setExpandedGroups: PlacementsProps['setExpandedGroups']
  isPlacementActive: PlacementsProps['isPlacementActive']
  onManualPlacementsChange: PlacementsProps['onManualPlacementsChange']
  onToggleGroup: PlacementsProps['onToggleGroup']
  onTogglePlacement: PlacementsProps['onTogglePlacement']
  deliveryEstimate: DeliveryEstimateProps['deliveryEstimate']
  estimateLoading: DeliveryEstimateProps['estimateLoading']
  estimateError: DeliveryEstimateProps['estimateError']
  onFetchEstimate: DeliveryEstimateProps['onFetchEstimate']
}
