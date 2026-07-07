import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2 } from 'lucide-react'
import { SettingsField } from './ad-set-settings-panel-primitives'
import type { FieldState } from './useAdSetSettingsFieldSaves'

export const AD_SET_WORLDWIDE_COUNTRY_CODE = 'WW'

const AD_SET_TOP_COUNTRIES = [
  { value: AD_SET_WORLDWIDE_COUNTRY_CODE, label: 'Worldwide' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
]

export const AD_SET_TOP_COUNTRY_VALUES = AD_SET_TOP_COUNTRIES.map((country) => country.value)

type CountrySearchResult = {
  key: string
  name: string
}

interface AdSetCountryTargetingFieldProps {
  appearance: 'studio' | 'spaces'
  fieldState?: FieldState
  inputClassName: string
  activeCountries: Set<string>
  showCountrySearch: boolean
  moreCountriesOpen: boolean
  setMoreCountriesOpen: (open: boolean) => void
  moreCountriesRef: RefObject<HTMLDivElement | null>
  countriesInputRef: RefObject<HTMLInputElement | null>
  countriesPos: { top: number; left: number; width: number }
  countrySearch: string
  countryResults: CountrySearchResult[]
  countrySearchLoading: boolean
  onCountrySearch: (query: string) => void
  onToggleCountry: (code: string) => void
}

export function AdSetCountryTargetingField({
  appearance,
  fieldState,
  inputClassName,
  activeCountries,
  showCountrySearch,
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
}: AdSetCountryTargetingFieldProps) {
  return (
    <SettingsField appearance={appearance} label="Countries" fieldState={fieldState}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {AD_SET_TOP_COUNTRIES.map((country) => {
            const isActive = activeCountries.has(country.value)
            return (
              <button
                key={country.value}
                type="button"
                onClick={() => onToggleCountry(country.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'chip-glass-blue'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {country.label}
              </button>
            )
          })}
        </div>
        {showCountrySearch &&
          !activeCountries.has(AD_SET_WORLDWIDE_COUNTRY_CODE) &&
          activeCountries.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(activeCountries)
                .filter((code) => !AD_SET_TOP_COUNTRIES.some((country) => country.value === code))
                .map((code) => (
                  <span
                    key={code}
                    className="chip-glass-blue flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                  >
                    {code}
                    <button
                      type="button"
                      onClick={() => onToggleCountry(code)}
                      className="ml-0.5 opacity-60 hover:opacity-100"
                    >
                      &times;
                    </button>
                  </span>
                ))}
            </div>
          )}
        {showCountrySearch && !activeCountries.has(AD_SET_WORLDWIDE_COUNTRY_CODE) && (
          <div ref={moreCountriesRef}>
            <input
              ref={countriesInputRef}
              type="text"
              value={countrySearch}
              onChange={(event) => {
                onCountrySearch(event.target.value)
                if (!moreCountriesOpen) setMoreCountriesOpen(true)
              }}
              onFocus={() => setMoreCountriesOpen(true)}
              className={inputClassName}
              placeholder="Search countries..."
            />
            {moreCountriesOpen &&
              (countryResults.length > 0 || countrySearchLoading) &&
              createPortal(
                <div
                  ref={moreCountriesRef}
                  className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed max-h-60 overflow-y-auto border shadow-lg"
                  style={{
                    top: countriesPos.top,
                    left: countriesPos.left,
                    width: countriesPos.width,
                  }}
                >
                  {countrySearchLoading ? (
                    <div className="px-spacing-2 py-spacing-2 text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="body-3">Searching...</span>
                    </div>
                  ) : (
                    <div className="space-y-spacing-1">
                      {countryResults.map((country) => {
                        const isActive = activeCountries.has(country.key)
                        return (
                          <button
                            key={country.key}
                            type="button"
                            onClick={() => onToggleCountry(country.key)}
                            className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle flex w-full items-center justify-between text-left"
                          >
                            <div>
                              <span className="text-muted-foreground font-medium">
                                {country.name}
                              </span>
                              <span className="typo-caption text-muted-foreground/60 ml-2">
                                {country.key}
                              </span>
                            </div>
                            {isActive && <Check className="icon-sm text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>,
                document.body,
              )}
          </div>
        )}
      </div>
    </SettingsField>
  )
}
