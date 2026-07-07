import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'
import type { AdSet } from '../../types'
import { AD_SET_WORLDWIDE_COUNTRY_CODE } from './AdSetCountryTargetingField'
import type { AdSetTargetingLocation } from './AdSetLocationTargetingField'
import type { AdSetSettingsSaveField } from './useAdSetSettingsFieldSaves'
import type { LocationSearchResult } from './useAdSetSettingsLocationSearch'

interface UseAdSetSettingsGeoTargetingParams {
  targeting: Record<string, unknown>
  setData: Dispatch<SetStateAction<AdSet | null>>
  saveField: AdSetSettingsSaveField
  setLocationSearch: (value: string) => void
  setLocationResults: (results: LocationSearchResult[]) => void
  setLocationDropdownOpen: (open: boolean) => void
}

export function useAdSetSettingsGeoTargeting({
  targeting,
  setData,
  saveField,
  setLocationSearch,
  setLocationResults,
  setLocationDropdownOpen,
}: UseAdSetSettingsGeoTargetingParams) {
  const activeCountries = useMemo(() => {
    const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
    return new Set((geo.countries ?? []) as string[])
  }, [targeting])

  const activeLocations = useMemo(() => {
    const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
    return (geo.cities ?? []) as AdSetTargetingLocation[]
  }, [targeting])

  const handleToggleCountry = useCallback(
    (code: string) => {
      const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
      const current = new Set((geo.countries ?? []) as string[])

      if (code === AD_SET_WORLDWIDE_COUNTRY_CODE) {
        if (current.has(AD_SET_WORLDWIDE_COUNTRY_CODE)) {
          current.delete(AD_SET_WORLDWIDE_COUNTRY_CODE)
        } else {
          current.clear()
          current.add(AD_SET_WORLDWIDE_COUNTRY_CODE)
        }
      } else {
        current.delete(AD_SET_WORLDWIDE_COUNTRY_CODE)
        if (current.has(code)) current.delete(code)
        else current.add(code)
      }

      const newTargeting = {
        ...targeting,
        geo_locations: { ...geo, countries: Array.from(current) },
      }
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
      void saveField('targeting', newTargeting, 'targeting_countries')
    },
    [saveField, setData, targeting],
  )

  const handleAddLocation = useCallback(
    (loc: LocationSearchResult) => {
      const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
      const current = (geo.cities ?? []) as AdSetTargetingLocation[]
      if (current.some((c) => c.key === loc.key)) return

      const newCity: AdSetTargetingLocation = {
        key: loc.key,
        name: loc.name,
        radius: 25,
        distance_unit: 'mile',
        region: loc.region,
        country_name: loc.country_name,
      }
      const newTargeting = {
        ...targeting,
        geo_locations: { ...geo, cities: [...current, newCity] },
      }
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
      void saveField('targeting', newTargeting, 'targeting_locations')
      setLocationSearch('')
      setLocationResults([])
      setLocationDropdownOpen(false)
    },
    [
      saveField,
      setData,
      setLocationDropdownOpen,
      setLocationResults,
      setLocationSearch,
      targeting,
    ],
  )

  const handleRemoveLocation = useCallback(
    (key: string) => {
      const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
      const current = ((geo.cities ?? []) as AdSetTargetingLocation[]).filter(
        (location) => location.key !== key,
      )
      const newTargeting = { ...targeting, geo_locations: { ...geo, cities: current } }
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
      void saveField('targeting', newTargeting, 'targeting_locations')
    },
    [saveField, setData, targeting],
  )

  const handleRadiusChange = useCallback(
    (key: string, radius: number) => {
      const geo = (targeting.geo_locations ?? {}) as Record<string, unknown>
      const current = ((geo.cities ?? []) as AdSetTargetingLocation[]).map((location) =>
        location.key === key ? { ...location, radius } : location,
      )
      const newTargeting = { ...targeting, geo_locations: { ...geo, cities: current } }
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
    },
    [setData, targeting],
  )

  const handleRadiusSave = useCallback(
    (_key: string) => {
      void saveField('targeting', targeting, 'targeting_locations')
    },
    [saveField, targeting],
  )

  return {
    activeCountries,
    activeLocations,
    handleToggleCountry,
    handleAddLocation,
    handleRemoveLocation,
    handleRadiusChange,
    handleRadiusSave,
  }
}
