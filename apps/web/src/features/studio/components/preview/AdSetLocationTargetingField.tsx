import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2 } from 'lucide-react'
import { SettingsField } from './ad-set-settings-panel-primitives'
import type { FieldState } from './useAdSetSettingsFieldSaves'
import type { LocationSearchResult } from './useAdSetSettingsLocationSearch'

export type AdSetTargetingLocation = {
  key: string
  name?: string
  radius: number
  distance_unit: string
  region?: string
  country_name?: string
}

interface AdSetLocationTargetingFieldProps {
  appearance: 'studio' | 'spaces'
  fieldState?: FieldState
  inputClassName: string
  narrowInputClassName: string
  activeLocations: AdSetTargetingLocation[]
  locationSearch: string
  locationResults: LocationSearchResult[]
  locationSearchLoading: boolean
  locationInputRef: RefObject<HTMLInputElement | null>
  locationDropdownRef: RefObject<HTMLDivElement | null>
  locationDropdownOpen: boolean
  setLocationDropdownOpen: (open: boolean) => void
  locationPos: { top: number; left: number; width: number }
  onLocationSearch: (query: string) => void
  onAddLocation: (location: LocationSearchResult) => void
  onRemoveLocation: (key: string) => void
  onRadiusChange: (key: string, radius: number) => void
  onRadiusSave: (key: string) => void
}

function getLocationTypeLabel(type: string) {
  if (type === 'city') return 'City'
  if (type === 'region') return 'Region'
  if (type === 'zip') return 'Zip'
  if (type === 'geo_market') return 'DMA'
  return type
}

export function AdSetLocationTargetingField({
  appearance,
  fieldState,
  inputClassName,
  narrowInputClassName,
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
}: AdSetLocationTargetingFieldProps) {
  return (
    <SettingsField appearance={appearance} label="Locations" fieldState={fieldState}>
      <div className="space-y-3">
        <p className="typo-caption text-muted-foreground">
          Target specific cities, regions, or zip codes with radius
        </p>
        {activeLocations.length > 0 && (
          <div className="space-y-2">
            {activeLocations.map((location) => (
              <div
                key={location.key}
                className="bg-secondary flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="body-3 text-foreground block truncate font-medium">
                    {location.name ?? location.key}
                  </span>
                  {(location.region || location.country_name) && (
                    <span className="typo-caption text-muted-foreground">
                      {[location.region, location.country_name].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={location.radius}
                    onChange={(event) => {
                      const value = parseInt(event.target.value, 10)
                      if (!isNaN(value) && value > 0) onRadiusChange(location.key, value)
                    }}
                    onBlur={() => onRadiusSave(location.key)}
                    className={narrowInputClassName}
                  />
                  <span className="typo-caption text-muted-foreground">mi</span>
                  <button
                    type="button"
                    onClick={() => onRemoveLocation(location.key)}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div>
          <input
            ref={locationInputRef}
            type="text"
            value={locationSearch}
            onChange={(event) => {
              onLocationSearch(event.target.value)
              if (!locationDropdownOpen) setLocationDropdownOpen(true)
            }}
            onFocus={() => {
              if (locationSearch.trim()) setLocationDropdownOpen(true)
            }}
            className={inputClassName}
            placeholder="Search cities, regions, zip codes..."
          />
          {locationDropdownOpen &&
            (locationResults.length > 0 || locationSearchLoading) &&
            createPortal(
              <div
                ref={locationDropdownRef}
                className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed max-h-60 overflow-y-auto border shadow-lg"
                style={{
                  top: locationPos.top,
                  left: locationPos.left,
                  width: locationPos.width,
                }}
              >
                {locationSearchLoading ? (
                  <div className="px-spacing-2 py-spacing-2 text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="body-3">Searching...</span>
                  </div>
                ) : (
                  <div className="space-y-spacing-1">
                    {locationResults.map((result) => {
                      const alreadyAdded = activeLocations.some(
                        (location) => location.key === result.key,
                      )
                      const typeLabel = getLocationTypeLabel(result.type)
                      return (
                        <button
                          key={result.key}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => onAddLocation(result)}
                          className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle flex w-full items-center justify-between text-left disabled:opacity-40"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-foreground font-medium">{result.name}</span>
                            <span className="typo-caption text-muted-foreground ml-2">
                              {[typeLabel, result.region, result.country_name]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </div>
                          {alreadyAdded && <Check className="icon-sm text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>
    </SettingsField>
  )
}
